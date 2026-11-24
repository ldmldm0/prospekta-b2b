import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

/**
 * Middleware que reenvía `/api/n8n/<endpoint>` desde el mismo servidor Vite
 * hacia `https://b2b-n8n.c4adol.easypanel.host/webhook/<endpoint>`,
 * garantizando que las peticiones siempre lleguen a n8n incluso desde iframes
 * de vista previa con políticas CORS/CSP estrictas o bloqueadores de navegador.
 */
function n8nBridgePlugin() {
  const N8N_TARGET_BASE = 'https://b2b-n8n.c4adol.easypanel.host/webhook'

  const handler = async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/api/n8n/')) return next()

    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
      res.end()
      return
    }

    const endpoint = req.url.replace(/^\/api\/n8n\//, '').split('?')[0]
    const targetUrl = `${N8N_TARGET_BASE}/${endpoint}`

    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', async () => {
      const bodyStr = Buffer.concat(chunks).toString('utf-8') || '{}'
      try {
        const upstream = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: bodyStr,
        })
        const text = await upstream.text()
        res.statusCode = upstream.status
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.end(text)
      } catch (err) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ ok: false, mensaje: err?.message || 'Error de puente hacia n8n' }))
      }
    })
  }

  return {
    name: 'prospekta-n8n-bridge',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss(), n8nBridgePlugin()],
})
