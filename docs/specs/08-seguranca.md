# Segurança

Mesma estrutura e o mesmo padrão do `pdv-web` (`../pdv-web/docs/specs/08-seguranca.md`),
adaptados a este sistema: **multiusuário com dado financeiro pessoal**,
integração com bancos (Pluggy), IA, self-hosted numa VPS. Cada item diz
_onde_ no código se aplica. Onde este projeto é mais exigente que o PDV, o
motivo está explícito: aqui um vazamento entrega extrato bancário.

## 1. Vazamento de dado entre usuários (o maior risco)

Um User nunca pode ver dado de outro. Duas camadas, nunca só uma (ver
`01-arquitetura.md`):

- **Camada de aplicação**: todo método de `Repository` recebe `userId`
  obrigatório (nunca opcional, nunca "se não vier, busca tudo"), vindo do
  contexto da request. Nenhum `findMany` sem filtro de `userId` — revisar
  isso em code review é mais importante que revisar estilo.
- **Camada de banco (RLS)**: policies `user_isolation` (`USING` + `WITH
CHECK`) com `FORCE ROW LEVEL SECURITY` em toda tabela de domínio
  (`Account`, `Transaction`, `Person`, `Category`, `Rule`, `Budget*`,
  `PluggyItem`...; tabelas filhas via
  `EXISTS` no pai). A extensão do Prisma
  (`apps/api/src/prisma/prisma.client.ts`) roda toda operação numa transação
  com `set_config('app.user_id', <user do request>, true)`. Sem `userId` no
  contexto, as tabelas não devolvem nem aceitam nenhuma linha.
- **Condições para valer**: a API conecta como usuário **sem superusuário e
  sem BYPASSRLS** (`infra/postgres/init-app-role.sh`); scripts fora de
  request (seed, jobs) setam o usuário explicitamente. Prova manual (psql
  como o usuário da API): sem `app.user_id` → 0 linhas; com o User A → só
  linhas de A; `INSERT` com `userId` de outro → "violates row-level security
  policy".
- **Jobs em background** (sync, insights) rodam **um usuário por vez** com
  `userStorage.run({ userId }, ...)`; o `await` da query fica **dentro** do
  callback (devolver a `PrismaPromise` sem awaitar perde o contexto do
  `AsyncLocalStorage` — pegadinha real já documentada no `pdv-web`).
- **Tabelas de autenticação — a exceção à RLS**: `User` e `Session`
  (implementadas na Sprint 1) **não têm RLS**. `PasswordReset` entra com a
  mesma exceção quando a HU 1.5 (redefinir senha) for construída. `Invite`
  não existe mais: convidar outra pessoa saiu do escopo (decisão de
  2026-09-21, uso individual). Motivo da exceção: são consultadas _antes_ de
  haver contexto de usuário (achar o User por e-mail no login; achar a
  `Session` pelo `tokenHash` do cookie). Com RLS por `app.user_id` essas
  consultas voltariam sempre vazias — é um círculo: a sessão é o que revela
  quem é o usuário. Como aqui a RLS não protege, o **filtro na camada de
  aplicação é a única barreira**, então:
  - só o `AuthRepository` toca nessas tabelas; nenhum outro módulo as importa
    (regra de lint `no-restricted-imports`/`no-restricted-syntax` no
    `apps/api`);
  - toda busca é por valor exato (`email`, `tokenHash`, `id`), **nunca
    listagem**; `tokenHash`/`passwordHash` nunca saem em resposta;
  - "listar/encerrar minhas sessões" filtra **sempre** por `userId` da
    sessão atual, e encerrar a sessão de outro User responde `404`;
  - a `Session` é resolvida por um `SessionMiddleware` (não pelo `AuthGuard`):
    um Guard não consegue estabelecer o contexto do `AsyncLocalStorage` para
    o que roda depois dele (`canActivate()` já retornou quando o handler
    começa) — só uma Middleware, que envolve o `next()` de dentro do
    `.run()`. O `AuthGuard` só confere se o `userId` já foi resolvido e
    recusa a rota (falha fechada) se não; depois disso **todas as demais
    tabelas** seguem sob RLS normalmente;
  - o teste de isolamento com 2 Users cobre essas tabelas explicitamente
    (não basta a RLS, que aqui não existe).
