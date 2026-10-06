import { splitEqually } from './split-equally'

describe('splitEqually', () => {
  it('divide certinho quando fecha sem resto', () => {
    expect(splitEqually(1000, ['a', 'b'])).toEqual([
      { personId: 'a', amountCents: 500 },
      { personId: 'b', amountCents: 500 },
    ])
  })

  it('resto de centavos vai pros primeiros, determinístico', () => {
    expect(splitEqually(1000, ['a', 'b', 'c'])).toEqual([
      { personId: 'a', amountCents: 334 },
      { personId: 'b', amountCents: 333 },
      { personId: 'c', amountCents: 333 },
    ])
  })

  it('soma sempre fecha com o total, qualquer resto', () => {
    for (let total = 1; total <= 20; total++) {
      for (let people = 2; people <= 5; people++) {
        const ids = Array.from({ length: people }, (_, i) => `p${i}`)
        const splits = splitEqually(total, ids)
        expect(splits.reduce((sum, s) => sum + s.amountCents, 0)).toBe(total)
      }
    }
  })
})
