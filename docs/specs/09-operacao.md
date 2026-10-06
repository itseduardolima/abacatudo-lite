# Operação (Runbook)

Mesma lógica do `pdv-web` (`../pdv-web/docs/specs/09-operacao.md`): responde
"como sei que quebrou e o que faço", não "como funciona". Numa VPS única
self-hosted, nada disso é feito por um provedor gerenciado.

Diferença de perfil: o PDV para de vender se cair; aqui a queda **não perde
venda**, mas o pior cenário é **vazar dado financeiro** ou **perder o
banco**. Por isso segurança de segredos e backup pesam mais do que
disponibilidade 24/7.

## 1. Health checks

- `GET /health` (API, público, fora da autenticação): responde `200` só se
  falar de fato com o Postgres (`SELECT 1`) — nunca só "o processo está de
  pé". Não expõe versão nem detalhe interno.
- `apps/web`: `GET /healthz` do próprio Next (só confirma o processo do
  frontend). Fica fora de `/api/*`, que o Caddy manda para a API.
- Pós-deploy, o CI checa `/health` de dentro do container da API (ela não
  publica porta no host).

## 2. Monitoramento

- **Uptime externo** (UptimeRobot free ou similar) em `/api/health` (API) e `/healthz` (web),
  a cada 5 min, com alerta por e-mail.
- **Disco**: `scripts/disk-space-check.sh` no cron (alerta > 80%).
- **Job de sync**: alerta (e-mail) se nenhum sync bem-sucedido nas últimas 36
  h por um Item que não está `EXPIRED`. Sync parado em silêncio é o defeito
  mais provável deste sistema.
- **Cota/custo externo**: acompanhar uso do Pluggy e gasto da API de IA
  (`AI_MONTHLY_TOKEN_BUDGET` é a trava, o painel do fornecedor é a conferência).

## 3. Logs

- JSON estruturado (`timestamp`, `level`, `userId` quando houver,
  `requestId`, `message`); `requestId` no `AsyncLocalStorage` junto do
  `userId`.
- **Redaction obrigatória** (`08-seguranca.md` § 10): nada de senha, token,
  `itemId`, corpo de login, resposta do Pluggy ou texto de transação em nível
  `info`. Erro de API externa loga só `status`, código e `requestId` deles.
- stdout/stderr do container (`docker compose logs -f api`). `info` em
  produção; nunca `query` do Prisma.

## 4. Backup e restore do banco

Backup nunca restaurado é esperança, não backup.

- **O quê**: `pg_dump` completo, feito como superusuário (bypassa RLS — um
  dump como usuário da aplicação viria vazio sem avisar). `scripts/backup-db.sh`
  comprime e **criptografa com chave pública (age)** antes de sair da VPS.
- **Quando**: diário via cron, madrugada.
- **Chave**: gere o par **na sua máquina**, nunca na VPS:
  `age-keygen -o backup-key.txt`. A linha `# public key: age1...` vai para o
  cron da VPS (`BACKUP_AGE_RECIPIENT`); o arquivo `backup-key.txt` (privada) vai
  para o gerenciador de senhas **e** uma cópia offline. A VPS nunca vê a
  privada — invadir a VPS não abre nenhum backup. **Perder a privada = perder
  todos os backups**: guardar em dois lugares independentes.
- **Onde**: bucket S3-compatível **fora da VPS** (outro provedor). As
  credenciais que ficam na VPS são **só de escrita** (`s3:PutObject`, sem
  `List`/`Delete`) e, se o provedor tiver, **versionamento ou object lock** no
  bucket: assim a VPS comprometida não consegue apagar nem sobrescrever
  backups antigos. Credenciais com permissão de apagar/listar ficam só com
  você, fora da VPS.
- **Retenção (7 diários + 4 semanais)**: regra de **lifecycle do bucket**, não
  do script (o script não apaga nada): prefixo `backups/daily/` expira em 8
  dias, `backups/weekly/` em 32 dias. Consequência LGPD: dado excluído pelo
  usuário some dos backups em até ~5 semanas (`08` § 13).