- **Ferramentas da IA e endpoints de leitura nunca aceitam `userId` do
  cliente** — vem sempre da sessão (`10-ia.md`).
- **Teste obrigatório**: para todo módulo novo, um teste que cria dado em
  dois Users e prova que a query de um nunca retorna o do outro. É
  Definition of Done (`docs/scrum/SPRINTS.md`).

## 2. XSS

- Sem `dangerouslySetInnerHTML` em lugar nenhum. Texto de estabelecimento,
  nome de Person, nota e **saída da IA** são tratados como texto puro
  (estabelecimentos e a IA são controlados por terceiros).
- Markdown na resposta do chat (se usado): renderizador sem HTML bruto, sem
  imagens remotas automáticas, links com `rel="noopener noreferrer"`.
- **CSP** restringindo `script-src` a `'self'` (com nonce onde o Next exigir)
  e `connect-src`/`frame-src` à origem própria mais o domínio do widget
  Pluggy Connect. O Pluggy Connect é o **único** script/iframe de terceiro
  permitido, carregado só na tela de conectar banco.
- Cookie de sessão `httpOnly` (ver § 4).

## 3. CSRF

- Sessão em cookie enviado automaticamente → vetor de CSRF se não mitigado.
- `SameSite=Lax` (ou `Strict` se não quebrar o fluxo de link de convite/
  redefinir senha — testar); mutações exigem `Content-Type: application/json`.
- **Sem CORS**: web e API na mesma origem (`01-arquitetura.md`); `CORS_ORIGIN`
  não existe. Se algum dia precisar de CORS, nunca `*` com credenciais.
- Verificação de `Origin`/`Host` em toda mutação (defesa em profundidade).

## 4. Autenticação

Aqui é senha, não PIN — mas a conta é o cofre de dado financeiro, então o
padrão é mais alto que o do PDV (que aceitou explicitamente "sem 2FA"):

- **argon2id** para senha (nunca hash rápido). Senha mínima de 12 caracteres,
  checada contra lista de senhas comuns/vazadas.
- **Rate limit** de login por e-mail **e** por IP (5 / 15 min), com
  `@nestjs/throttler`; mensagem **genérica** ("E-mail ou senha incorretos") —
  nunca diferenciar "e-mail não existe" de "senha errada"; tempo de resposta
  equalizado (hashear mesmo se o usuário não existir).
- **2FA TOTP**: segredo guardado **criptografado** (AES-256-GCM); 10 códigos
  de recuperação como hash (argon2), uso único; verificação com janela de
  ±1 passo e proteção contra reuso do mesmo código. **Recomendado desde o
  primeiro dia** (o app cobra até ligar).
- **Reautenticação** (senha, válida 5 min) para: conectar/desconectar banco,
  exportar dados, excluir conta, desligar 2FA, trocar e-mail/senha
  (`RecentAuthGuard`).
- **Sessão**: tabela `Session` no servidor (`userId`, `tokenHash`,
  `lastUsedAt`, `revokedAt`, user-agent resumido); expira em 30 dias **sem
  uso**; logout e troca de senha revogam. O usuário vê e encerra as próprias
  sessões em Configurações.
- **Convite**: token de 32 bytes (`crypto.randomBytes`), só o SHA-256 no
  banco, uso único, 72h, novo convite invalida o anterior; o link aponta
  sempre para `APP_DOMAIN`. **Não existe cadastro aberto.**
- **Redefinir senha**: mesmo formato do convite (1h); `POST /auth/forgot-password`
  responde `204` **sempre**, com `@Throttle` próprio; e-mail é texto puro, sem
  HTML.
- **Sessão longa (30 dias) é uma troca consciente**: o dono prefere não entrar
  todo dia no celular. O risco é que um cookie roubado ou um aparelho perdido
  vale por até 30 dias de uso. O que compensa: ação sensível **sempre** pede
  a senha de novo (reautenticação, acima); o 2FA é pedido no login e no
  reautenticar; o usuário vê e encerra sessões em Configurações; trocar a
  senha revoga as outras; e o runbook tem "celular perdido" (`09` § 6).
  Se o uso mudar (mais pessoas, outros aparelhos), reavaliar o prazo.
