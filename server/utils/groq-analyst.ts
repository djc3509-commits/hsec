// ─────────────────────────────────────────────────────────────
// GROQ ANALYST — Client Groq RIÊNG cho AI Analyst feature.
// KHÔNG share key với chat AI (mỗi feature 1 quota riêng).
//
// Env vars:
//   GROQ_API_KEY_ANALYST       (bắt buộc — key riêng cho Analyst)
//   ANALYST_MODEL              (optional — default 'llama-3.3-70b-versatile')
//   ANALYST_MAX_TOKENS         (optional — default 3000)
// ─────────────────────────────────────────────────────────────
import { createGroq } from '@ai-sdk/groq'

const INSECURE_DEFAULTS = new Set(['', 'your-key-here', 'gsk_xxx', 'placeholder'])

function readAnalystKey(): string {
  const key = process.env.GROQ_API_KEY_ANALYST
  if (!key || INSECURE_DEFAULTS.has(key)) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GROQ_API_KEY_ANALYST chưa được cấu hình trong .env (key riêng cho Analyst, không dùng chung với chat).'
    })
  }
  return key
}

// Lazy singleton — chỉ tạo client khi service gọi lần đầu.
// Tránh throw at module load time (sẽ làm Nitro crash khi reload).
let _client: ReturnType<typeof createGroq> | null = null

export function getGroqAnalyst() {
  if (!_client) _client = createGroq({ apiKey: readAnalystKey() })
  return _client
}

// Model phải support structured outputs (Groq):
//   - meta-llama/llama-4-scout-17b-16e-instruct (default — nhanh, VN tốt)
//   - openai/gpt-oss-120b (chậm hơn, output đỉnh)
//   - llama-3.3-70b-versatile KHÔNG support structured output trên Groq.
export const ANALYST_MODEL = process.env.ANALYST_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'
export const ANALYST_MAX_TOKENS = Number(process.env.ANALYST_MAX_TOKENS) || 3000
