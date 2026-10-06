#!/bin/sh
# Mesma sequência do job "deploy" do CI (.github/workflows/ci.yml), pra rodar à mão na VPS sem
# esquecer o connect-shared-network.sh depois do `up` — achado ao vivo em 2026-09-28: um `docker
# compose up --build` manual (ex.: pra pegar variável nova no .env) recria web/api e derruba a
# conexão com a rede do Caddy compartilhado, mesmo que o deploy automático logo antes tivesse
# reconectado certinho.
# Uso na VPS: cd /root/gastos-web && ./scripts/deploy-manual.sh
set -e
cd "$(dirname "$0")/.."

./scripts/deploy-check.sh
docker compose up -d --build web api
./scripts/connect-shared-network.sh
docker image prune -f

echo "Esperando a API responder em /health..."
for i in $(seq 1 30); do
  docker compose exec -T api wget -qO- http://localhost:3001/health >/dev/null 2>&1 && {
    echo "OK: API respondeu."
    exit 0
  }
  sleep 2
done
echo "ERRO: /health não respondeu depois do deploy manual." >&2
exit 1
