import { NextResponse, type NextRequest } from 'next/server'

// Mesmo nome de cookie do AuthController (apps/api/src/common/types/request.ts). httpOnly não impede
// leitura aqui — o middleware roda no servidor, só o JS do browser é bloqueado.
const SESSION_COOKIE = '__Host-gastos_session'
const PUBLIC_ROUTES = new Set(['/login', '/forgot-password', '/reset-password', '/robots.txt'])

// CSP com nonce por requisição (08-seguranca § 2): script só 'self' + nonce, sem 'unsafe-inline' em script.
// 'unsafe-eval' só em desenvolvimento (o HMR do Next precisa). O widget Pluggy Connect (Sprint 6) entra
// aqui, só na tela de conectar banco. style-src precisa de 'unsafe-inline' (style props do React/Next).
export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID())
  const isDev = process.env.NODE_ENV === 'development'
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    'frame-src https://*.pluggy.ai',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')

  // Redirect de UX só pela AUSÊNCIA do cookie, nunca pela presença (nunca valida a sessão aqui — isso é a
  // API, via 401). Um cookie presente mas inválido (revogado, expirado) não pode virar "está logado" aqui:
  // isso criava um loop /login -> / -> /login (a home via 401 e mandava pro login, o middleware via o
  // cookie velho e mandava de volta pra home) — visto ao vivo. Quem redireciona pra fora do /login quando
  // já autenticado é a própria página (use-login-page.ts), depois de confirmar com /auth/me de verdade.
  // /api/* e /healthz nunca são redirecionados: o rewrite de /api precisa passar batido pra sessão
  // funcionar, e o uptime check não pode virar 307.
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/api') && pathname !== '/healthz') {
    const hasSession = request.cookies.has(SESSION_COOKIE)
    const isPublicRoute = PUBLIC_ROUTES.has(pathname)
    if (!hasSession && !isPublicRoute) return NextResponse.redirect(new URL('/login', request.url))
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('content-security-policy', csp)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('content-security-policy', csp)
  return response
}

export const config = {
  matcher: [
    {
      source:
        '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|icons/|sw.js|manifest.webmanifest).*)',
    },
  ],
}
