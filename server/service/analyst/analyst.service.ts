// ─────────────────────────────────────────────────────────────
// ANALYST SERVICE — Orchestrator + toàn bộ pipeline AI Analyst.
//
// File này gộp 5 module (đã tách trước đây) vào 1 chỗ:
//   • TA CALCULATOR      — tính EMA/RSI/MACD/Bollinger từ kline thật
//   • NEWS AGGREGATOR    — lấy + chấm sentiment tin tức 7 ngày
//   • PREDICTION ENGINE  — rule-based scoring → direction + confidence
//   • PROMPT BUILDER     — dựng system + user prompt cho LLM
//   • LLM NARRATOR       — gọi Groq, parse JSON narrative
//
// Triết lý cốt lõi: server tính SỐ chính xác (TA + prediction),
// LLM chỉ viết VĂN tiếng Việt — không nhờ LLM tính toán.
//
// Luồng 1 request:
//   1. Gather context (coin, TA, news, wallet) — PARALLEL
//   2. predict → direction + confidence + reasons
//   3. composePlan → entry/SL/TP/positionSize/rrRatio
//   4. buildPrompt → context cho LLM
//   5. generateNarrative → AI narrative (Groq Llama)
//   6. Save vào ai_recommendations (graceful nếu table thiếu)
//   7. Cache 5 phút (skip LLM cho request giống nhau)
//   8. Return AnalystOutput
// ─────────────────────────────────────────────────────────────
import { EMA, RSI, MACD, BollingerBands } from 'technicalindicators'
import { generateText } from 'ai'
import { query, queryOne } from '../../utils/db'
import { coinService } from '../coin/coin.service'
import { klineService } from '../kline/kline.service'
import { getGroqAnalyst, ANALYST_MODEL, ANALYST_MAX_TOKENS } from '../../utils/groq-analyst'
import type {
  AnalystInput, AnalystOutput, TradePlan, Prediction, Direction,
  TaResult, Signal, Horizon, NewsBrief, Sentiment, AiNarrative
} from '../../dtos/analyst'
import { HORIZON_PCT } from '../../dtos/analyst'

// ─── Cache (5 phút, chỉ skip LLM cho request giống nhau) ─────
interface CacheEntry { data: AnalystOutput, ts: number }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60_000

// Báo cáo dùng ví riêng của user + số tiền / đòn bẩy / khẩu vị rủi ro ⇒ khoá phải gồm userId và TOÀN BỘ input,
// nếu không user B nhận báo cáo (và kế hoạch vào lệnh) sinh cho user A.
function cacheKey(userId: number, input: AnalystInput): string {
  return `${userId}:${JSON.stringify(input)}`
}

function pruneCache(now: number): void {
  for (const [key, entry] of cache) {
    if (now - entry.ts >= CACHE_TTL) cache.delete(key)
  }
}

/**
 * Main entry: phân tích coin + sinh báo cáo AI.
 * @param persist  true → lưu vào ai_recommendations (chỉ khi user chủ động bấm "Lưu báo cáo").
 */
export async function analyze(input: AnalystInput, userId: number, persist = false): Promise<AnalystOutput> {
  const startTs = Date.now()
  const key = cacheKey(userId, input)
  const hit = cache.get(key)
  let output: AnalystOutput

  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    // Cache hit → tái dùng analysis content (không gọi lại LLM). Việc lưu DB
    // có chống trùng riêng trong saveRecommendation() để không đẻ row giống hệt.
    output = { ...hit.data, meta: { ...hit.data.meta, cached: true, elapsedMs: Date.now() - startTs } }
  } else {
    // ── Cold path: full pipeline ──────────────────────────
    const [coin, ta, news, wallet] = await Promise.all([
      coinService.getBySymbol(input.symbol),
      computeIndicators(input.symbol, input.horizon),
      fetchCoinNews(input.symbol, 7),
      getWalletContext(userId).catch(() => null)
    ])

    if (!coin) {
      throw createError({ statusCode: 404, statusMessage: `Không tìm thấy coin ${input.symbol}` })
    }

    const prediction = predict(ta, news, input.horizon)
    const plan = composePlan(coin.price, prediction, input)
    const { system, prompt } = buildPrompt({
      input,
      coin: {
        name: coin.name, symbol: coin.symbol,
        price: coin.price, change24h: coin.changePercent24h,
        marketCap: coin.marketCap
      },
      ta, prediction, news, wallet, plan
    })
    const ai = await generateNarrative({ system, prompt })

    output = {
      recommendationId: 0,
      coin: {
        symbol: coin.symbol,
        name: coin.name,
        price: coin.price,
        change24h: coin.changePercent24h,
        marketCap: coin.marketCap,
        icon: coin.icon
      },
      ta, prediction, news, plan, ai,
      meta: {
        generatedAt: new Date().toISOString(),
        model: ANALYST_MODEL,
        elapsedMs: Date.now() - startTs,
        cached: false
      }
    }

    pruneCache(Date.now())
    cache.set(key, { data: output, ts: Date.now() })
  }

  // ── Chỉ lưu khi persist=true (user bấm "Lưu báo cáo" → /save) ──
  // Trả bản sao: KHÔNG ghi recommendationId vào object đang nằm trong cache.
  if (persist) {
    return { ...output, recommendationId: await saveRecommendation(userId, input, output) }
  }

  return output
}

