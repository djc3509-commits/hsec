// ─────────────────────────────────────────────────────────────
// ANALYST DTO — Hợp đồng kiểu dữ liệu cho AI Analyst.
// Dùng chung SERVER (service/api) lẫn CLIENT (composable/component).
// ─────────────────────────────────────────────────────────────

// ── Enums (single source of truth) ───────────────────────────
export type Horizon = 'scalp' | 'day' | 'swing' | 'position'
export type RiskLevel = 'low' | 'mid' | 'high' | 'degen'
export type Experience = 'beginner' | 'intermediate' | 'pro'
export type Goal = 'learn' | 'profit' | 'invest' | 'preserve'
export type Style = 'momentum' | 'reversal' | 'trend' | 'dca'
export type Direction = 'UP' | 'DOWN'
export type RecStatus = 'OPEN' | 'HIT_TP' | 'HIT_SL' | 'EXPIRED'
export type Sentiment = 'positive' | 'neutral' | 'negative'
export type Depth = 'short' | 'medium' | 'long'
export type Signal = 'bullish' | 'neutral' | 'bearish'
export type Tone = 'professional' | 'friendly' | 'strict'
export type StopLossKind = 'hard' | 'trailing' | 'mental'
// ── NEW Round 3 (tùy chỉnh nâng cao) ─────────────────────────
export type Leverage = 'spot' | 'x2' | 'x3' | 'x5' | 'x10' | 'x20'
export type MarketBias = 'bull' | 'bear' | 'crab' | 'unsure'
export type EntryStrategy = 'market' | 'limit' | 'scale' | 'breakout'

export const HORIZONS: Horizon[] = ['scalp', 'day', 'swing', 'position']
export const RISK_LEVELS: RiskLevel[] = ['low', 'mid', 'high', 'degen']
export const EXPERIENCES: Experience[] = ['beginner', 'intermediate', 'pro']
export const GOALS: Goal[] = ['learn', 'profit', 'invest', 'preserve']
export const STYLES: Style[] = ['momentum', 'reversal', 'trend', 'dca']
export const DEPTHS: Depth[] = ['short', 'medium', 'long']
export const TONES: Tone[] = ['professional', 'friendly', 'strict']
export const STOP_LOSS_KINDS: StopLossKind[] = ['hard', 'trailing', 'mental']
export const LEVERAGES: Leverage[] = ['spot', 'x2', 'x3', 'x5', 'x10', 'x20']
export const MARKET_BIASES: MarketBias[] = ['bull', 'bear', 'crab', 'unsure']
export const ENTRY_STRATEGIES: EntryStrategy[] = ['market', 'limit', 'scale', 'breakout']

export const INFO_TYPE_KEYS = ['technical', 'fundamental', 'news', 'sentiment', 'onchain', 'events'] as const
export type InfoType = typeof INFO_TYPE_KEYS[number]

// Range stop-loss / take-profit theo horizon (mặc định, server có thể override)
export const HORIZON_PCT: Record<Horizon, { sl: number, tp: number, days: number, klineInterval: '1h' | '4h' | '1d' | '1w' }> = {
  scalp: { sl: 1.5, tp: 2.5, days: 1, klineInterval: '1h' },
  day: { sl: 3.0, tp: 5.0, days: 3, klineInterval: '4h' },
  swing: { sl: 5.0, tp: 10.0, days: 14, klineInterval: '1d' },
  position: { sl: 10.0, tp: 30.0, days: 90, klineInterval: '1w' }
}

// ── INPUT (client → server) ──────────────────────────────────
export interface AnalystInput {
  symbol: string // 'BTC' (base, không kèm USDT)
  amount: number // USDT, vd 1000
  risk: RiskLevel
  horizon: Horizon
  maxRiskPct: number // 1-20
  experience: Experience
  goal: Goal
  style: Style
  infoTypes: InfoType[]
  reportDepth: Depth
  // ── NEW Round 2 ──────────────────────────────────────────
  tone: Tone // tone báo cáo: chuyên nghiệp / thân thiện / nghiêm khắc
  stopLossKind: StopLossKind // loại SL: hard / trailing / mental
  profitTargetPct: number // % lợi nhuận target user muốn (5-50)
  autoTrack?: boolean // @deprecated — lịch sử giờ chỉ lưu khi user bấm "Lưu báo cáo"
  compareSymbol?: string // coin thứ 2 để so sánh (optional)
  interestTags?: string[] // ['DeFi', 'Layer2'] — AI ưu tiên đề cập
  excludeTags?: string[] // ['NFT', 'memecoin'] — AI tránh
  customRequest?: string // free text yêu cầu thêm
  // ── NEW Round 3 (advanced, optional) ─────────────────────
  leverage?: Leverage // 'spot' | 'x2'..'x20' — đòn bẩy user dự định dùng
  marketBias?: MarketBias // góc nhìn vĩ mô của user — AI căn chỉnh / phản biện
  entryStrategy?: EntryStrategy // cách vào lệnh: market / limit / scale-in / breakout
}

