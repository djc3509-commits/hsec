import { computed, nextTick, ref, watch } from 'vue'

type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error' | undefined

export function useStableStatus(rawStatus: () => ChatStatus) {
  const forced = ref(false)

  // Gọi ngay khi gửi tin (sau sendMessage) để đảm bảo có pha 'submitted'
  function markSubmitted() {
    forced.value = true
  }

  const status = computed<ChatStatus>(() => (forced.value ? 'submitted' : rawStatus()))

  // Khi AI SDK đã thực sự streaming/xong/ lỗi → nhả khoá ở nhịp sau để 'submitted' kịp được quan sát
  watch(rawStatus, (s) => {
    if (s === 'streaming' || s === 'ready' || s === 'error') {
      nextTick(() => {
        forced.value = false
      })
    }
  })

  return { status, markSubmitted }
}
