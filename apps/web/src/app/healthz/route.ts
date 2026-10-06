// Health do frontend (09-operacao § 1). Fica fora de /api/*, que o Caddy manda para a API.
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
}
