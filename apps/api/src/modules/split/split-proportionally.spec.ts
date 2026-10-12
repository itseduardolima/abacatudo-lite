import { splitProportionally } from './split-proportionally'

describe('splitProportionally', () => {
  it('mantém a proporção quando o total é o mesmo da divisão original', () => {
    const shares = [
      { personId: 'a', amountCents: 7000 },
      { personId: 'b', amountCents: 3000 },
    ]
    expect(splitProportionally(10000, shares)).toEqual(shares)
  })

  it('escala para outro total e a soma fecha exatamente, com o resto de centavos nos primeiros', () => {
    const result = splitProportionally(10745, [
      { personId: 'a', amountCents: 5000 },
      { personId: 'b', amountCents: 5000 },
    ])
    expect(result).toEqual([
      { personId: 'a', amountCents: 5373 },
      { personId: 'b', amountCents: 5372 },
    ])
  })

  it('a soma sempre fecha com o total, qualquer proporção', () => {
    const shares = [
      { personId: 'a', amountCents: 3333 },
      { personId: 'b', amountCents: 3333 },
      { personId: 'c', amountCents: 3334 },
    ]
    for (const total of [1, 2, 99, 10744, 34990, 22991]) {
      expect(splitProportionally(total, shares).reduce((sum, part) => sum + part.amountCents, 0)).toBe(total)
    }
  })
})
