const WHATSAPP_URL_LIMIT = 2000

export function buildWhatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function isWhatsappUrlTooLong(text: string): boolean {
  return buildWhatsappUrl(text).length > WHATSAPP_URL_LIMIT
}
