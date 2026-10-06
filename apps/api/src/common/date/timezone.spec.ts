import {
  benefitPeriodRange,
  lastClosingCutoff,
  dateKey,
  dayFromDateString,
  monthKey,
  monthRange,
  shiftMonthKey,
} from './timezone'

describe('monthKey / dateKey', () => {
  it('compra às 23h30 do dia 31 (horário de Manaus) não cai no mês seguinte por fuso', () => {
    // 2026-10-01T03:30:00Z = 2026-09-30T23:30:00 em Manaus (UTC-4).
    const purchaseAt = new Date('2026-10-01T03:30:00.000Z')
    expect(monthKey(purchaseAt)).toBe('2026-09')
    expect(dateKey(purchaseAt)).toBe('2026-09-30')
  })

  it('um instante já depois da virada UTC do mês, mas ainda de madrugada em Manaus', () => {
    expect(monthKey(new Date('2026-10-01T03:59:59.999Z'))).toBe('2026-09')
  })

  it('logo depois da meia-noite em Manaus já vira o mês seguinte', () => {
    // 2026-10-01T04:00:00.000Z = 2026-10-01T00:00:00 em Manaus.
    expect(monthKey(new Date('2026-10-01T04:00:00.000Z'))).toBe('2026-10')
    expect(dateKey(new Date('2026-10-01T04:00:00.000Z'))).toBe('2026-10-01')
  })

  it('meio-dia UTC de um dia comum não muda de mês', () => {
    expect(monthKey(new Date('2026-09-15T12:00:00.000Z'))).toBe('2026-09')
  })
})

describe('monthRange', () => {
  it('o início do mês é meia-noite em Manaus, em UTC', () => {
    const { start } = monthRange('2026-09')
    expect(start.toISOString()).toBe('2026-09-01T04:00:00.000Z')
  })

  it('o fim é exclusivo: o primeiro instante do mês seguinte', () => {
    const { end } = monthRange('2026-09')
    expect(end.toISOString()).toBe('2026-10-01T04:00:00.000Z')
  })

  it('dezembro vira janeiro do ano seguinte corretamente', () => {
    const { end } = monthRange('2026-12')
    expect(end.toISOString()).toBe('2027-01-01T04:00:00.000Z')
  })

  it('inclui a compra das 23h30 do dia 31 e exclui o instante exato da virada', () => {
    const { start, end } = monthRange('2026-09')
    const lateOnThe30th = new Date('2026-10-01T03:30:00.000Z')
    expect(lateOnThe30th >= start && lateOnThe30th < end).toBe(true)
    expect(end < new Date('2026-10-01T04:00:00.001Z')).toBe(true)
  })

  it('rejeita uma chave de mês em formato inválido', () => {
    expect(() => monthRange('2026-9')).toThrow('monthKey inválido')
    expect(() => monthRange('2026-13')).toThrow('monthKey inválido')
    expect(() => monthRange('lixo')).toThrow('monthKey inválido')
  })
})

describe('shiftMonthKey', () => {
  it('desloca pra trás dentro do mesmo ano', () => {
    expect(shiftMonthKey('2026-09', -1)).toBe('2026-08')
    expect(shiftMonthKey('2026-09', -3)).toBe('2026-06')
  })

  it('vira o ano ao cruzar janeiro', () => {
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12')
    expect(shiftMonthKey('2026-02', -3)).toBe('2025-11')
  })

  it('desloca pra frente', () => {
    expect(shiftMonthKey('2026-11', 2)).toBe('2027-01')
  })

  it('delta zero devolve o mesmo mês', () => {
    expect(shiftMonthKey('2026-09', 0)).toBe('2026-09')
  })

  it('rejeita uma chave de mês em formato inválido', () => {
    expect(() => shiftMonthKey('2026-9', -1)).toThrow('monthKey inválido')
  })
})

describe('dayFromDateString', () => {
  it('data pura (AAAA-MM-DD) vira meio-dia UTC, sem cruzar dia em America/Manaus', () => {
    const result = dayFromDateString('2026-09-21')
    expect(result.toISOString()).toBe('2026-09-21T12:00:00.000Z')
  })

  it('timestamp completo é preservado', () => {
    const result = dayFromDateString('2026-09-21T23:10:00.000Z')
    expect(result.toISOString()).toBe('2026-09-21T23:10:00.000Z')
  })
})

describe('lastClosingCutoff', () => {
  it('no dia do fechamento, a fatura aberta já começa nesse dia (meia-noite de Brasília)', () => {
    expect(lastClosingCutoff(2, new Date('2026-10-02T18:33:00.000Z')).toISOString()).toBe('2026-10-02T03:00:00.000Z')
  })

  it('antes do fechamento do mês, vale o fechamento do mês anterior', () => {
    expect(lastClosingCutoff(20, new Date('2026-10-02T18:33:00.000Z')).toISOString()).toBe('2026-09-20T03:00:00.000Z')
  })

  it('em janeiro, volta pra dezembro; dia 31 em mês curto cai no último dia', () => {
    expect(lastClosingCutoff(20, new Date('2026-01-05T15:00:00.000Z')).toISOString()).toBe('2025-12-20T03:00:00.000Z')
    expect(lastClosingCutoff(31, new Date('2026-03-01T15:00:00.000Z')).toISOString()).toBe('2026-02-28T03:00:00.000Z')
  })
})

describe('benefitPeriodRange', () => {
  it('outubro vai de 30/09 (inclusive) a 30/10 (exclusive), em Manaus', () => {
    const { start, end } = benefitPeriodRange('2026-10')
    expect(start.toISOString()).toBe('2026-09-30T04:00:00.000Z')
    expect(end.toISOString()).toBe('2026-10-30T04:00:00.000Z')
  })

  it('janeiro começa em 30/12; março começa no último dia de fevereiro', () => {
    expect(benefitPeriodRange('2026-01').start.toISOString()).toBe('2025-12-30T04:00:00.000Z')
    expect(benefitPeriodRange('2026-03').start.toISOString()).toBe('2026-02-28T04:00:00.000Z')
  })
})
