import { CONFIDENCE_THRESHOLD, isConfidentEnough, parseAiCategorySuggestions } from './category-suggestion.mapper'

const VALID_INDEXES = new Set([0, 1])
const VALID_CATEGORY_IDS = new Set(['cat-1', 'cat-2'])

describe('parseAiCategorySuggestions', () => {
  it('valida um array bem formado', () => {
    const text = JSON.stringify([
      { index: 0, categoryId: 'cat-1', confidence: 90 },
      { index: 1, categoryId: 'cat-2', confidence: 40 },
    ])

    expect(parseAiCategorySuggestions(text, VALID_INDEXES, VALID_CATEGORY_IDS)).toEqual([
      { index: 0, categoryId: 'cat-1', confidence: 90 },
      { index: 1, categoryId: 'cat-2', confidence: 40 },
    ])
  })

  it('JSON inválido vira lista vazia', () => {
    expect(parseAiCategorySuggestions('não é json', VALID_INDEXES, VALID_CATEGORY_IDS)).toEqual([])
  })

  it('aceita o array embrulhado em bloco de código (```json ... ```), comum em modelo raciocinante', () => {
    const text = '```json\n[{"index": 0, "categoryId": "cat-1", "confidence": 90}]\n```'
    expect(parseAiCategorySuggestions(text, VALID_INDEXES, VALID_CATEGORY_IDS)).toEqual([
      { index: 0, categoryId: 'cat-1', confidence: 90 },
    ])
  })

  it('não é um array vira lista vazia', () => {
    expect(parseAiCategorySuggestions(JSON.stringify({ index: 0 }), VALID_INDEXES, VALID_CATEGORY_IDS)).toEqual([])
  })

  it('descarta item com categoria que não existe', () => {
    const text = JSON.stringify([{ index: 0, categoryId: 'cat-inexistente', confidence: 90 }])
    expect(parseAiCategorySuggestions(text, VALID_INDEXES, VALID_CATEGORY_IDS)).toEqual([])
  })

  it('descarta item com index fora do lote pedido', () => {
    const text = JSON.stringify([{ index: 99, categoryId: 'cat-1', confidence: 90 }])
    expect(parseAiCategorySuggestions(text, VALID_INDEXES, VALID_CATEGORY_IDS)).toEqual([])
  })

  it('descarta item com confiança fora de 0-100', () => {
    const text = JSON.stringify([{ index: 0, categoryId: 'cat-1', confidence: 150 }])
    expect(parseAiCategorySuggestions(text, VALID_INDEXES, VALID_CATEGORY_IDS)).toEqual([])
  })

  it('descarta item com formato errado (campo faltando)', () => {
    const text = JSON.stringify([{ index: 0, categoryId: 'cat-1' }])
    expect(parseAiCategorySuggestions(text, VALID_INDEXES, VALID_CATEGORY_IDS)).toEqual([])
  })

  it('mantém só a primeira ocorrência de um index duplicado', () => {
    const text = JSON.stringify([
      { index: 0, categoryId: 'cat-1', confidence: 90 },
      { index: 0, categoryId: 'cat-2', confidence: 50 },
    ])
    expect(parseAiCategorySuggestions(text, VALID_INDEXES, VALID_CATEGORY_IDS)).toEqual([
      { index: 0, categoryId: 'cat-1', confidence: 90 },
    ])
  })
})

describe('isConfidentEnough', () => {
  it('usa o limiar de confiança', () => {
    expect(isConfidentEnough(CONFIDENCE_THRESHOLD)).toBe(true)
    expect(isConfidentEnough(CONFIDENCE_THRESHOLD - 1)).toBe(false)
  })
})