- **Restore**: baixar o objeto e
  `age -d -i backup-key.txt gastos-....sql.gz.age | gunzip > dump.sql`, depois
  `psql` num ambiente separado. Faça isso **na sua máquina ou num ambiente de
  restore**, nunca na VPS de produção (a privada não deve encostar nela).
- **Drill de restore mensal — obrigatório**: restaurar o mais recente em
  ambiente separado com a chave privada guardada (prova que a **chave certa
  decifra** e que o cofre funciona), subir a aplicação, confirmar que os dados
  batem **e que a RLS continua ativa** no restaurado.

## 5. Deploy e rollback

- **`deploy-check.sh` também roda sozinho**: o `docker-compose.yml` tem um
  serviço `env-check` que executa o script e bloqueia `api`/`web`/`caddy` se
  falhar — rodar manualmente antes continua valendo (falha mais cedo, com
  mensagem melhor), mas `docker compose up` sem `.env` real não sobe mais
  os containers de app mesmo que esse passo seja esquecido.
- **Primeiro deploy** (checklist em `README.md`): DNS A/AAAA de `APP_DOMAIN`;
  `.env` real validado por `scripts/deploy-check.sh`; `docker compose up -d
--build`; seed do primeiro User (`docker compose exec api node
dist/seed/prisma/seed.js` — a imagem final não tem `pnpm`, lê `SEED_USER_*`
  do `.env`); configurar cron de backup e de
  disco; configurar uptime externo. 2FA e webhook do Pluggy ainda não
  existem no código (o Meu Pluggy não tem webhook — sync é por
  polling/manual), então não entram nesse checklist ainda.
- **Deploy contínuo**: job `deploy` no próprio `.github/workflows/ci.yml`, só em push na `main` e
  só depois de `ci`/`components`/`docker` passarem. Passos: SSH na VPS → `git reset --hard
origin/main` → `deploy-check.sh` → `docker compose up -d --build web api` (nunca `caddy`: a VPS
  de hoje já tem outro projeto, `pdv-web`, dono das portas 80/443) → `scripts/connect-shared-network.sh`
  (anexa `web`/`api` na rede do Caddy do outro projeto — não dá pra fazer isso via `networks:` do
  compose, ver comentário no script) → `docker image prune -f` → espera `/health` de dentro do
  container. Secrets: `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY`/`DEPLOY_PATH` (mesmo desenho do
  `pdv-web`).
- **Deploy manual na VPS** (ex.: só pra atualizar uma variável do `.env`, sem novo commit): rodar
  `./scripts/deploy-manual.sh` em vez de `docker compose up -d --build` direto — ele encadeia
  `deploy-check.sh` → `up --build web api` → `connect-shared-network.sh` → `image prune` → espera
  `/health`, igual ao job do CI. **Nunca** rodar só `docker compose up --build` à mão: isso recria
  os containers e derruba a conexão com a rede do Caddy compartilhado sem avisar (502 silencioso em
  produção — achado ao vivo em 2026-09-28).
- **Migrations**: `prisma migrate deploy` roda no boot da API. Toda migration
  que mexe em RLS ou em tabela com dado é testada no drill de restore antes.
  **Nunca** `migrate reset`/`db push` em produção.
- **Rollback**: voltar o commit na VPS e `docker compose up -d --build`. Migration
  já aplicada não volta sozinha — migration destrutiva exige backup manual
  antes e plano de reversão escrito na própria PR.
- **Acesso à VPS**: SSH só por chave, sem root remoto, `ufw` 22/80/443,
  atualizações de segurança automáticas do SO (`unattended-upgrades`).

## 6. Incidentes — cenários e primeira ação

