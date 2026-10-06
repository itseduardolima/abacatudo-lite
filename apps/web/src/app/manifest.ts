import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AbacaTudo',
    short_name: 'AbacaTudo',
    description: 'Da fatura, só o que é seu.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#163300',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
