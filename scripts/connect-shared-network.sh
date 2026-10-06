#!/bin/sh
# Anexa web/api à rede default de outro projeto Docker Compose que já é dono das portas 80/443
# nesta VPS (hoje: pdv-web) — para o Caddy dele alcançar estes containers pelo nome.
#
# Só existe como script porque isso NÃO pode ser feito via `networks:` no docker-compose.yml: o
# Compose, ao conectar um serviço a qualquer rede (mesmo externa), registra um alias DNS igual ao
# *nome do serviço* (`web`, `api`) nela — e o outro projeto também tem serviços com esses nomes.
# Os dois passam a responder pelo mesmo nome DNS e o Docker faz round-robin entre eles, então às
# vezes o Caddy do outro projeto acerta o container errado (achado ao vivo em 2026-09-24).
# `docker network connect` direto não cria esse alias de serviço, só o nome do container — por
# isso funciona. Idempotente (roda de novo sem erro se já conectado); precisa rodar depois de
# TODO `docker compose up` que recria web/api (a reconexão à outra rede não sobrevive ao recreate).
set -e

SHARED_NETWORK="${SHARED_NETWORK:-pdv-web_default}"
CONTAINERS="gastos-web-web-1 gastos-web-api-1"

for c in $CONTAINERS; do
  docker network disconnect "$SHARED_NETWORK" "$c" 2>/dev/null || true
  docker network connect "$SHARED_NETWORK" "$c"
done
