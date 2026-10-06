# Design System e Temas

**Estilo definido:** referência **Wise** — verde-musgo profundo (Forest Ink
`#163300`) com lima elétrico (`#9fe870`) só como ação e estado ativo, números
em display pesado, tudo em pílula. Tokens, componentes, contrastes e
adaptações estão em [`apps/web/docs/DESIGN_SYSTEM.md`](../../apps/web/docs/DESIGN_SYSTEM.md)
(fonte: https://styles.refero.design/style/367c0c6e-73a7-441c-a8ff-91d139ac60dc).
É referência de **estilo, não de marca**: sem nome, logo, fonte Wise Sans nem
ilustrações da Wise.

O protótipo das telas abaixo (HU 0.7) **segue esse estilo**: 23 telas mobile em 7
fluxos, no repositório irmão `../gastos-prototipo` e publicado em
https://claude.ai/artifact/CAyHffJCJ5wDrutNeEai1k. É referência visual, não código de produção.

## Decisões já tomadas

- **Mobile-first, PWA instalável**, alvo 390–430 px de largura; desktop é
  expansão.
- **Sem white-label**: um tema só, definido em `styles/theme.css` como CSS
  variables (cor, tipografia, espaçamento, raio, sombra). Nenhuma cor
  hardcoded em componente — usar sempre o token semântico
  (`--color-primary`, nunca `--color-lime-voltage`).
- **Tema claro no v1.** O estilo de referência só define o claro; o escuro
  precisa ser desenhado (não é inversão automática) e fica para depois — a
  camada de token semântico já permite. Ver `DESIGN_SYSTEM.md` § Tema escuro.
- **Números são o protagonista**: tipografia com `tabular-nums` para todo
  valor monetário, hierarquia clara (total do mês > envelopes > lista).
- **Gráficos** seguem a skill `dataviz` e a paleta do `DESIGN_SYSTEM.md`
  (Forest Ink/Spruce/Signal Blue/Slate; lima nunca como série sobre branco).
  Estado de orçamento nunca só por cor: sempre ícone/texto junto (`OK`,
  `Atenção`, `Estourou`).
- **Feedback de erro**: mensagem inline (`InlineAlert`/mensagem de campo),
  nunca toast — mesma regra do `pdv-web`. A mensagem é sempre a que a API
  devolveu.
- **Estados vazios e de carregamento** desenhados desde o início: "nenhum
  banco conectado", "sincronizando…", "sem gasto neste mês", "última
  atualização há 2 dias" (dado velho nunca é mostrado como atual).
- **Privacidade na tela**: opção "ocultar valores" (borra os números com um
  toque) — o app é usado em lugar público. Preferência guardada localmente
  (`localStorage`, é conveniência por dispositivo).

## Telas previstas (para o protótipo)

Só a área de **Cartão** (gestão); não há extrato nem movimentações.

**Cartão (gestão)**

1. **Início**: card escuro (`inverse`) com o total "meu" em lima vs. teto do mês, ritmo, faixa "R$ X a classificar",
   avisos (consentimento, orçamento), últimas compras.
2. **A classificar**: fila de compras, 1 toque por pessoa, "sempre para este
   estabelecimento", lote.
3. **Compras**: lista de compras no cartão de crédito com filtros (cartão, pessoa,
   categoria, mês), busca, detalhe em bottom sheet (dividir, categoria, nota).
4. **Fatura**: card escuro com o **"Meu"** em display lima e, num card branco
   interno, total do banco, "− Não é meu" e "− A classificar"; lista das compras com o dono de cada uma. (Pessoa é só um
   filtro/rótulo, sem saldo; o botão "Enviar contas" gera a mensagem manual de
   cobrança por pessoa.)
5. **Orçamento**: renda (informada), fixos, meta de poupança,
   envelopes, ritmo.
6. **Relatórios**: por categoria, estabelecimento, comparação mensal,
   assinaturas, parcelas futuras, "onde economizar" — só cartão.
7. **Assistente (IA)**: chat + resumo do mês — só cartão.

**Comum**

9. **Contas e conexões**: bancos conectados, status, validade do
   consentimento, importar OFX/CSV, lançamento manual.
10. **Configurações**: segurança (2FA, sessões), convite, exportar, excluir
    conta, tema, ocultar valores.
