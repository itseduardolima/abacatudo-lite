import { HealthController } from './health.controller'
import type { HealthService } from './health.service'

describe('HealthController', () => {
  it('devolve { status: "ok" } quando o banco responde', async () => {
    const service = { checkDatabase: jest.fn().mockResolvedValue(undefined) } as unknown as HealthService
    await expect(new HealthController(service).check()).resolves.toEqual({ status: 'ok' })
  })

  it('não devolve ok quando o banco falha', async () => {
    const service = { checkDatabase: jest.fn().mockRejectedValue(new Error('down')) } as unknown as HealthService
    await expect(new HealthController(service).check()).rejects.toThrow('down')
  })
})
