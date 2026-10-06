# Componentização e Reuso

Mesmo princípio do `pdv-web`: **um componente por conceito, responsivo — não
um componente por breakpoint.** O que muda entre celular e desktop é o shell
(bottom-nav vs. sidebar) e a densidade, resolvidos com Tailwind (`sm:`/`md:`/
`lg:`), nunca com detecção de device em JS.

Aqui o **celular é o alvo principal** (é onde o dono classifica gasto no dia
a dia): desenhar mobile primeiro, desktop é a versão com mais espaço para
relatório.

## Três camadas

1. **`components/ui/`** — primitivos sem conhecimento de domínio: `Button`,
   `Input`, `SegmentedControl`, `Badge`, `Sheet` (bottom sheet no celular,
   modal no desktop), `Toggle`, `Avatar`, `InlineAlert`. Mapeamento para o
   estilo em `apps/web/docs/DESIGN_SYSTEM.md`. Sobre Radix UI. Só tokens de tema (06),
   nunca cor hardcoded.
2. **`components/finance/`** — domínio, reutiliza `ui/`: `MoneyText`,
   `TransactionRow`, `PersonChip`, `CategoryChip`, `EnvelopeBar`,
   `PaceIndicator`, `SplitEditor`, `InboxCard`, `AccountBadge`,
   `ConsentBanner`.
3. **`components/layout/`** — `AppShell` (barra superior no desktop, sem sidebar), `BottomNav`, `PageHeader`.

Um componente de `finance/` nunca sabe em que tamanho de tela está.

## Componentes que carregam regra de UX importante

- **`MoneyText`**: única forma de mostrar dinheiro. Recebe centavos, formata
  em BRL (`format-money.ts`), cor por sinal só com reforço não-cromático
  (ícone/sinal), tabular-nums. Nunca `toFixed` solto em componente.
- **`InboxCard`** (classificar): a interação mais frequente do produto.
  Precisa funcionar com **um toque** para o caso comum (`Meu` / pessoa
  frequente) e oferecer "sempre para este estabelecimento" sem abrir outra
  tela. Ações em zona do polegar. Lote (multi-seleção) reutiliza os mesmos
  botões.
- **`SplitEditor`**: mostra a soma restante em tempo real **vinda da API**
  (não calcula: cada mudança consulta o preview do backend) e só habilita
  salvar quando a API diz que fecha. Nenhuma matemática de rateio no
  cliente.
- **`EnvelopeBar`/`PaceIndicator`**: recebem percentual e estado (`OK`,
  `ATTENTION`, `OVER`) já calculados pela API; o componente só desenha.
  Estado nunca só por cor.
- **`ConsentBanner`**: aviso de consentimento vencendo/erro de sync com ação
  "reconectar".

## Hooks

Igual ao `pdv-web`: hook de página (colocado, orquestra), hook de dado
(`hooks/queries/`, TanStack Query), hook compartilhado (`hooks/`). Ver
`04-padroes-codigo.md`.

## Testes de componente

Cypress Component Testing em `components/ui` e `components/finance`: testar
**comportamento** (o que emite, o que exibe dado o input), não aparência.
`MoneyText` tem teste de formatação (negativos, zero, milhar, arredondamento
de exibição); `InboxCard` testa o fluxo de 1 toque e o de "sempre".