// ── TA result (server tính bằng `technicalindicators`) ───────
export interface TaResult {
  price: number // giá hiện tại (để FE biết)
  ema20: number
  ema50: number
  rsi14: number
  macd: { macd: number, signal: number, histogram: number }
  bb: { upper: number, middle: number, lower: number }
  signals: {
    ema: Signal
    rsi: Signal
    macd: Signal
    bb: Signal
  }
}

// ── Prediction (rule-based engine) ───────────────────────────
export interface Prediction {
  direction: Direction
  confidence: number // 50-85
  rangePctLow: number // vd 4
  rangePctHigh: number // vd 7
  timeframeLabel: string // '7 ngày'
  reasons: string[] // ['EMA20 cắt lên EMA50', ...]
}

// ── News brief (từ bảng `news`) ──────────────────────────────
export interface NewsBrief {
  title: string
  source: string
  summary: string | null
  url: string | null
  date: string // '2 ngày trước' hoặc ISO
  sentiment: Sentiment
}

// ── Trade plan (server compute từ prediction + risk) ─────────
export interface TradePlan {
  entryLow: number
  entryHigh: number
  stopLoss: number
  takeProfit: number
  positionSize: number // đơn vị coin (ĐÃ nhân đòn bẩy)
  riskUSD: number // lỗ tối đa thực tế (đã clamp theo margin nếu có đòn bẩy)
  rewardUSD: number
  rrRatio: number
  // ── NEW: leverage-aware ──────────────────────────────────
  leverage: number // 1 = spot, 2..20 = futures
  notionalUSD: number // giá trị vị thế = amount × leverage
  liquidationPrice: number | null // giá thanh lý xấp xỉ (null nếu spot)
}

// ── AI narrative (do Groq Llama viết) ────────────────────────
export interface AiNarrative {
  narrative: string // đoạn dài tiếng Việt
  reasons: string[] // 3-5 lý do
  keyPoints: string[] // 2-3 điểm cần nhớ
}

// ── OUTPUT (server → client) ─────────────────────────────────
export interface AnalystOutput {
  recommendationId: number

  coin: {
    symbol: string
    name: string
    price: number
    change24h: number
    marketCap: number
    icon: string | null
  }

  ta: TaResult
  prediction: Prediction
  news: NewsBrief[]
  plan: TradePlan
  ai: AiNarrative

  meta: {
    generatedAt: string
    model: string
    elapsedMs: number
    cached: boolean
  }
}

// ── History (lịch sử recommendations) ────────────────────────
export interface RecHistoryRow {
  id: number
  symbol: string
  horizon: Horizon
  amount: number
  direction: Direction
  confidence: number
  entryPrice: number
  stopLoss: number
  takeProfit: number
  status: RecStatus
  pnl: number
  exitPrice: number | null
  createdAt: string
  closedAt: string | null
}

export interface HistoryStats {
  total: number
  wins: number
  losses: number
  open: number
  expired: number
  winRate: number // 0-100, chỉ tính closed (wins/(wins+losses))
  totalPnl: number
  bestTrade: number
  worstTrade: number
}

export interface HistoryResult {
  items: RecHistoryRow[]
  page: number
  limit: number
  total: number
  stats: HistoryStats
}

// ── Detail (đầy đủ 1 recommendation cho modal chi tiết) ──────
export interface RecDetail {
  id: number
  symbol: string
  amount: number
  // input config
  horizon: Horizon
  risk: RiskLevel
  experience: Experience
  goal: Goal
  style: Style
  maxRiskPct: number
  reportDepth: Depth
  tone: Tone | null
  stopLossKind: StopLossKind | null
  profitTargetPct: number | null
  marketBias: MarketBias | null
  entryStrategy: EntryStrategy | null
  // prediction + trade plan
  direction: Direction
  confidence: number
  entryPrice: number
  stopLoss: number
  takeProfit: number
  positionSize: number
  leverage: number
  liquidationPrice: number | null
  // AI narrative
  aiNarrative: string
  aiReasons: string[]
  aiKeyPoints: string[]
  // outcome
  status: RecStatus
  pnl: number
  exitPrice: number | null
  closedAt: string | null
  // meta
  model: string
  elapsedMs: number
  createdAt: string
  updatedAt: string
}

// ── Validators (server-side guard) ───────────────────────────
export function isValidHorizon(v: unknown): v is Horizon {
  return typeof v === 'string' && (HORIZONS as readonly string[]).includes(v)
}
export function isValidRisk(v: unknown): v is RiskLevel {
  return typeof v === 'string' && (RISK_LEVELS as readonly string[]).includes(v)
}
export function isValidExperience(v: unknown): v is Experience {
  return typeof v === 'string' && (EXPERIENCES as readonly string[]).includes(v)
}
export function isValidGoal(v: unknown): v is Goal {
  return typeof v === 'string' && (GOALS as readonly string[]).includes(v)
}
export function isValidStyle(v: unknown): v is Style {
  return typeof v === 'string' && (STYLES as readonly string[]).includes(v)
}
export function isValidDepth(v: unknown): v is Depth {
  return typeof v === 'string' && (DEPTHS as readonly string[]).includes(v)
}