// Map đòn bẩy string → hệ số nhân (spot = 1)
const LEVERAGE_MULT: Record<string, number> = {
  spot: 1, x2: 2, x3: 3, x5: 5, x10: 10, x20: 20
}

// ── Trade plan từ giá hiện tại + prediction + input ──────────
function composePlan(currentPrice: number, pred: Prediction, input: AnalystInput): TradePlan {
  const entryLow = currentPrice * 0.995
  const entryHigh = currentPrice * 1.003

  const slPct = pred.rangePctLow
  // Nếu user set profitTargetPct → override TP từ rangePctHigh
  const tpPct = input.profitTargetPct ?? pred.rangePctHigh

  const stopLoss = pred.direction === 'UP'
    ? currentPrice * (1 - slPct / 100)
    : currentPrice * (1 + slPct / 100)
  const takeProfit = pred.direction === 'UP'
    ? currentPrice * (1 + tpPct / 100)
    : currentPrice * (1 - tpPct / 100)

  // ── Đòn bẩy: amount là MARGIN, vị thế = margin × leverage ──
  const leverage = LEVERAGE_MULT[input.leverage ?? 'spot'] ?? 1
  const notionalUSD = input.amount * leverage
  const positionSize = notionalUSD / currentPrice

  // Risk/reward tính trên notional (đã gồm đòn bẩy)
  const riskRaw = Math.abs(currentPrice - stopLoss) * positionSize
  const rewardUSD = Math.abs(takeProfit - currentPrice) * positionSize
  // rrRatio dựa trên risk gốc (tỉ lệ không đổi theo đòn bẩy: = tpPct/slPct)
  const rrRatio = riskRaw > 0 ? rewardUSD / riskRaw : 0
  // Lỗ tối đa THỰC TẾ bị giới hạn bởi margin (isolated) — không mất quá vốn ký quỹ
  const riskUSD = leverage > 1 ? Math.min(riskRaw, input.amount) : riskRaw

  // Giá thanh lý xấp xỉ (isolated, bỏ qua phí + maintenance margin)
  //   long  → giá giảm 1/L  → cháy;  short → giá tăng 1/L → cháy
  const liquidationPrice = leverage > 1
    ? (pred.direction === 'UP'
        ? currentPrice * (1 - 1 / leverage)
        : currentPrice * (1 + 1 / leverage))
    : null

  return {
    entryLow, entryHigh, stopLoss, takeProfit, positionSize,
    riskUSD: round2(riskUSD),
    rewardUSD: round2(rewardUSD),
    rrRatio: round2(rrRatio),
    leverage,
    notionalUSD: round2(notionalUSD),
    liquidationPrice: liquidationPrice !== null ? round2(liquidationPrice) : null
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ── Wallet context (optional, không break nếu fail) ──────────
async function getWalletContext(userId: number) {
  const w = await queryOne<{ cash_balance: string, total_value: string }>(
    'SELECT cash_balance, total_value FROM wallets WHERE user_id = $1',
    [userId]
  )
  if (!w) return null

  const holdings = await query<{ symbol: string }>(
    `SELECT vc.symbol
       FROM wallet_holdings wh
       JOIN virtual_coins vc ON vc.id = wh.coin_id
       JOIN wallets w ON w.id = wh.wallet_id
      WHERE w.user_id = $1 AND wh.amount > 0
      ORDER BY wh.amount * vc.current_price DESC
      LIMIT 3`,
    [userId]
  )

  return {
    cashBalance: parseFloat(w.cash_balance),
    totalValue: parseFloat(w.total_value),
    topHoldings: holdings.map(h => h.symbol)
  }
}

// ── Save vào ai_recommendations ──────────────────────────────
async function saveRecommendation(
  userId: number,
  input: AnalystInput,
  out: AnalystOutput
): Promise<number> {
  // ── Chống trùng (idempotent) ─────────────────────────────────
  // Lưu lại y hệt 1 đề xuất đang OPEN (cùng user/coin/khung/hướng/giá vào)
  // thì trả về id cũ thay vì INSERT mới. Tránh đẻ row trùng khi user bấm
  // "Lưu báo cáo" nhiều lần hoặc /analyze→/save trong khoảng cache 5 phút.
  const dup = await queryOne<{ id: number }>(
    `SELECT id FROM ai_recommendations
      WHERE user_id = $1 AND symbol = $2 AND horizon = $3 AND direction = $4
        AND entry_price = $5 AND status = 'OPEN'
      ORDER BY id DESC LIMIT 1`,
    [userId, input.symbol, input.horizon, out.prediction.direction, out.coin.price]
  )
  if (dup) return dup.id

  const created = await queryOne<{ id: number }>(
    `INSERT INTO ai_recommendations
       (user_id, symbol, amount, horizon, risk, experience, goal, style, max_risk_pct, report_depth,
        tone, stop_loss_kind, profit_target_pct, market_bias, entry_strategy,
        direction, confidence, entry_price, stop_loss, take_profit, position_size,
        leverage, liquidation_price,
        ai_narrative, ai_reasons, ai_key_points,
        model, elapsed_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
             $21, $22, $23, $24, $25::jsonb, $26::jsonb, $27, $28)
     RETURNING id`,
    [
      userId, input.symbol, input.amount, input.horizon, input.risk, input.experience,
      input.goal, input.style, input.maxRiskPct, input.reportDepth,
      input.tone ?? null, input.stopLossKind ?? null, input.profitTargetPct ?? null, input.marketBias ?? null, input.entryStrategy ?? null,
      out.prediction.direction, out.prediction.confidence,
      out.coin.price, out.plan.stopLoss, out.plan.takeProfit, out.plan.positionSize,
      out.plan.leverage, out.plan.liquidationPrice,
      out.ai.narrative,
      JSON.stringify(out.ai.reasons),
      JSON.stringify(out.ai.keyPoints),
      out.meta.model, Math.round(out.meta.elapsedMs)
    ]
  )
  return created!.id
}

// ═════════════════════════════════════════════════════════════
// TA CALCULATOR — EMA20/EMA50/RSI14/MACD/BollingerBands từ kline
// thật bằng lib `technicalindicators` (math chuẩn).
// Pattern: server tính số CHÍNH XÁC, không nhờ LLM (LLM tính yếu).
// ═════════════════════════════════════════════════════════════

/**
 * Tính TA cho 1 coin theo horizon.
 * Tự chọn khung kline phù hợp (scalp=1h, day=4h, swing=1d, position=1w).
 */
async function computeIndicators(symbol: string, horizon: Horizon): Promise<TaResult> {
  const interval = HORIZON_PCT[horizon].klineInterval
  const candles = await klineService.fetchCandles({ symbol, interval, limit: 200 })

  if (candles.length < 50) {
    throw createError({
      statusCode: 502,
      statusMessage: `Không đủ dữ liệu nến cho ${symbol} (${candles.length}/50 tối thiểu)`
    })
  }

  const closes = candles.map(c => c.close)
  const price = closes.at(-1)!

  // ── Tính các indicator (chỉ lấy giá trị mới nhất) ─────────
  const ema20 = EMA.calculate({ values: closes, period: 20 }).at(-1)!
  const ema50 = EMA.calculate({ values: closes, period: 50 }).at(-1)!
  const rsi14 = RSI.calculate({ values: closes, period: 14 }).at(-1)!

  const macdRaw = MACD.calculate({
    values: closes,
    fastPeriod: 12, slowPeriod: 26, signalPeriod: 9,
    SimpleMAOscillator: false, SimpleMASignal: false
  }).at(-1)!

  const bbRaw = BollingerBands.calculate({
    values: closes, period: 20, stdDev: 2
  }).at(-1)!

  // ── Suy ra signal cho mỗi indicator ──────────────────────
  // EMA: bullish nếu price trên EMA20 VÀ EMA20 trên EMA50 (golden cross)
  const emaSig: Signal
    = price > ema20 && ema20 > ema50
      ? 'bullish'
      : price < ema20 && ema20 < ema50 ? 'bearish' : 'neutral'

  // RSI: 50-70 bullish nhẹ, 30-50 bearish nhẹ, ngoài extreme
  const rsiSig: Signal
    = rsi14 >= 50 && rsi14 < 70
      ? 'bullish'
      : rsi14 > 30 && rsi14 < 50 ? 'bearish' : 'neutral'

  // MACD: histogram quyết định momentum
  const histogram = macdRaw.histogram ?? 0
  const macdSig: Signal
    = histogram > 0
      ? 'bullish'
      : histogram < 0 ? 'bearish' : 'neutral'

  // Bollinger: % vị trí trong dải (<20% = oversold, >80% = overbought)
  const bbWidth = bbRaw.upper - bbRaw.lower
  const bbPos = bbWidth > 0 ? (price - bbRaw.lower) / bbWidth : 0.5
  const bbSig: Signal
    = bbPos < 0.2
      ? 'bullish'
      : bbPos > 0.8 ? 'bearish' : 'neutral'

  return {
    price, ema20, ema50, rsi14,
    macd: { macd: macdRaw.MACD ?? 0, signal: macdRaw.signal ?? 0, histogram },
    bb: { upper: bbRaw.upper, middle: bbRaw.middle, lower: bbRaw.lower },
    signals: { ema: emaSig, rsi: rsiSig, macd: macdSig, bb: bbSig }
  }
}

// ═════════════════════════════════════════════════════════════
// NEWS AGGREGATOR — Lấy tin tức 7 ngày liên quan đến 1 coin.
// Query bảng `news` (admin curate). Nếu bảng chưa tồn tại hoặc
// không có data, trả [] (graceful — không break analyze flow).
// Sentiment infer từ keyword (đủ tốt cho demo).
// ═════════════════════════════════════════════════════════════
interface NewsRow {
  title: string
  source: string | null
  summary: string | null
  source_url: string | null
  published_at: string
  category: string | null
}

const POSITIVE_WORDS = [
  'tăng', 'tích cực', 'phát triển', 'đột phá', 'mua ròng', 'ath', 'kỷ lục',
  'tăng trưởng', 'thuận lợi', 'upgrade', 'approve', 'bull', 'rally', 'gain', 'surge', 'breakout'
]
const NEGATIVE_WORDS = [
  'giảm', 'sụt', 'tiêu cực', 'bán tháo', 'crash', 'dump', 'bear', 'loss', 'ban', 'fud',
  'hack', 'exploit', 'sec kiện', 'investigation', 'concern'
]

/**
 * Lấy news theo coin (search trong category, tags, hoặc fallback content search).
 */
async function fetchCoinNews(symbol: string, days = 7, limit = 6): Promise<NewsBrief[]> {
  const sym = symbol.toUpperCase()

  try {
    // Query news liên quan: category match (BTC → bitcoin), hoặc title chứa symbol
    const categoryGuess = guessCategory(sym)
    const rows = await query<NewsRow>(
      `SELECT title, source, summary, source_url, published_at, category
         FROM news
        WHERE published_at >= now() - make_interval(days => $1)
          AND status = 'published'
          AND (category = $2 OR title ILIKE $3 OR summary ILIKE $3)
        ORDER BY published_at DESC
        LIMIT $4`,
      [days, categoryGuess, `%${sym}%`, limit]
    )

    return rows.map(r => ({
      title: r.title,
      source: r.source ?? 'Unknown',
      summary: r.summary,
      url: r.source_url,
      date: relativeTime(new Date(r.published_at)),
      sentiment: inferSentiment(r.title, r.summary)
    }))
  } catch (e) {
    // Bảng news có thể chưa được tạo trong DB → trả mảng rỗng (graceful)
    console.warn(`[news-aggregator] query failed for ${sym}:`, (e as Error).message)
    return []
  }
}

function guessCategory(symbol: string): string {
  if (symbol === 'BTC') return 'bitcoin'
  if (symbol === 'ETH') return 'altcoin'
  if (['SOL', 'BNB', 'XRP', 'ADA', 'DOT', 'AVAX'].includes(symbol)) return 'altcoin'
  return 'altcoin'
}

function inferSentiment(title: string, summary: string | null): Sentiment {
  const text = `${title} ${summary ?? ''}`.toLowerCase()
  const pos = POSITIVE_WORDS.filter(w => text.includes(w)).length
  const neg = NEGATIVE_WORDS.filter(w => text.includes(w)).length
  if (pos > neg) return 'positive'
  if (neg > pos) return 'negative'
  return 'neutral'
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime()
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (hours < 1) return 'vừa xong'
  if (hours < 24) return `${hours} giờ trước`
  if (days === 1) return '1 ngày trước'
  return `${days} ngày trước`
}

// ═════════════════════════════════════════════════════════════
// PREDICTION ENGINE — Rule-based signal confluence.
// Đếm số signal bullish/bearish từ TA + news → quyết định
// direction + confidence + reasons. KHÔNG dùng LLM ở đây.
// Logic: weighted scoring để direction reflect "đa số có trọng số".
// ═════════════════════════════════════════════════════════════
const HORIZON_LABEL: Record<Horizon, string> = {
  scalp: 'vài giờ tới',
  day: '1-3 ngày tới',
  swing: '7 ngày tới',
  position: '1-3 tháng tới'
}

// Trọng số cho mỗi loại signal (EMA quan trọng nhất → trend)
const WEIGHTS = { ema: 2, macd: 1.5, rsi: 1, bb: 1, news: 1 }

function predict(ta: TaResult, news: NewsBrief[], horizon: Horizon): Prediction {
  let bullScore = 0
  let bearScore = 0
  const reasons: string[] = []

  // ── EMA (weight 2) ────────────────────────────────────────
  if (ta.signals.ema === 'bullish') {
    bullScore += WEIGHTS.ema
    reasons.push(
      ta.ema20 > ta.ema50
        ? 'EMA20 cắt lên EMA50 (golden cross) — trend tăng xác lập'
        : 'Giá trên EMA20 — trend ngắn hạn tích cực'
    )
  } else if (ta.signals.ema === 'bearish') {
    bearScore += WEIGHTS.ema
    reasons.push('EMA20 dưới EMA50 (death cross) — trend giảm')
  }

  // ── RSI (weight 1) ────────────────────────────────────────
  if (ta.signals.rsi === 'bullish') {
    bullScore += WEIGHTS.rsi
    reasons.push(`RSI ${ta.rsi14.toFixed(0)} — vùng cân bằng healthy, còn dư địa tăng`)
  } else if (ta.signals.rsi === 'bearish') {
    bearScore += WEIGHTS.rsi
    reasons.push(`RSI ${ta.rsi14.toFixed(0)} — momentum yếu`)
  } else if (ta.rsi14 >= 70) {
    // Quá mua: thiên về bearish (pullback) nhưng nhẹ
    bearScore += WEIGHTS.rsi * 0.5
    reasons.push(`RSI ${ta.rsi14.toFixed(0)} — quá mua, khả năng pullback ngắn hạn`)
  } else if (ta.rsi14 <= 30) {
    // Quá bán: thiên về bullish (bounce)
    bullScore += WEIGHTS.rsi * 0.5
    reasons.push(`RSI ${ta.rsi14.toFixed(0)} — quá bán, khả năng bounce kỹ thuật`)
  }

  // ── MACD (weight 1.5) ─────────────────────────────────────
  if (ta.signals.macd === 'bullish') {
    bullScore += WEIGHTS.macd
    reasons.push('MACD histogram dương — momentum tăng')
  } else if (ta.signals.macd === 'bearish') {
    bearScore += WEIGHTS.macd
    reasons.push('MACD histogram âm — momentum giảm')
  }

  // ── Bollinger Bands (weight 1) ────────────────────────────
  if (ta.signals.bb === 'bullish') {
    bullScore += WEIGHTS.bb
    reasons.push('Giá gần Bollinger Lower — vùng oversold')
  } else if (ta.signals.bb === 'bearish') {
    bearScore += WEIGHTS.bb
    reasons.push('Giá gần Bollinger Upper — vùng overbought')
  }

  // ── News sentiment (weight 1) ─────────────────────────────
  if (news.length > 0) {
    const pos = news.filter(n => n.sentiment === 'positive').length
    const neg = news.filter(n => n.sentiment === 'negative').length
    if (pos > neg) {
      bullScore += WEIGHTS.news
      reasons.push(`${pos}/${news.length} tin tức tích cực 7 ngày qua`)
    } else if (neg > pos) {
      bearScore += WEIGHTS.news
      reasons.push(`${neg}/${news.length} tin tức tiêu cực 7 ngày qua`)
    }
  }

  // ── Quyết định direction + confidence ─────────────────────
  const direction: Direction = bullScore >= bearScore ? 'UP' : 'DOWN'
  const delta = Math.abs(bullScore - bearScore)

  // Confidence: 50 base + delta × 6, cap 85 (không bao giờ "chắc chắn")
  const confidence = Math.min(85, Math.max(50, Math.round(50 + delta * 6)))

  // Range theo horizon (đã định nghĩa trong HORIZON_PCT)
  const cfg = HORIZON_PCT[horizon]
  const rangePctLow = Math.round(cfg.sl * 0.7 * 10) / 10 // floor ≈ SL × 0.7
  const rangePctHigh = Math.round(cfg.tp * 10) / 10 // ceiling = TP

  return {
    direction,
    confidence,
    rangePctLow,
    rangePctHigh,
    timeframeLabel: HORIZON_LABEL[horizon],
    reasons: reasons.slice(0, 5)
  }
}

// ═════════════════════════════════════════════════════════════
// PROMPT BUILDER — Tạo system + user prompt cho Groq Llama.
// Triết lý:
//   - Server tính TA + prediction CHÍNH XÁC, prompt chỉ truyền số.
//   - LLM chỉ làm 1 việc: viết tiếng Việt mạch lạc theo context user.
//   - Cấm LLM "khuyên mua/bán" — chỉ "có khả năng / xác suất".
// ═════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích crypto cho HSEC — nền tảng học crypto bằng tiền ảo.

QUY TẮC NGHIÊM NGẶT:
1. Viết HOÀN TOÀN tiếng Việt tự nhiên.
2. TUYỆT ĐỐI KHÔNG dùng các từ "khuyên", "nên mua", "nên bán", "đặt lệnh", "lời khuyên".
   Thay bằng: "có khả năng", "xác suất", "có thể", "phân tích cho thấy", "kịch bản".
3. Dựa CHÍNH XÁC vào số liệu được cung cấp — không bịa giá, không bịa indicator.
4. Output JSON theo schema, KHÔNG markdown trong narrative.
5. Tone friendly nhưng professional. KHÔNG dùng emoji ở bất kỳ đâu.
6. Đây là phân tích xác suất, không phải dự báo chắc chắn — luôn nhắc tinh thần này.`

const EXPERIENCE_HINT: Record<string, string> = {
  beginner: 'Giải thích đơn giản, tránh thuật ngữ. Khi cần (RSI, MACD) giải thích 1 câu trong ngoặc.',
  intermediate: 'Viết tự nhiên, dùng thuật ngữ TA cơ bản có context.',
  pro: 'Viết kỹ thuật, dùng thuật ngữ chuyên môn thoải mái, đi thẳng vào phân tích.'
}

const DEPTH_HINT: Record<string, string> = {
  short: '80-100 từ.',
  medium: '180-220 từ.',
  long: '350-450 từ.'
}

const GOAL_HINT: Record<string, string> = {
  learn: 'Người dùng đang HỌC. Lồng ghép giáo dục, giải thích "tại sao" nhiều hơn.',
  profit: 'Người dùng muốn lướt sóng ngắn hạn. Focus momentum + timing.',
  invest: 'Người dùng đầu tư dài hạn. Focus trend + fundamentals.',
  preserve: 'Người dùng ưu tiên bảo toàn vốn. Nhấn mạnh risk + stop loss.'
}

const TONE_HINT: Record<string, string> = {
  professional: 'Tone chuyên nghiệp, formal, đi thẳng vào số liệu và phân tích.',
  friendly: 'Tone thân thiện, gần gũi, dùng "bạn" và một vài câu nhẹ nhàng.',
  strict: 'Tone nghiêm khắc, nhấn mạnh rủi ro, cảnh báo rõ ràng những nguy cơ.'
}

const SL_KIND_HINT: Record<string, string> = {
  hard: 'User dùng Stop-Loss CỨNG (đặt lệnh thật trên sàn). Khuyến khích đặt SL ngay khi vào.',
  trailing: 'User dùng Trailing Stop (SL đuổi theo giá khi lời). Giải thích cách kéo SL.',
  mental: 'User dùng Mental Stop (tự nhớ, không đặt lệnh). Nhắc kỷ luật cắt lỗ tay.'
}

const RISK_HINT: Record<string, string> = {
  low: 'Khẩu vị THẬN TRỌNG — ưu tiên bảo toàn vốn, chấp nhận lợi nhuận nhỏ. Nhấn mạnh quản trị rủi ro.',
  mid: 'Khẩu vị CÂN BẰNG — tìm điểm hài hòa giữa rủi ro và lợi nhuận.',
  high: 'Khẩu vị MẠO HIỂM — chấp nhận biến động lớn để tìm lợi nhuận cao hơn.',
  degen: 'Khẩu vị LIỀU CAO (degen) — tối đa hóa lợi nhuận, chịu được drawdown sâu. Vẫn PHẢI cảnh báo rõ nguy cơ mất vốn.'
}

const LEVERAGE_HINT: Record<string, string> = {
  spot: 'Giao dịch SPOT (không đòn bẩy) — không có rủi ro thanh lý.',
  x2: 'Đòn bẩy 2x — rủi ro nhân đôi, đề cập ngưỡng thanh lý gần đúng.',
  x3: 'Đòn bẩy 3x — biến động tài khoản gấp 3, nhắc rủi ro thanh lý.',
  x5: 'Đòn bẩy 5x — rủi ro cao, một biến động ~20% ngược chiều có thể thanh lý.',
  x10: 'Đòn bẩy 10x — rất rủi ro, ~10% ngược chiều là thanh lý. Cảnh báo mạnh.',
  x20: 'Đòn bẩy 20x — cực kỳ rủi ro, ~5% ngược chiều là thanh lý. Cảnh báo nghiêm khắc về quản trị vốn.'
}

const MARKET_BIAS_HINT: Record<string, string> = {
  bull: 'User đang nghĩ thị trường UPTREND. Nếu TA đồng thuận thì củng cố, nếu ngược thì nhẹ nhàng phản biện bằng số liệu.',
  bear: 'User đang nghĩ thị trường DOWNTREND. Đối chiếu với TA, chỉ ra điểm đồng thuận/mâu thuẫn.',
  crab: 'User nghĩ thị trường ĐI NGANG (sideways). Tập trung vùng giá dao động + chiến lược range.',
  unsure: 'User CHƯA chắc về xu hướng chung. Giúp họ định hình kịch bản dựa trên dữ liệu.'
}

const ENTRY_STRATEGY_HINT: Record<string, string> = {
  market: 'Vào lệnh MARKET (mua ngay giá hiện tại). Phân tích liệu thời điểm hiện tại có hợp lý.',
  limit: 'Vào lệnh LIMIT (chờ giá về vùng tốt). Gợi ý vùng đặt limit hợp lý theo TA.',
  scale: 'Vào lệnh SCALE-IN / DCA (chia nhiều lần). Gợi ý cách chia vốn theo các mốc giá.',
  breakout: 'Vào lệnh BREAKOUT (chờ phá kháng cự). Chỉ ra mốc breakout cần theo dõi + bẫy phá vỡ giả.'
}

interface PromptContext {
  input: AnalystInput
  coin: { name: string, symbol: string, price: number, change24h: number, marketCap: number }
  ta: TaResult
  prediction: Prediction
  news: NewsBrief[]
  wallet?: { cashBalance: number, totalValue: number, topHoldings: string[] } | null
  plan?: TradePlan
}

function buildPrompt(ctx: PromptContext): { system: string, prompt: string } {
  const { input, coin, ta, prediction, news, wallet, plan } = ctx
  const expHint = EXPERIENCE_HINT[input.experience]
  const depthHint = DEPTH_HINT[input.reportDepth]
  const goalHint = GOAL_HINT[input.goal]
  const toneHint = TONE_HINT[input.tone]
  const slHint = SL_KIND_HINT[input.stopLossKind]
  const riskHint = RISK_HINT[input.risk] ?? ''
  const levHint = input.leverage ? LEVERAGE_HINT[input.leverage] : ''
  const biasHint = input.marketBias ? MARKET_BIAS_HINT[input.marketBias] : ''
  const entryHint = input.entryStrategy ? ENTRY_STRATEGY_HINT[input.entryStrategy] : ''

  const newsBlock = news.length
    ? news.slice(0, 5).map((n, i) =>
        `${i + 1}. [${n.sentiment.toUpperCase()}] ${n.title} (${n.source}, ${n.date})`
      ).join('\n')
    : 'Không có tin tức nổi bật trong 7 ngày qua.'

  const walletBlock = wallet
    ? `Tiền mặt ${wallet.cashBalance.toFixed(0)} USDT, tổng tài sản ${wallet.totalValue.toFixed(0)} USDT, top holdings: ${wallet.topHoldings.join(', ') || 'không có'}.`
    : 'Chưa có dữ liệu ví.'

  // ── Custom request block (nếu user nhập) ─────────────────
  const customBlock = input.customRequest?.trim()
    ? `\n═══ YÊU CẦU CỤ THỂ TỪ USER ═══\n"${input.customRequest.trim()}"\n\nQUAN TRỌNG: narrative PHẢI mở đầu bằng "Dựa trên yêu cầu của bạn về [trích nội dung yêu cầu], ..." để user biết AI đã đọc yêu cầu của họ.`
    : ''

  // ── Compare coin block ──────────────────────────────────
  const compareBlock = input.compareSymbol
    ? `\n═══ SO SÁNH VỚI ═══\nUser muốn so sánh ${coin.symbol} với ${input.compareSymbol}. Trong narrative, thêm 1-2 câu so sánh ngắn về xu hướng/tiềm năng giữa 2 coin.`
    : ''

  // ── Tags interest / exclude ─────────────────────────────
  const tagsBlock = (() => {
    const lines: string[] = []
    if (input.interestTags?.length) lines.push(`User ƯU TIÊN topics: ${input.interestTags.join(', ')} — đề cập nếu liên quan.`)
    if (input.excludeTags?.length) lines.push(`User TRÁNH topics: ${input.excludeTags.join(', ')} — KHÔNG đề cập trong narrative.`)
    return lines.length ? `\n═══ TAGS USER ═══\n${lines.join('\n')}` : ''
  })()

  // ── Profit target user override ─────────────────────────
  const profitTargetBlock = input.profitTargetPct
    ? `\n═══ MỤC TIÊU LỢI NHUẬN USER ═══\nUser muốn target +${input.profitTargetPct}% (override TP mặc định). Đề cập trong narrative liệu mục tiêu này có hợp lý theo TA hay quá tham/quá an toàn.`
    : ''

  // ── Advanced blocks (Round 3) ───────────────────────────
  const leverageBlock = levHint
    ? `\n═══ ĐÒN BẨY ═══\n${levHint}${
      plan && plan.leverage > 1
        ? `\nSố liệu cụ thể: vị thế ${plan.notionalUSD} USDT (margin ${input.amount} × ${plan.leverage}x), giá thanh lý xấp xỉ $${plan.liquidationPrice}. Nhắc user SL phải đặt TRƯỚC giá thanh lý.`
        : ''
    }`
    : ''
  const biasBlock = biasHint
    ? `\n═══ GÓC NHÌN THỊ TRƯỜNG (USER) ═══\n${biasHint}`
    : ''
  const entryBlock = entryHint
    ? `\n═══ CHIẾN LƯỢC VÀO LỆNH ═══\n${entryHint}`
    : ''

  const prompt = `Phân tích coin ${coin.name} (${coin.symbol}) cho user.

═══ THÔNG TIN USER ═══
- Trình độ: ${input.experience} → ${expHint}
- Mục tiêu: ${input.goal} → ${goalHint}
- Phong cách: ${input.style}
- Khẩu vị rủi ro: ${input.risk}${riskHint ? ` → ${riskHint}` : ''}
- Khung thời gian: ${input.horizon}
- Vốn: ${input.amount} USDT
- Độ chi tiết: ${input.reportDepth} → ${depthHint}
- Ví: ${walletBlock}

═══ DỮ LIỆU COIN ═══
- Giá hiện tại: $${coin.price.toFixed(coin.price < 1 ? 4 : 2)} (24h: ${coin.change24h.toFixed(2)}%)
- Market cap: $${(coin.marketCap / 1e9).toFixed(1)}B

═══ PHÂN TÍCH KỸ THUẬT ═══
- EMA20 $${ta.ema20.toFixed(2)} | EMA50 $${ta.ema50.toFixed(2)}
- RSI14: ${ta.rsi14.toFixed(1)}
- MACD histogram: ${ta.macd.histogram.toFixed(2)}
- Bollinger: $${ta.bb.lower.toFixed(2)} - $${ta.bb.upper.toFixed(2)}
- Signals: EMA=${ta.signals.ema}, RSI=${ta.signals.rsi}, MACD=${ta.signals.macd}, BB=${ta.signals.bb}

═══ DỰ ĐOÁN RULE-BASED ═══
- Hướng: ${prediction.direction === 'UP' ? 'TĂNG' : 'GIẢM'}
- Xác suất: ${prediction.confidence}%
- Biên độ: ${prediction.rangePctLow}% - ${prediction.rangePctHigh}%
- Khung: ${prediction.timeframeLabel}
- Cơ sở: ${prediction.reasons.join('; ')}

═══ TIN TỨC 7 NGÀY ═══
${newsBlock}

═══ TONE BÁO CÁO ═══
${toneHint}

═══ LOẠI STOP-LOSS ═══
${slHint}
${leverageBlock}${biasBlock}${entryBlock}${profitTargetBlock}${compareBlock}${tagsBlock}${customBlock}

═══ YÊU CẦU OUTPUT (JSON) ═══

"narrative": đoạn văn ${depthHint} mô tả phân tích theo cấu trúc:
  - 1-2 câu mở: tình hình ${coin.symbol} hiện tại
  - Phân tích kỹ thuật (dựa trên số liệu trên)
  - Ảnh hưởng tin tức (nếu có)
  - Đánh giá xác suất hướng đi
  - 1 câu kết theo mục tiêu user

"reasons": mảng 3-5 string, mỗi string là 1 lý do (max 15 từ).

"keyPoints": mảng 2-3 string, mỗi string là 1 điểm cần nhớ (max 12 từ).

NHỚ: không dùng "nên mua/bán/khuyên", dùng "có khả năng/xác suất/có thể". Không emoji.`

  return { system: SYSTEM_PROMPT, prompt }
}

// ═════════════════════════════════════════════════════════════
// LLM NARRATOR — Gọi Groq với generateText + manual JSON parse.
// Lý do KHÔNG dùng generateObject: Groq llama-4-scout response
// format json_schema không stable — hay trả {} rỗng. Dùng
// generateText + ép JSON trong prompt + parse thủ công → robust.
// ═════════════════════════════════════════════════════════════
async function generateNarrative(opts: { system: string, prompt: string }): Promise<AiNarrative> {
  const groq = getGroqAnalyst()

  // Ép LLM trả JSON thuần qua prompt + response_format
  const jsonPrompt = `${opts.prompt}

QUAN TRỌNG: Chỉ trả về JSON thuần với đúng cấu trúc sau, KHÔNG có markdown, KHÔNG có text giải thích:
{
  "narrative": "đoạn văn tiếng Việt phân tích coin theo cấu trúc đã yêu cầu",
  "reasons": ["lý do 1", "lý do 2", "lý do 3"],
  "keyPoints": ["điểm chính 1", "điểm chính 2"]
}`

  let raw: string
  try {
    const result = await generateText({
      model: groq(ANALYST_MODEL),
      system: opts.system,
      prompt: jsonPrompt,
      maxOutputTokens: ANALYST_MAX_TOKENS,
      temperature: 0.7,
      providerOptions: {
        groq: { responseFormat: { type: 'json_object' } }
      }
    })
    raw = result.text
  } catch (err) {
    console.error('[llm-narrator] Groq call failed:', (err as Error).message)
    throw createError({
      statusCode: 502,
      statusMessage: 'AI chưa phản hồi được. Thử lại sau ít phút.'
    })
  }

  // Parse JSON — chấp nhận cả markdown wrapper
  const parsed = parseLooseJson(raw)
  if (!parsed || typeof parsed !== 'object') {
    console.error('[llm-narrator] Cannot parse LLM output:', raw.slice(0, 300))
    throw createError({
      statusCode: 502,
      statusMessage: 'AI trả về format không hợp lệ. Thử lại.'
    })
  }

  return {
    narrative: String(parsed.narrative || '').trim(),
    reasons: toStringList(parsed.reasons, 5),
    keyPoints: toStringList(parsed.keyPoints, 3)
  }
}

/**
 * Parse JSON loose:
 * - Bỏ markdown code fence ```json ... ```
 * - Strip text trước { đầu và sau } cuối
 * - Trả null nếu vẫn fail.
 */
function toStringList(value: unknown, max: number): string[] {
  return Array.isArray(value) ? value.slice(0, max).map(v => String(v).trim()).filter(Boolean) : []
}

function parseLooseJson(text: string): { narrative?: unknown, reasons?: unknown, keyPoints?: unknown } | null {
  let s = text.trim()
  // Strip markdown code fence
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/, '').replace(/\s*```\s*$/, '')
  }
  // Strip text trước { đầu
  const firstBrace = s.indexOf('{')
  const lastBrace = s.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1)
  }
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
