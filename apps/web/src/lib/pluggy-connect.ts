const WIDGET_SCRIPT_URL = 'https://cdn.pluggy.ai/pluggy-connect/v2.8.2/pluggy-connect.js'
const MEU_PLUGGY_CONNECTOR_ID = 200

interface PluggyConnectOptions {
  connectToken: string
  connectorIds: number[]
  includeSandbox: boolean
  onSuccess: (data: { item: { id: string } }) => void
  onError: (error: unknown) => void
  onClose: () => void
}

declare global {
  interface Window {
    PluggyConnect?: new (options: PluggyConnectOptions) => { init: () => Promise<void> | void }
  }
}

export class PluggyConnectError extends Error {
  constructor() {
    super('Não foi possível abrir a conexão com o banco agora. Tente de novo.')
    this.name = 'PluggyConnectError'
  }
}

let scriptPromise: Promise<void> | null = null

function loadWidgetScript(): Promise<void> {
  if (window.PluggyConnect) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = WIDGET_SCRIPT_URL
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      script.remove()
      reject(new PluggyConnectError())
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export async function openPluggyConnect(connectToken: string): Promise<string | null> {
  await loadWidgetScript()
  const PluggyConnect = window.PluggyConnect
  if (!PluggyConnect) throw new PluggyConnectError()

  return new Promise<string | null>((resolve, reject) => {
    const widget = new PluggyConnect({
      connectToken,
      connectorIds: [MEU_PLUGGY_CONNECTOR_ID],
      includeSandbox: false,
      onSuccess: ({ item }) => resolve(item.id),
      onError: () => reject(new PluggyConnectError()),
      onClose: () => resolve(null),
    })
    Promise.resolve(widget.init()).catch(() => reject(new PluggyConnectError()))
  })
}
