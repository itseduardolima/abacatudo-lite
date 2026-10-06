# Design System — apps/web

Referência de estilo: **Wise** (verde-musgo profundo + lima elétrico, tipografia
de display gigante e pesada, componentes em pílula) —
https://styles.refero.design/style/367c0c6e-73a7-441c-a8ff-91d139ac60dc

Isto é uma **referência de estilo, não de marca**: usamos a paleta, a forma e
a hierarquia tipográfica. **Não** usamos o nome, o logo, a fonte proprietária
(Wise Sans) nem as ilustrações (globo e moedas) — são ativos da marca Wise.

Este documento traduz o estilo em tokens de código (CSS variables + Tailwind)
e diz como os componentes os consomem. Decisões de produto por trás das telas
estão em [`../../docs/specs/06-design-system-temas.md`](../../docs/specs/06-design-system-temas.md);
aqui é o "como", dentro de `apps/web`. Mesma organização do `pdv-web`
(`../pdv-web/apps/web/docs/DESIGN_SYSTEM.md`): dois níveis de token e Tailwind
apontando para CSS variables.

## Marca: AbacaTudo e o abacate

O mascote é um abacate em pose de ioga (`brand/abacatudo-logo.svg`; o arquivo
original, intocado, está em `brand/abacatudo-mascote.svg`). O nome é um
trocadilho: _abacate_ + _tudo_. O tom calmo do mascote contrasta de propósito
com o display pesado do estilo Wise: dinheiro sem drama.

- **Lockup**: mascote à esquerda + "AbacaTudo" em Inter 900, `-0.04em`, Forest
  Ink; altura do mascote = 2,1 × a do texto. Login e tela de abertura.
- **Só sobre fundo claro** (Paper, Fog, Linen Mist). Sobre Forest Ink o
  contorno marrom `#4D2000` desaparece: em seção escura, **não** usar o
  mascote. Sobre lima o contraste é baixo: evitar.
- **Tamanho mínimo 56px de altura** com os membros; abaixo disso as linhas
  finas somem e o abacate lê como uma mancha (aceitável só em favicon).
- **Não recolorir nem reduzir** a arte; o verde-abacate e o marrom do caroço
  são só do logo e **não entram na paleta da UI** (a UI continua Forest/Lime).
- **Ícones do PWA**: `brand/icon-512.png`, `icon-192.png`,
  `apple-touch-icon.png` (180) e `icon-maskable-512.png` (mascote a 60% da
  altura, dentro da zona segura), sobre Linen Mist `#e2f6d5`.

## Desktop (1440x900, conteúdo em 1200)

Não é o celular esticado: o espaço extra vira tabela, painéis lado a lado e
teclado. Protótipo em `gastos-prototipo` (página "Desktop", 11 telas).

- **Shell**: barra superior de 72px (`AppShell`), sem sidebar. Marca à
  esquerda (mascote 54px), **duas pílulas**: a de **área** (`Cartão | Extrato`,
  ativo em **Forest**) e a de **páginas** (Início, Classificar com selo,
  Orçamento, Relatórios, Assistente; ativo em **lima**), avatar à direita.
  Na área Extrato tudo é Forest e o fundo é Fog, igual ao mobile.
- **Grade**: conteúdo em 1200px centrado (120px de margem a 1440px). Duas
  colunas assimétricas (ex.: 720 + 456, ou 392 + 784); nunca três iguais.
- **Tabela** (`.tbl`): cabeçalho 13px/600 `muted`, linhas de 52px separadas por
  hairline Fog, valores à direita em `tabular-nums`, coluna "Quem gastou" com
  `PersonChip`. Coluna final de **largura fixa**, para a barra de comparação
  ter o mesmo comprimento em todas as linhas.
- **Classificar em dois painéis**: lista das 12 compras à esquerda (com logo
  do banco), compra selecionada à direita. **Atalhos de teclado visíveis**
  (`kbd`): 1 a 4 escolhem a pessoa, `D` divide, `N` outra pessoa, `A` liga
  "sempre", `S` pula, `Enter` confirma.
- **Início** classifica direto: as compras sem dono mostram as pessoas como
  botões, sem abrir outra tela.
