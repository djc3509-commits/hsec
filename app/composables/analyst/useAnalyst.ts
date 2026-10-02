// useAnalyst — Client composable cho AI Analyst.
// Manages: form submit, loading steps animation, result, error, reset.
import type { AnalystInput, AnalystOutput } from '../../../server/dtos/analyst'

export interface LoadingStep {
  title: string
  sub: string
  short: string
  icon: string
}

// Icon cố định cho 6 bước; tiêu đề/sub/short lấy từ i18n (analyst.form.loading.sN.*).
const STEP_ICONS = [
  'i-lucide-coins', 'i-lucide-line-chart', 'i-lucide-bar-chart-3',
  'i-lucide-wallet', 'i-lucide-newspaper', 'i-lucide-sparkles'
]

export function useAnalyst() {
  const { t } = useI18n()

  const LOADING_STEPS = computed<LoadingStep[]>(() => STEP_ICONS.map((icon, i) => ({
    title: t(`analyst.form.loading.s${i + 1}.title`),
    sub: t(`analyst.form.loading.s${i + 1}.sub`),
    short: t(`analyst.form.loading.s${i + 1}.short`),
    icon
  })))

  const result = ref<AnalystOutput | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentStep = ref(0)
  const steps = LOADING_STEPS

  // ── Save state (user chủ động lưu vào lịch sử) ──────────────
  const saving = ref(false)
  const saved = ref(false)
  const saveError = ref<string | null>(null)

  // Progress smooth animation (0-100)
  const progress = ref(0)

  let stepTimer: ReturnType<typeof setInterval> | null = null
  let progressTimer: ReturnType<typeof setInterval> | null = null

  async function runAnalyze(input: AnalystInput) {
    loading.value = true
    error.value = null
    result.value = null
    currentStep.value = 0
    progress.value = 0
    saved.value = false
    saveError.value = null

    // Animate steps mỗi 700ms
    stepTimer = setInterval(() => {
      if (currentStep.value < LOADING_STEPS.value.length - 1) currentStep.value++
    }, 700)

    // Smooth progress bar tăng mỗi 50ms (mục tiêu 95% cho đến khi xong)
    progressTimer = setInterval(() => {
      if (progress.value < 92) progress.value = Math.min(92, progress.value + 1.2)
    }, 80)

    try {
      const res = await $fetch<AnalystOutput>('/api/analyst/analyze', {
        method: 'POST',
        body: input
      })
      // Data đã có → ép progress chạy tới 100% và GIỮ để user thấy hoàn tất
      currentStep.value = LOADING_STEPS.value.length - 1
      progress.value = 100
      // Dừng timer ngay, không để tick nào can thiệp vào 100%
      if (stepTimer) {
        clearInterval(stepTimer)
        stepTimer = null
      }
      if (progressTimer) {
        clearInterval(progressTimer)
        progressTimer = null
      }
      // Chờ thanh bar chạy đầy (transition 200ms) + giữ 1 nhịp rồi mới hiện kết quả
      await new Promise(resolve => setTimeout(resolve, 700))
      result.value = res
    } catch (err) {
      const e = err as { data?: { statusMessage?: string }, message?: string }
      error.value = e?.data?.statusMessage || e?.message || t('analyst.form.error.analyze')
    } finally {
      if (stepTimer) {
        clearInterval(stepTimer)
        stepTimer = null
      }
      if (progressTimer) {
        clearInterval(progressTimer)
        progressTimer = null
      }
      loading.value = false
    }
  }

  // Lưu báo cáo hiện tại vào lịch sử (hit cache server → không chạy lại LLM)
  async function saveReport(input: AnalystInput) {
    if (saving.value || saved.value) return
    saving.value = true
    saveError.value = null
    try {
      const res = await $fetch<{ recommendationId: number }>('/api/analyst/save', {
        method: 'POST',
        body: input
      })
      if (result.value) result.value.recommendationId = res.recommendationId
      saved.value = true
    } catch (err) {
      const e = err as { data?: { statusMessage?: string }, message?: string }
      saveError.value = e?.data?.statusMessage || e?.message || t('analyst.form.error.save')
    } finally {
      saving.value = false
    }
  }

  function reset() {
    result.value = null
    error.value = null
    currentStep.value = 0
    progress.value = 0
    saving.value = false
    saved.value = false
    saveError.value = null
  }

  onScopeDispose(() => {
    if (stepTimer) clearInterval(stepTimer)
    if (progressTimer) clearInterval(progressTimer)
  })

  return {
    result, loading, error, currentStep, progress, steps,
    saving, saved, saveError, runAnalyze, saveReport, reset
  }
}
