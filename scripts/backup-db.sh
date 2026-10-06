#!/bin/sh
# Backup diário do banco (09-operacao § 4) — pg_dump completo (todos os
# usuários, não é um dump por usuário), comprimido e criptografado com
# CHAVE PÚBLICA (age), empurrado pra um destino S3-compatível FORA da VPS.
#
# Por que chave pública: a VPS só guarda o destinatário (BACKUP_AGE_RECIPIENT,
# "age1..."), que NÃO decifra nada. A chave privada fica com você, fora da VPS
# (gerenciador de senhas/cofre). Quem invade a VPS não consegue ler os backups
# nem descobrir uma senha que os abra. Com passphrase simétrica isso não
# valeria: ela teria de estar no crontab/ambiente da própria VPS.
#
# Por que este script NÃO apaga backup antigo: apagar exige permissão de
# delete no bucket, e quem invade a VPS herdaria essa permissão e poderia
# apagar todos os backups. A retenção (7 diários + 4 semanais) é uma regra de
# lifecycle DO BUCKET (ver 09-operacao § 4); as credenciais usadas aqui devem
# ser só de escrita (PutObject, sem Delete/List).
#
# Uso (cron diário, horário de menor movimento):
#   0 3 * * * BACKUP_AGE_RECIPIENT=age1... BACKUP_S3_BUCKET=... \
#     /caminho/para/gastos-web/scripts/backup-db.sh
#
# Pré-requisitos na VPS: `aws` CLI e `age` (apt install awscli age). Funciona
# com S3 de verdade ou qualquer destino S3-compatível via
# BACKUP_S3_ENDPOINT_URL (Backblaze B2 etc.); credenciais pelas variáveis
# padrão do aws-cli (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/AWS_REGION).
#
# Um backup nunca restaurado não é backup: o drill mensal de restore
# (09-operacao § 4) continua manual.
set -e
cd "$(dirname "$0")/.."

: "${BACKUP_AGE_RECIPIENT:?defina BACKUP_AGE_RECIPIENT (chave pública age1...) — backup nunca sobe sem criptografia}"
: "${BACKUP_S3_BUCKET:?defina BACKUP_S3_BUCKET — o destino precisa ser fora desta VPS}"
: "${APP_DB_NAME:=gastos}"

case "$BACKUP_AGE_RECIPIENT" in
  age1*) ;;
  AGE-SECRET-KEY-*)
    echo "ERRO: BACKUP_AGE_RECIPIENT é uma chave PRIVADA. Use a pública (age1...) e guarde a privada fora da VPS." >&2
    exit 1
    ;;
  *)
    echo "ERRO: BACKUP_AGE_RECIPIENT não parece uma chave pública age (age1...)." >&2
    exit 1
    ;;
esac

for cmd in aws age; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "ERRO: '$cmd' não encontrado no PATH (apt install awscli age)." >&2
    exit 1
  }
done

endpoint_args=""
[ -n "${BACKUP_S3_ENDPOINT_URL:-}" ] && endpoint_args="--endpoint-url $BACKUP_S3_ENDPOINT_URL"

timestamp=$(date -u +%Y-%m-%dT%H-%M-%SZ)
weekday=$(date -u +%u) # 1=segunda ... 7=domingo
raw_dump="$(mktemp)"
gz_file="$(mktemp)"
dump_file="$(mktemp)"
trap 'rm -f "$raw_dump" "$gz_file" "$dump_file"' EXIT

echo "Gerando dump de '${APP_DB_NAME}'..."
# -U postgres: só o superusuário de administração bypassa a Row-Level
# Security — um dump como APP_DB_USER (não-superusuário, RLS) devolveria
# as tabelas de domínio vazias, o que tornaria o backup inútil sem avisar
# ninguém (08-seguranca § 1).
#
# Cada etapa grava num arquivo próprio, SEM pipe: em sh POSIX (sem pipefail)
# `set -e` só olha o exit code do ÚLTIMO comando de um pipeline, então um
# `pg_dump | gzip | age` com o pg_dump falhando no meio passaria despercebido
# (gzip e age produzem saída válida mesmo com stdin vazio). Assim o `set -e`
# do topo mata o script na etapa que falhou.
docker compose exec -T postgres pg_dump -U postgres -d "$APP_DB_NAME" >"$raw_dump"

if [ ! -s "$raw_dump" ]; then
  echo "ERRO: dump veio vazio — o container 'postgres' está no ar? (docker compose ps)" >&2
  exit 1
fi

gzip -c "$raw_dump" >"$gz_file"
age -r "$BACKUP_AGE_RECIPIENT" -o "$dump_file" "$gz_file"

if [ ! -s "$dump_file" ]; then
  echo "ERRO: falha ao comprimir/criptografar o dump." >&2
  exit 1
fi

if [ "$weekday" = "7" ]; then
  prefix="weekly"
else
  prefix="daily"
fi
key="backups/${prefix}/gastos-${timestamp}.sql.gz.age"

echo "Enviando para s3://${BACKUP_S3_BUCKET}/${key}..."
# shellcheck disable=SC2086
aws s3 cp $endpoint_args "$dump_file" "s3://${BACKUP_S3_BUCKET}/${key}"

echo "OK: backup enviado (${prefix}). A retenção é aplicada pelo lifecycle do bucket."