| Cenário                                      | Primeira ação                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Suspeita de sessão roubada / celular perdido | Revogar **todas** as `Session` do User (Configurações, ou `UPDATE` direto pelo superusuário), trocar senha, revisar log de reautenticação                                                                                                                                                                       |
| Vazou `SESSION_SECRET`/`.env`                | Rotacionar `SESSION_SECRET` (invalida sessões), trocar demais segredos, revisar logs de acesso                                                                                                                                                                                                                  |
| Vazou `PLUGGY_CLIENT_SECRET`                 | Gerar novo no painel do Pluggy, atualizar `.env`, `docker compose up -d`; revisar no Pluggy os Items/uso; reconectar se o fornecedor exigir                                                                                                                                                                     |
| Vazou `ANTHROPIC_API_KEY`                    | Revogar/gerar nova no console, atualizar `.env`; checar uso anormal de custo                                                                                                                                                                                                                                    |
| Vazou `DATA_ENCRYPTION_KEY` ou dump do banco | Tratar como vazamento total: rotacionar chave (abaixo), revogar Items no Pluggy e reconectar, trocar senhas, avisar os Users; avaliar dever de comunicar (LGPD)                                                                                                                                                 |
| Webhook do Pluggy recebendo lixo             | Confirmar segredo; rotacionar `PLUGGY_WEBHOOK_SECRET` e o registro no Pluggy; rate limit já limita o dano                                                                                                                                                                                                       |
| Sync parou / Item `LOGIN_ERROR`/`OUTDATED`   | Ver `lastErrorCode`; pedir reconexão pelo app; se for do Pluggy, checar a página de status deles                                                                                                                                                                                                                |
| Disco cheio                                  | `docker image prune -f`, `docker system df`, conferir volume do Postgres; nunca apagar volume sem backup                                                                                                                                                                                                        |
| VPS comprometida (invasão)                   | Isolar/desligar a VPS, restaurar em máquina nova a partir do backup (a VPS só tinha a chave **pública** e credencial **só de escrita**, então os backups estão intactos e ilegíveis para o invasor); rotacionar todos os segredos (`.env`), `SESSION_SECRET`, chaves do Pluggy e da IA; revogar Items no Pluggy |
| Banco corrompido/perdido                     | Restaurar do último backup criptografado em ambiente novo, validar RLS, apontar o compose                                                                                                                                                                                                                       |
| Custo da IA disparou                         | Desligar (`ANTHROPIC_API_KEY` vazia) e reiniciar; investigar rota/usuário via log de tokens                                                                                                                                                                                                                     |

**Rotação da `DATA_ENCRYPTION_KEY`**: adicionar a chave nova como
`keyVersion = N+1` (a antiga continua só para leitura), rodar o job de
re-criptografia, confirmar zero registros na versão antiga, aposentar a
antiga. Guardar as chaves fora da VPS.

## 7. Tarefas recorrentes

| Frequência | Tarefa                                                                                |
| ---------- | ------------------------------------------------------------------------------------- |
| Diária     | Backup (cron); sync bancário (job da API)                                             |
| Semanal    | Revisar PRs do Dependabot; olhar alertas de uptime/sync                               |
| Mensal     | **Drill de restore**; conferir custo Pluggy/IA; revisar sessões ativas                |
| Trimestral | Revisar se o consentimento de algum Item vence; testar recuperação de 2FA             |
| Anual      | Reconsentimento Open Finance (o app avisa); revisar este runbook e o modelo de ameaça |

## 8. E-mail transacional (SMTP)

Usado para convite, redefinir senha e aviso de consentimento vencendo. SMTP
externo (`SMTP_*`), com SPF/DKIM/DMARC configurados no domínio (senão cai em
spam e o convite "some"). Sem HTML, só texto. Falha de envio nunca vaza no
corpo da resposta e é logada sem o destinatário completo.

## O que fica fora de escopo por ora

- Observabilidade completa (métricas/tracing): logs + uptime bastam para 1–2
  usuários.
- Alta disponibilidade/réplica: restore do backup é o plano de recuperação
  aceito.
- Agregador de logs externo.
