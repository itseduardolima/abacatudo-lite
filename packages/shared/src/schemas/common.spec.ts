import { apiErrorSchema, centsSchema, healthSchema } from './common'

describe('common schemas', () => {
  it('centsSchema aceita inteiro e rejeita decimal', () => {
    expect(centsSchema.safeParse(1150_00).success).toBe(true)
    expect(centsSchema.safeParse(-500).success).toBe(true)
    expect(centsSchema.safeParse(10.5).success).toBe(false)
  })

  it('apiErrorSchema exige statusCode, code e message', () => {
    expect(apiErrorSchema.safeParse({ statusCode: 404, code: 'NOT_FOUND', message: 'Não achei.' }).success).toBe(true)
    expect(apiErrorSchema.safeParse({ code: 'X' }).success).toBe(false)
  })

  it('healthSchema só aceita status ok', () => {
    expect(healthSchema.safeParse({ status: 'ok' }).success).toBe(true)
    expect(healthSchema.safeParse({ status: 'down' }).success).toBe(false)
  })
})