- **Sem enumeração**: nenhuma rota lista Users, e-mails ou convites.

### Cookie de sessão — todos os flags, sempre

- `HttpOnly`, `Secure` (sempre `https`, sem exceção nem em staging),
  `SameSite=Lax` (ou `Strict`), `Path=/`, **sem `Domain`** (host-only:
  como web e API dividem a origem, não há motivo para cookie de domínio
  largo).
- Prefixo `__Host-` no nome (`__Host-gastos_session`): o browser só aceita se
  `Secure`, `Path=/` e sem `Domain` — falha fechada se alguém relaxar um
  flag.
- O valor é um token opaco (id de sessão), **não** um JWT com dado dentro;
  o servidor é quem resolve `userId`. Nada de PII no cookie.

## 5. Negação de serviço e bots

Numa VPS única sem CDN/WAF (mesma realidade do `pdv-web`):

- **Rate limiting global** (`@nestjs/throttler`) em toda rota, mais estrito
  em mutação, login, IA e endpoints que disparam chamada externa (sync, connect
  token). Ligado por padrão em todo ambiente; `RATE_LIMIT_ENABLED=false` só
  no `.env` de dev local, nunca em CI/produção.
- **Caddy como primeira linha**: `request_body max_size` e timeouts (ver
  `Caddyfile`); `POST` de import limitado a 6 MB no proxy e 5 MB na API.
- **Payload limit** no `main.ts` (`json({ limit: '1mb' })`) — o import usa
  rota multipart própria com limite maior e validação estrita.
- **Timeouts explícitos** em toda chamada externa (Pluggy, Claude, SMTP,
  banco). Dependência lenta não pode travar o Node.
- **Custo como vetor de DoS**: rotas que chamam Pluggy/Claude têm limite por
  User **e** por dia (uma sessão roubada ou um loop no front não pode
  consumir a cota/billing inteira). `AI_MONTHLY_TOKEN_BUDGET` é a trava dura.
- **Honeypot** no formulário de login/convite/redefinir senha (campo
  invisível; se preenchido, rejeita em silêncio) e log de padrão anômalo
  (rajada de tentativas sem User-Agent de browser) para investigar, não
  para bloquear sozinho.

## 6. Upload (import OFX/CSV)

Este projeto **não guarda arquivo**: não há MinIO nem storage. O arquivo é
processado em memória e descartado.

- Restringir **no servidor**, não só no `accept` do input: extensão
  `.ofx`/`.csv`, tamanho <= 5 MB, content-type conferido, e **conteúdo
  inspecionado** (OFX começa com cabeçalho/`<OFX>`; CSV decodificado como
  texto) — arquivo binário ou com formato inesperado é rejeitado.
- `multer` com `memoryStorage` e `limits` (tamanho, número de arquivos = 1).
  Nada em disco, nada em `/tmp`.
- **Parser com limites**: número máximo de linhas (ex.: 50 mil), tamanho
  máximo de campo, e **sem expansão de entidade externa** no OFX/XML (XXE
  desligado; preferir parser que trate OFX SGML/XML sem resolver entidades).
  "Bomba" (linha gigante, arquivo altamente comprimido) → erro, não
  travamento.
- Nome do arquivo original **nunca** usado como caminho; só como rótulo
  exibido e escapado.
- Conteúdo do arquivo é **dado não-confiável** (descrições vão para o banco
  como texto, e para a IA como dado — ver `10-ia.md`).
- **Exportação**: todo campo de texto de CSV exportado é neutralizado contra
  injeção de fórmula (prefixo `'` se começa com `=`, `+`, `-`, `@`, tab ou
  CR).

## 7. Injeção (SQL e afins)

- Prisma parametriza tudo. `$queryRawUnsafe`/`$executeRawUnsafe`
  **proibidos**; raw só com `$queryRaw`/`$executeRaw` em template literal
  tipado.
- Filtros e busca validados por Zod antes de chegar ao Prisma; ordenação por
  allowlist de coluna (nunca `orderBy` montado de string do cliente).
- **A IA nunca escreve SQL** (`10-ia.md`): só chama ferramentas fixas.

## 8. Mass assignment

Idêntico ao `pdv-web`:

