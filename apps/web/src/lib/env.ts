// NEXT_PUBLIC_* é inlinado no bundle do browser em build; API_INTERNAL_URL só existe no servidor.
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '/api',
  apiInternalUrl: process.env.API_INTERNAL_URL ?? 'http://localhost:3001',
}
