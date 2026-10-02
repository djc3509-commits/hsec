import MarkdownIt from 'markdown-it'

// Render markdown AN TOÀN cho tin nhắn AI:
// - html: false  → không cho HTML thô (chống XSS)
// - linkify      → tự nhận link
// - breaks       → xuống dòng = <br>
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

export function renderMarkdown(text: string): string {
  return md.render(text || '')
}