- Todo schema de entrada em `packages/shared` usa **allowlist explícita**
  (`.strict()`, nunca `.passthrough()`): campo extra é rejeitado, não
  ignorado.
- Nunca repassar o body inteiro ao Prisma; o `Service` monta `data` campo a
  campo quando o objeto não veio de DTO validado.
- **Campos que o cliente nunca seta**: `userId`, `id`, `isSelf`,
  `externalId`, `source`, `pluggyItemId`, `description` (imutável do banco),
  `amountCents`/`occurredAt` de conta `PLUGGY`, `passwordHash`,
  `totpSecret`, `createdAt`, `deletedAt`, `consentExpiresAt`. Os schemas de
  update omitem esses campos na origem.
- Split e rateio: soma validada pela API; `personId` de um split é conferido
  como pertencente ao User (ID de outro User = `404`, nunca `403`, para não
  confirmar que existe).

## 9. Exposição de dados na resposta

- **Nunca** retornar `passwordHash`, `totpSecret`, `tokenHash`, token de
  Item/Pluggy, `DATA_ENCRYPTION_KEY`, nem o `itemId` cru do Pluggy onde o
  front não precisa. Resposta é montada a partir do **schema Zod de saída**,
  não devolvendo o registro do Prisma.
- `DomainExceptionFilter` garante formato fixo de erro (`statusCode`, `code`,
  `message`, `details` só em erro de validação) — nunca stack, nome de tabela
  ou SQL. **Erro de API externa (Pluggy/Claude) é traduzido** para mensagem
  própria; o corpo de erro deles nunca chega ao cliente nem ao log completo.
- `NODE_ENV=production` desliga debug do Nest/Prisma (`log: ['query']` só em
  dev — logar query é logar extrato bancário).
- Respostas de dado financeiro: `Cache-Control: no-store` na API (não fica em
  cache de proxy nem no disco do dispositivo compartilhado). O service worker
  só cacheia assets estáticos e o último mês **em memória de sessão/IndexedDB
  protegido pelo logout** (limpar no logout e ao revogar sessão).

## 10. Segredos e configuração

