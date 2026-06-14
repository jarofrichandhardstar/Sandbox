const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url
  return `${apiBase}${url}`
}
