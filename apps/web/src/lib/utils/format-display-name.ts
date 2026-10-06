// O Pluggy manda o nome do estabelecimento em CAIXA ALTA ("PRIME VIDEO E COMERCIO LTDA"). Só converte
// quando vem inteiro em maiúsculas; nome já em caixa mista (categoria, pessoa) passa como está.
export function formatDisplayName(name: string): string {
  if (name !== name.toUpperCase()) return name
  return name.toLowerCase().replace(/(^|[\s*/.-])(\p{L})/gu, (_, separator: string, letter: string) => {
    return `${separator}${letter.toUpperCase()}`
  })
}
