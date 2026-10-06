# Sprint Plan

Baseado em [`BACKLOG.md`](./BACKLOG.md). Time de 1 dev + par de IA, sprints de
**1 semana**, como no `pdv-web`. Cada sprint entrega algo **demonstrável e
testado**, nunca código pela metade.

## Definition of Ready

- Critérios de aceite claros (estão no backlog).
- Dependência de outra HU resolvida.
- Contrato (schema Zod em `packages/shared`) definido antes da tela que o
  consome.
- Para HU de integração externa (Pluggy, IA): o **client** e o formato de
  resposta real já conferidos na documentação/sandbox.

## Definition of Done

- Backend: `Service` com teste Jest cobrindo a regra (`Repository` e clients
  externos mockados); `Controller` valida DTO.
- **Toda tabela/módulo novo tem teste de isolamento com 2 Users** (spec 08 §
  1. e política RLS.
- Frontend: tela navegável de ponta a ponta contra a API real; erro de campo
  e de regra via `InlineAlert`/mensagem de campo (nunca toast, nunca texto
  de erro inventado no cliente); **nenhuma conta de dinheiro no cliente**.
- `pnpm typecheck` e `pnpm test` passam no monorepo inteiro.
- Nenhum segredo, token ou dado financeiro em log.
- Commits Conventional Commits em inglês, um por unidade lógica.

---

## Por onde começar

**Sprint 0 = fundação + spike do Pluggy + protótipo.** O spike (0.6) é uma
tarde e decide se Bee Vale/InfinitePay entram por API ou só por import —
isso muda prioridade de Sprint 6, não a arquitetura.

**Sprint 1 = Épico 1 (isolamento + auth).** Igual à lógica do `pdv-web`:
nenhuma tela funciona sem usuário autenticado e sem RLS. Fazer isolamento
depois é reescrever o banco.

**Importar antes de integrar.** O MVP útil é _importar extrato → classificar
→ ver o mês_ (só cartão), que já entrega o diferencial (separar meu x família). A API do
Pluggy entra depois (Sprint 6) sobre um domínio que já funciona.

## Ordem

| Sprint | Foco                                            | HUs                                                    | Entrega demonstrável                                                    |
| ------ | ----------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| 0      | Fundação, spike Pluggy, protótipo               | 0.1–0.7                                                | Monorepo sobe local; catálogo Pluggy documentado; protótipo validado    |
| 1      | Auth + isolamento por usuário                   | 1.1, 1.2, 1.3, 1.9                                     | Login por e-mail/senha; RLS provada com 2 Users; sessão revogável       |
| 2      | Contas, pessoas, categorias, import, lançamento | 2.1, 2.2, 2.4, 3.5, 3.1, 3.4, 5.1, 3.3 (por último)    | Importo um OFX/CSV e vejo as compras do cartão (Pix já separado)        |
| 3      | Classificação (o coração do produto)            | 4.1, 4.2, 4.4, 4.5                                     | Toda transação nasce "Meu"; corrigir pessoa em 1 toque, regras, divisão |
| 4      | Fatura só com a minha parte + Movimentações     | 5.2, 5.3, 6.1, 6.2                                     | Fatura mostra total, não é meu e "Meu"; extrato de Pix separado         |
| 5      | Orçamento e relatórios                          | 7.1, 8.6, 9.1                                          | Teto do mês, para onde vai o dinheiro                                   |
| 6      | Integração Pluggy                               | 8.1–8.5 (+ 2.3)                                        | Nubank/BB/PicPay sincronizando sozinhos; aviso de consentimento         |
| 7      | Insights e IA                                   | 9.2–9.5, 10.1, 10.2, 10.4, 10.5                        | Assinaturas, "onde economizar", resumo e sugestão de categoria por IA   |
| 8      | Segurança reforçada, convite, PWA e produção    | 1.4–1.8, 5.4, 5.5, 11.1–11.3, 12.1–12.5, 7.4–7.6, 10.3 | 2FA, convidar 1 pessoa, PWA instalável, backup/deploy/monitor no ar     |

Ajustes de escopo por sprint só via edição deste arquivo + `TODO.md`, com o
motivo registrado.

## Riscos conhecidos (acompanhar por sprint)

| Risco                                                      | Mitigação                                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Pluggy sem conector para InfinitePay/Bee Vale              | Sem impacto na gestão: são só movimentações (benefício é renda informada); import cobre se quiser ver o extrato |
| Plano gratuito do Pluggy não cobrir o 2º usuário           | Spike 0.6; 2º usuário pode usar só import                                                                       |
| Categorização ruim gera desconfiança                       | Correção em 1 toque + regras que aprendem; IA só sugere                                                         |
| Débito/Pix/benefício tratados como cartão (ou o contrário) | Escopo decidido só pelo tipo da conta, sem heurística; teste dedicado na HU 5.1                                 |
| "Meu" errado por split mal fechado                         | Invariante Fatura = Meu + Não é meu testada; soma dos splits obrigatória                                        |
| Vazamento entre usuários por query esquecida               | RLS + teste com 2 Users em todo módulo                                                                          |
| Vazamento de segredo (Pluggy, IA, chave de criptografia)   | `.env` fora do git, `deploy-check`, rotação documentada, redaction de log                                       |
| Perda do banco                                             | Backup criptografado fora da VPS + drill mensal                                                                 |