- **Relatórios**: "Para onde vai" e "Onde economizar" lado a lado (no celular
  são abas); Assinaturas em tabela com total por ano.
- **Assistente**: histórico de conversas à esquerda, conversa à direita.
- **Login**: painel Linen Mist com o mascote (só sobre fundo claro) + formulário.

## Logos de bancos

Nubank, Banco do Brasil e PicPay têm logo (`brand/bancos/`); as cores são das
marcas dos bancos (roxo, azul, verde) e **não entram na paleta da UI**.

- **Sempre num avatar redondo branco** (`--color-canvas`) com contorno
  `--shadow-hair`, logo a ~58% do diâmetro (PicPay a 50%: o "P" com o
  quadrado é mais largo). Não recolorir, não colocar direto sobre Fog ou Forest.
- **Tamanhos**: 48px em lista de bancos e Contas; 40px no cabeçalho da Fatura;
  28px ao lado do nome de cada fatura no Início (é o que distingue as faturas
  de relance); 24px no chip do banco em Classificar.
- **Sem logo, monograma**: Bee Vale, InfinitePay e qualquer banco novo usam
  um avatar Fog com as iniciais (`a-fog`). Servimos cópias locais dos 3 logos
  (CSP `img-src 'self'`), não imagens do Pluggy.
- São marcas de terceiros: seguir o guia de marca de cada banco e confirmar a
  licença antes de produção (`brand/bancos/README.md`).

## Duas camadas de token: primitivo → semântico

**Nunca** usar valor primitivo (hex, px) direto num componente. O componente
consome um token **semântico**, que aponta para um primitivo.

```
primitivo (Wise, fixo)  →  semântico (papel na UI)  →  componente
--color-lime-voltage: #9fe870  →  --color-primary  →  <Button variant="primary">
```

Diferente do PDV, **não há troca de tema por tenant** (um tema só). A camada
semântica continua existindo por consistência e porque é ela que torna o
modo escuro possível no futuro sem tocar em componente.

## Tokens primitivos (do estilo de referência)

### Cor

| Nome         | Valor     | Token                  | Papel                                                                 |
| ------------ | --------- | ---------------------- | --------------------------------------------------------------------- |
| Forest Ink   | `#163300` | `--color-forest-ink`   | Escuro de marca: superfícies invertidas, texto forte, ícones          |
| Lime Voltage | `#9fe870` | `--color-lime-voltage` | Fundo de ação primária e estado ativo. **Nunca texto em fundo claro** |
| Spruce       | `#054d28` | `--color-spruce`       | Verde escuro secundário: cards sobre fundo escuro                     |
| Linen Mist   | `#e2f6d5` | `--color-linen-mist`   | Verde-pálido: destaque suave, hover, badge "ok"                       |
| Signal Blue  | `#0b4c72` | `--color-signal-blue`  | Acento azul decorativo e série de gráfico                             |
| Alarm Red    | `#cb272f` | `--color-alarm-red`    | Vermelho: estado "estourou" e erro (ver adaptações)                   |
| Charcoal     | `#454745` | `--color-charcoal`     | Texto de corpo                                                        |
| Obsidian     | `#0e0f0c` | `--color-obsidian`     | Títulos de alto contraste                                             |
| Slate        | `#6a6c6a` | `--color-slate`        | Texto de apoio e rótulo (passa AA no branco)                          |
| Pebble       | `#868685` | `--color-pebble`       | **Só** borda, ícone e placeholder — nunca texto essencial             |
| Fog          | `#e8ebe6` | `--color-fog`          | Superfície de card e divisor sobre o branco                           |
| Paper        | `#ffffff` | `--color-paper`        | Fundo da página e texto sobre escuro                                  |

### Contraste medido (WCAG, calculado)

