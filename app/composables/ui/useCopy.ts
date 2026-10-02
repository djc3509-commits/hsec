export function useCopy() {
  const toast = useToast()
  const copyValue = ref<number | string | null>(null)

  const copy = async (
    text: string | number,
    id?: number | string
  ) => {
    try {
      if (!text) return

      await navigator.clipboard.writeText(text.toString())

      if (id !== undefined) {
        copyValue.value = id

        setTimeout(() => {
          if (copyValue.value === id) {
            copyValue.value = null
          }
        }, 1000)
      }

      toast.add({
        title: 'Copied!',
        description: `Đã copy: ${text}`,
        color: 'success',
        icon: 'i-lucide-check',
        duration: 3000
      })
    } catch {
      // Clipboard bị chặn (không HTTPS / thiếu quyền) → bỏ qua im lặng, không có gì để hoàn tác
    }
  }

  return {
    copy,
    copyValue
  }
}
