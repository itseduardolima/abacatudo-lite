#!/bin/sh
# Barra um deploy com .env ausente ou ainda com valores de exemplo.
# Uso na VPS: ./scripts/deploy-check.sh && docker compose up -d --build
set -e
cd "$(dirname "$0")/.."
[ -f .env ] || { echo "ERRO: .env não existe. cp .env.example .env e preencha." >&2; exit 1; }
required="APP_DOMAIN ACME_EMAIL POSTGRES_PASSWORD APP_DB_PASSWORD SESSION_SECRET DATA_ENCRYPTION_KEY PLUGGY_CLIENT_ID PLUGGY_CLIENT_SECRET MAIL_HOST MAIL_AUTH_USER MAIL_AUTH_PASS"
fail=0
for name in $required; do
  value=$(grep -E "^${name}=" .env | tail -1 | cut -d= -f2- | sed 's/[[:space:]]*#.*$//')
  case "$value" in
    ""|*seudominio*|*gere-*|*change-me*|*placeholder*|localhost*)
      echo "ERRO: $name não preenchido no .env (valor atual: '${value:-vazio}')" >&2; fail=1 ;;
  esac
done

# Fallback do docker-compose.yml se a variável faltar (POSTGRES_PASSWORD:-postgres,
# APP_DB_PASSWORD:-gastos) — deploy sem essas duas no .env sobe o banco com senha trivial, sem
# nenhum erro visível (auditoria de segurança 2026-09-28).
db_password_check() {
  name=$1
  weak=$2
  value=$(grep -E "^${name}=" .env | tail -1 | cut -d= -f2- | sed 's/[[:space:]]*#.*$//')
  if [ "$value" = "$weak" ]; then
    echo "ERRO: $name está com o valor padrão inseguro do docker-compose.yml ('$weak')." >&2
    fail=1
  fi
}
db_password_check POSTGRES_PASSWORD postgres
db_password_check APP_DB_PASSWORD gastos
[ "$fail" -eq 0 ] && echo "OK: .env pronto para produção."
exit $fail