| Par                                   | Razão             | Uso permitido                                      |
| ------------------------------------- | ----------------- | -------------------------------------------------- |
| Obsidian / Charcoal / Forest em Paper | 19,2 / 9,4 / 13,9 | texto de qualquer tamanho                          |
| Forest em Lime                        | 9,5               | rótulo do botão primário                           |
| Lime em Forest                        | 9,5               | valor de destaque em seção escura                  |
| Lime em Spruce                        | 6,8               | idem                                               |
| Forest em Linen Mist                  | 12,2              | badge "ok"                                         |
| Slate em Paper                        | 5,3               | texto de apoio                                     |
| Slate em Linen Mist                   | 4,6               | texto de apoio (limite; só >= 14px)                |
| Alarm Red em Paper                    | 5,4               | texto/ícone de erro                                |
| Alarm Red em Fog                      | 4,5               | limite; preferir ícone + peso 500                  |
| Slate em Fog                          | **4,4**           | **abaixo de AA** — em Fog usar Charcoal (7,8)      |
| **Pebble em Paper**                   | **3,6**           | **não é texto**: só borda/ícone (>= 3:1)           |
| **Lime em Paper**                     | **1,5**           | **nunca** texto, ícone nem linha fina sobre branco |

> Dois pontos onde este projeto **corrige** o estilo de referência: o Pebble
> aparece lá como texto de corpo (falha AA) e o lima aparece como fundo de
> gráfico/traço sobre branco (invisível). Aqui, texto de apoio é **Slate** (e
> **Charcoal** sobre Fog), e lima é só **fundo de ação/estado ativo**.

### Tipografia

- **Corpo/UI**: **Inter** (400, 500, 600, 700), com `calt`. Carregada com
  `next/font` (auto-hospedada no build): **sem CDN em runtime**, coerente com a
  CSP `font-src 'self'` (spec 08 § 2).
- **Display**: a Wise Sans (peso 900) é proprietária. **Substituta oficial
  deste projeto: Inter 900 com `letter-spacing: -0.04em`**, `line-height: 0.85`.
  É um desvio consciente do estilo (que proíbe Inter no display) — a
  alternativa seria licenciar uma fonte, o que está fora de escopo.
- **Números**: sempre `font-variant-numeric: tabular-nums` (Inter tem `tnum`);
  valor em BRL nunca em fonte proporcional (colunas desalinhadas).

| Papel      | Peso | Tamanho (celular → desktop)        | Line-height | Tracking | Token               |
| ---------- | ---- | ---------------------------------- | ----------- | -------- | ------------------- |
| micro      | 500  | 12                                 | 1.63        | -0.003em | `--text-micro`      |
| caption    | 400  | 14                                 | 1.55        | -0.005em | `--text-caption`    |
| body-sm    | 400  | 16                                 | 1.5         | -0.006em | `--text-body-sm`    |
| body       | 400  | 18                                 | 1.5         | -0.007em | `--text-body`       |
| body-lg    | 500  | 25                                 | 1.3         | -0.009em | `--text-body-lg`    |
| subheading | 700  | 25 → 36                            | 1.25        | -0.011em | `--text-subheading` |
| heading-sm | 700  | 36 → 45                            | 1.1         | -0.011em | `--text-heading-sm` |
| heading    | 700  | 45 → 61                            | 1.1         | -0.015em | `--text-heading`    |
| display    | 900  | `clamp(44px, 14vw, 64px)` → até 89 | 0.85        | -0.04em  | `--text-display`    |

A escala de marketing do estilo (105px) **não** é usada em celular. O display
(peso 900) é reservado ao **número que importa** da tela: o "Meu" da fatura e o
valor do mês. Nunca em rótulo, lista ou título comum.

### Espaçamento e layout

- Unidade base 4px. Escala: 4, 8, 12, 16, 20, 24, 28, 32, 40, 44, 48, 56, 64.
- Largura máxima de conteúdo 1200px (desktop); **celular: gutter de 16px**.
- Padding de card 24px (celular e desktop); card escuro grande 24px no celular,
  40px no desktop. Gap entre elementos 8–12px; entre seções 64–80px (desktop).
- Alvo de toque **>= 44px** (botão: 11px + 22px de linha + 11px = 44px).

### Raio