- `SESSION_SECRET`, `DATA_ENCRYPTION_KEY`, `PLUGGY_CLIENT_SECRET`,
  `PLUGGY_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, senhas de banco/SMTP: só em
  `.env` (nunca commitado), com entropia real (`openssl rand -hex 32`),
  **diferentes por ambiente**. `deploy-check.sh` barra placeholder.
- **`DATA_ENCRYPTION_KEY` (AES-256-GCM)**: protege o que não pode aparecer
  num dump (segredo TOTP, qualquer token de Item). Cada valor tem IV único e
  guarda a versão da chave (`keyVersion`) para permitir **rotação**: subir a
  chave nova, re-criptografar em background, aposentar a antiga.
  Procedimento em `09-operacao.md` § 6. Perder a chave = perder esses
  segredos (reconectar bancos/refazer 2FA); guardar cópia fora da VPS.
- **Rotação de `SESSION_SECRET`/revogação de todas as `Session`**: documentada
  como resposta a incidente.
- **Backup do banco** criptografado com **chave pública (age)** antes de sair
  da VPS (`backup-db.sh`): a VPS só tem a chave pública (`BACKUP_AGE_RECIPIENT`),
  que não decifra nada; a **chave privada fica fora da VPS** (cofre + cópia
  offline). Quem invade a VPS não lê os backups. As credenciais de upload são
  **só de escrita** e a retenção é do **lifecycle do bucket**, para que a VPS
  comprometida também não consiga apagar os backups (`09-operacao.md` § 4).
- Logs **nunca** contêm senha, token de sessão, corpo de login, `itemId` do
  Pluggy, resposta do Pluggy com dado de conta, ou texto de transação em
  nível `info`. Mascarar explicitamente no logger (redaction), sem confiar em
  "não vou logar isso".

## 11. Scan de dependências e superfície

- `pnpm audit --audit-level=high` no CI em todo PR; Dependabot semanal
  Exceção registrada: `GHSA-vfj7-8cjw-p6xm` (`braces`) ignorado em `pnpm-workspace.yaml` por não haver versão
  corrigida no npm e a dependência ser só de desenvolvimento; remover quando sair `braces` >= 3.0.4.
  (`.github/dependabot.yml`) para npm, actions e Docker.
- Imagens fixadas em versão (`node:22-alpine`, `postgres:16-alpine`,
  `caddy:2-alpine`), sem `latest` implícito.
- **Superfície pública mínima**: só Caddy (80/443). Postgres **sem `ports:`**
  no compose de produção (o overlay de dev publica só em `127.0.0.1`).
  SSH por chave, sem senha; firewall (`ufw`) liberando 22/80/443.
- Supply chain: `pnpm install --frozen-lockfile` no CI; revisão de qualquer
  dependência nova que toque em cripto, parsing de arquivo ou rede.

## 12. Cabeçalhos HTTP

No Caddy (camada única): HSTS, `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` restrita (ver `Caddyfile`), CSP (§ 2). `-Server` remove
o banner.

## 13. LGPD

Dado financeiro pessoal é dado pessoal sensível na prática; tratar com o
rigor do § 1.

- **Base legal simples**: o próprio titular usa o sistema para os próprios
  dados. Cada User só vê os seus.
- **Dado de terceiros (familiares)**: `Person` guarda só nome/rótulo. Compras
  no cartão do User atribuídas a um familiar são do próprio fluxo financeiro
  do User; o sistema não coleta CPF, telefone ou endereço da Person e não
  compartilha nada com ela **por conta própria**. Exceção controlada: a
  mensagem de conta (03) só sai do app quando o User toca em "WhatsApp" ou
  "Copiar"; nenhum número é guardado, o texto nunca vai para log e o envio
  não é registrado.
- **Pix e conta corrente não são sincronizados**: o sync só persiste cartão de crédito, então nome de
  favorecido/pagador nunca é armazenado.
- **Minimização com fornecedores**: Pluggy recebe o necessário para a conexão
  (feita pelo próprio titular); Claude recebe o mínimo (`10-ia.md`).
- **Exportar** (CSV/JSON) e **excluir conta** disponíveis ao próprio User,
  com reautenticação. Excluir: revoga Items no Pluggy, apaga todas as linhas
  do User (cascata) e invalida sessões. Backups antigos podem reter o dado até
  a rotação da retenção (7 diários + 4 semanais) — documentar isso ao User.
- **Sem analytics de terceiros** nem pixel de rastreio. Sem venda ou
  compartilhamento de dado.
- Registro de acesso a ação sensível (login, reautenticação, exportar,
  conectar/desconectar) em log estruturado, sem conteúdo financeiro.

## 14. Integração bancária

- **Somente leitura**: nenhuma chamada de escrita/iniciação de pagamento no
  `PluggyClient`. Isso é regra de code review.
- Credencial de banco **nunca** toca nossa API: só o widget do Pluggy.
- `PLUGGY_CLIENT_SECRET` só no servidor. Connect token de vida curta e
  atrelado ao `clientUserId` do User que o pediu (exige reautenticação).
- `itemId` informado pelo front é **verificado** no Pluggy e conferido como
  pertencente àquele User antes de gravar (impede vincular item alheio).
- Webhook autenticado por segredo em tempo constante e tratado só como aviso
  (`07-integracao-bancaria.md`).
- Item expirado/revogado nunca deixa de aparecer: falha visível, não
  silenciosa.

## 15. IA

- Chave só no servidor; chamada com timeout e orçamento de tokens.
- Dado do banco entra no prompt como **dado delimitado**; ferramentas
  somente-leitura escopadas ao User; saída validada por schema e renderizada
  como texto (`10-ia.md`).
- Nenhuma ação destrutiva ou financeira executada pelo modelo.

## O que fica fora de escopo por ora (e por quê)

- **WAF/CDN dedicado**: dois usuários numa VPS não justificam; reavaliar
  (Cloudflare free na frente) se o uso crescer.
- **Passkeys/WebAuthn**: TOTP cobre o risco atual; passkey é P2 (melhor UX no
  celular).
- **Pentest formal**: recomendado antes de convidar mais que o círculo
  pessoal atual.
- **Multi-região/DR ativo**: backup criptografado fora da VPS + drill mensal
  de restore é o nível aceito (`09-operacao.md` § 4).
