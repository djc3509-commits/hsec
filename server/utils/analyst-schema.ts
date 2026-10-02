// Zod schema cho AnalystInput — dùng chung cho /analyze và /save.
import { z } from 'zod'
import {
  HORIZONS, RISK_LEVELS, EXPERIENCES, GOALS, STYLES, DEPTHS, INFO_TYPE_KEYS,
  TONES, STOP_LOSS_KINDS, LEVERAGES, MARKET_BIASES, ENTRY_STRATEGIES
} from '../dtos/analyst'
import type { AnalystInput } from '../dtos/analyst'

// z.enum cần tuple không rỗng; giữ nguyên union literal để kết quả parse khớp đúng kiểu AnalystInput.
const oneOf = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]])

export const analystInputSchema = z.object({
  symbol: z.string().min(2).max(10).transform(s => s.toUpperCase()),
  amount: z.number().positive().max(1_000_000),
  risk: oneOf(RISK_LEVELS),
  horizon: oneOf(HORIZONS),
  maxRiskPct: z.number().min(1).max(20),
  experience: oneOf(EXPERIENCES),
  goal: oneOf(GOALS),
  style: oneOf(STYLES),
  infoTypes: z.array(oneOf(INFO_TYPE_KEYS)).max(6),
  reportDepth: oneOf(DEPTHS),
  tone: oneOf(TONES),
  stopLossKind: oneOf(STOP_LOSS_KINDS),
  profitTargetPct: z.number().min(1).max(100),
  autoTrack: z.boolean().optional(),
  compareSymbol: z.string().min(2).max(10).optional(),
  interestTags: z.array(z.string().min(1).max(30)).max(10).optional(),
  excludeTags: z.array(z.string().min(1).max(30)).max(10).optional(),
  customRequest: z.string().max(500).optional(),
  leverage: oneOf(LEVERAGES).optional(),
  marketBias: oneOf(MARKET_BIASES).optional(),
  entryStrategy: oneOf(ENTRY_STRATEGIES).optional()
}) satisfies z.ZodType<AnalystInput>