| Elemento                           | Valor  | Token              |
| ---------------------------------- | ------ | ------------------ |
| botão, tag, segmento de nav, chip  | 9999px | `--radius-pill`    |
| card, input                        | 10px   | `--radius-card`    |
| card grande / seção escura / sheet | 28px   | `--radius-card-lg` |
| avatar/máscara circular            | 1000px | `--radius-full`    |

Nunca raio 0–4px em botão, tag ou nav. Pílula é a linguagem de forma.

### Sombra

O sistema é **plano**. Só existem:

| Nome   | Valor                                                            | Uso                           |
| ------ | ---------------------------------------------------------------- | ----------------------------- |
| `hair` | `rgba(14,15,12,0.12) 0 0 0 1px`                                  | contorno em ícone/contêiner   |
| `lg`   | `rgba(0,0,0,0.08) 0 6px 20px 0`                                  | painel elevado, menu, popover |
| `xl`   | `rgba(0,0,0,0.15) 0 10px 32px 0, rgba(0,0,0,0.04) 0 40px 40px 0` | bottom sheet e modal          |

Sem gradiente, sem blur decorativo, sem sombra em card comum (card é Fog ou tem
contorno `hair`).

## Tokens semânticos (o que o componente de fato usa)

Definidos em `src/styles/theme.css`:

```css
:root {
  /* cor — semântico → primitivo */
  --color-primary: var(--color-lime-voltage);
  --color-primary-ink: var(--color-forest-ink); /* texto sobre o primário */
  --color-ink: var(--color-obsidian); /* títulos */
  --color-text: var(--color-charcoal); /* corpo */
  --color-text-muted: var(--color-slate); /* apoio (em Fog: use --color-text) */
  --color-canvas: var(--color-paper);
  --color-surface: var(--color-fog);
  --color-surface-tint: var(--color-linen-mist);
  --color-inverse: var(--color-forest-ink); /* seção escura */
  --color-inverse-2: var(--color-spruce);
  --color-on-inverse: var(--color-paper);
  --color-on-inverse-accent: var(--color-lime-voltage);
  --color-border: var(--color-pebble); /* só borda/ícone */
  --color-border-strong: var(--color-forest-ink);
  --color-accent: var(--color-signal-blue);
  --color-danger: var(--color-alarm-red);

  /* raio */
  --radius-pill: 9999px;
  --radius-card: 10px;
  --radius-card-lg: 28px;
  --radius-full: 1000px;

  /* sombra */
  --shadow-hair: rgba(14, 15, 12, 0.12) 0 0 0 1px;
  --shadow-lg: rgba(0, 0, 0, 0.08) 0 6px 20px 0;
  --shadow-xl: rgba(0, 0, 0, 0.15) 0 10px 32px 0, rgba(0, 0, 0, 0.04) 0 40px 40px 0;

  /* tipografia */
  --font-body: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-display: var(--font-body); /* Inter 900, -0.04em (substituta da Wise Sans) */

  /* controles */
  --control-height: 44px;
}
```

**Regra**: componente nunca referencia `--color-lime-voltage` direto — sempre
`--color-primary`. E nenhum hex fora de `theme.css` (regra do `CLAUDE.md`).

## Tailwind: como os tokens chegam nas classes

Tailwind 3.4 (mesmo do `pdv-web`); `tailwind.config.ts` mapeia para as CSS
variables, nunca para o hex:

```ts
export default {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-ink': 'var(--color-primary-ink)',
        ink: 'var(--color-ink)',
        text: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        tint: 'var(--color-surface-tint)',
        inverse: 'var(--color-inverse)',
        'inverse-2': 'var(--color-inverse-2)',
        'on-inverse': 'var(--color-on-inverse)',
        'on-inverse-accent': 'var(--color-on-inverse-accent)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
        accent: 'var(--color-accent)',
        danger: 'var(--color-danger)',
      },
      borderRadius: {
        pill: 'var(--radius-pill)',
        card: 'var(--radius-card)',
        'card-lg': 'var(--radius-card-lg)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        hair: 'var(--shadow-hair)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      fontFamily: { body: 'var(--font-body)', display: 'var(--font-display)' },
    },
  },
}
```

Nunca montar nome de classe dinamicamente (`` `bg-${x}` ``): o Tailwind precisa
ver a classe literal em build.

