import { previewSplitInputSchema, splitPreviewSchema, updateTransactionSplitInputSchema } from './split'

const PERSON_1 = '11111111-1111-1111-1111-111111111111'
const PERSON_2 = '22222222-2222-2222-2222-222222222222'

describe('updateTransactionSplitInputSchema', () => {
  it('aceita 2 ou mais splits', () => {
    const result = updateTransactionSplitInputSchema.safeParse({
      splits: [
        { personId: PERSON_1, amountCents: 500 },
        { personId: PERSON_2, amountCents: 500 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejeita menos de 2 splits (não é divisão)', () => {
    const result = updateTransactionSplitInputSchema.safeParse({ splits: [{ personId: PERSON_1, amountCents: 1000 }] })
    expect(result.success).toBe(false)
  })

  it('rejeita valor zero ou negativo', () => {
    expect(
      updateTransactionSplitInputSchema.safeParse({
        splits: [
          { personId: PERSON_1, amountCents: 0 },
          { personId: PERSON_2, amountCents: 1000 },
        ],
      }).success,
    ).toBe(false)
  })
})

describe('previewSplitInputSchema e splitPreviewSchema', () => {
  it('preview pede ao menos 2 pessoas', () => {
    expect(previewSplitInputSchema.safeParse({ personIds: [PERSON_1] }).success).toBe(false)
    expect(previewSplitInputSchema.safeParse({ personIds: [PERSON_1, PERSON_2] }).success).toBe(true)
  })

  it('splitPreviewSchema aceita a forma de resposta', () => {
    const result = splitPreviewSchema.safeParse({
      splits: [
        { personId: PERSON_1, amountCents: 500 },
        { personId: PERSON_2, amountCents: 500 },
      ],
    })
    expect(result.success).toBe(true)
  })
})