## Mapeamento de componente (do estilo para o que existe no app)

| Componente do estilo   | Componente no código                                | Regras                                                                                               |
| ---------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Primary CTA Pill       | `<Button variant="primary">`                        | fundo `primary`, texto `primary-ink`, Inter 500 16px, 11px × 24px, sem borda nem sombra              |
| Outlined Pill          | `<Button variant="outline">`                        | fundo `canvas`, borda 1px `border-strong`, mesma medida                                              |
| Text Link Button       | `<Button variant="link">`                           | texto `border-strong` sublinhado, 500 16px                                                           |
| Segmented Tab Control  | `<SegmentedControl>`                                | contêiner pílula; ativo = fundo `primary` + texto `primary-ink`; inativo transparente; ~40px         |
| Top Navigation Bar     | `AppShell` (desktop)                                | fundo `canvas`, 64px; **Cartão \| Movimentações** como segmentos em pílula                           |
| (nav inferior)         | `BottomNav` (celular)                               | contêiner pílula, 5 segmentos, ativo = `primary`; ícone 24px + rótulo curto                          |
| Display Headline       | `<DisplayNumber>`                                   | `font-display` 900, -0.04em, lh 0.85; **só** o número principal da tela                              |
| Dark Section Card      | `<StatementCard>` (fatura) e `<MonthCard>` (início) | `inverse`, raio `card-lg`, padding 24/40; valor "Meu" em `on-inverse-accent`; texto em `on-inverse`  |
| Currency Selector Pill | `<AccountSelector>`                                 | pílula branca dentro do card escuro; avatar 24px + nome; botão "Trocar" outline                      |
| Country Grid Item      | `<Avatar>` / `<PersonChip>`                         | círculo (`full`) com iniciais; 56px em lista, 24px em chip                                           |
| Badge / Tag            | `<Badge>`, `<CategoryChip>`, `<PersonChip>`         | pílula 12px 500; `tint` + `primary-ink`, ou `inverse` + `on-inverse-accent`                          |
| Input Field            | `<Input>`                                           | raio `card` (10px), borda 1px `border`, 12px × 16px; foco: borda `border-strong`, sem anel de brilho |
| Feature Row            | `EmptyState`                                        | ícone 24px + título 700 18px + apoio 16px `muted`                                                    |
| Floating QR Badge      | **não usado**                                       | específico da Wise                                                                                   |
| (novo) Bottom Sheet    | `<Sheet>`                                           | `canvas`, raio 28px no topo, `shadow-xl`; alça de 4×40px em `border`                                 |

Pareamento de ação: **um botão preenchido (lima) + um link sublinhado**
(ex.: "Salvar" + "Cancelar"). Nunca dois preenchidos lado a lado.

### A tela Fatura, no estilo (o componente mais importante)

```
┌──────────────────────────────── inverse, 28px ─┐
│  Meu na fatura de Nubank                        │  on-inverse, 14px
│  R$ 1.150,00                                    │  DISPLAY, on-inverse-accent
│  ┌─────────────── canvas, 10px ───────────────┐ │
│  │ Fatura                       R$ 2.000,00   │ │
│  │ − Não é meu                  R$   700,00   │ │
│  │ − A classificar              R$   150,00   │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

O valor "Meu" é o único display lima da viewport. "A classificar" nunca é
escondido: aparece como linha própria, com `Badge` "resolver".

## Extrato: a área "só consulta" não usa lima

Decisão do protótipo: lima é o sinal de **gestão** (Cartão). No **Extrato**
(Pix, débito e contas) o fundo da página é **Fog**, o conteúdo fica numa folha
branca, e o estado ativo (segmento e navegação) é **Forest Ink com texto
branco**, nunca lima. Sem gráfico, sem card escuro. A regra de produto "nada
daqui entra no orçamento" fica expressa pelo clima da tela, não só por texto.
Desvio consciente do estilo de referência (lima como ativo em tabs).

## Estados de orçamento (adaptação ao produto)

O estilo diz que o vermelho não é cor de status, mas um app de orçamento
**precisa** de um estado "estourou". Adaptação (a validar no protótipo):

| Estado   | Visual                                                                             | Nunca só cor  |
| -------- | ---------------------------------------------------------------------------------- | ------------- |
| OK       | barra `border-strong`, sem selo (o silêncio é o estado normal)                     | —             |
| Atenção  | linha sob a barra: ícone ▲ + "Atenção, restam R$ X" (`ink`); barra `border-strong` | texto + ícone |
| Estourou | linha sob a barra: ícone ✕ + "Estourou, R$ X acima" (`danger`); barra `danger`     | texto + ícone |

- Barra (`EnvelopeBar`): trilha `surface`, preenchimento `border-strong`
  (escuro). **Nunca lima** como preenchimento sobre branco (1,5:1).
- Vermelho (`danger`) é usado **só** em: "Estourou", erro de campo, ação
  destrutiva. Em mais nenhum lugar.

## Gráficos

- Marcas de dado em **Forest Ink, Spruce, Signal Blue, Slate**; `danger` só
  para o que estourou. Lima só sobre fundo escuro (`inverse`) ou como
  destaque com rótulo direto — nunca como série sobre branco.
- Distinguir por mais que cor: rótulo direto na série, ordenação por valor,
  e no máximo ~5 séries + "Outros" (12 categorias não se separam por cor).
- Consultar a skill `dataviz` ao construir o primeiro gráfico (validação de
  paleta, legenda, tooltip, acessibilidade).
- `MoneyText` e eixos em `tabular-nums`; grade em `border` a 1px, sem sombra.

## Validação e feedback

Idêntico ao `pdv-web` (`§ Validação e feedback`), com as cores deste sistema:

- **Nunca toast.** Feedback ancorado ao componente que gerou a ação.
- **Erro de campo**: borda 2px `danger` + ícone no campo; mensagem **abaixo do
  campo**, exatamente o texto que a API devolveu, `danger` 500 12px. O
  primeiro campo com erro recebe foco. Sem validação antes da resposta da API.
- **Erro de regra** (ex.: `SPLIT_SUM_MISMATCH`): `InlineAlert` acima da ação,
  fundo `tint` ou `canvas` com contorno `hair`, ícone + `message` da API.
- **Sucesso**: sem banner; o próprio fluxo confirma (a linha sai da caixa
  "a classificar", a fatura recalcula).
- Botão em `loading` enquanto a API responde.

## Tema escuro

O estilo de referência define **só tema claro**. Como o app é usado à noite no
celular, o escuro é desejável, mas **não é uma inversão automática**: precisa
ser desenhado (o lima em fundo escuro funciona; o Forest Ink como fundo de
página exige novos níveis de superfície). Fica **fora do v1 visual**; a
camada semântica acima já permite adicioná-lo sem tocar em componente. Ver HU
11.2 no backlog.

## Privacidade na tela

"Ocultar valores": `MoneyText` aplica `filter: blur(8px)` e `user-select:
none` quando ativo; preferência em `localStorage` (conveniência por
dispositivo, dentro de `try/catch`). O blur é só visual — o valor continua
no DOM, então **não** é proteção de segurança.

## Do's / Don'ts

**Fazer**

- Pílula (`rounded-pill`) em todo botão, tag, chip e segmento de nav.
- Lima como **fundo** de ação primária e de estado ativo, com texto Forest Ink.
  Um elemento lima por trecho visível da tela.
- Forest Ink (não preto) como escuro de marca; seção invertida
  (`inverse`) para dar ritmo e destacar o número principal.
- Tracking negativo em tamanhos grandes; display 900 só no número principal.
- Texto de corpo em Charcoal; apoio em Slate; em Fog, Charcoal.

**Não fazer**

- Lima como cor de texto ou traço sobre fundo claro.
- Pebble como cor de texto essencial.
- Gradiente, sombra decorativa, blur decorativo, raio < 5px em controle.
- Dois botões preenchidos lado a lado; vários elementos lima juntos.
- Display 900 em título comum, rótulo ou lista.
- Cor fora desta paleta sem atualizar este documento primeiro.
- Copiar logo, nome, fonte ou ilustração da Wise.
