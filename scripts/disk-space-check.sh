#!/bin/sh
# Alerta se o disco da VPS passar de um limite (09-operacao § 2) — os
# volume do Postgres cresce sem limite natural; disco cheio é
# um dos jeitos mais silenciosos de derrubar o sistema (a API para de
# escrever no banco sem cair o container).
#
# Uso: rodar via cron (o comportamento padrão do cron — enviar por e-mail
# qualquer stdout/stderr de um job, se o sistema tiver MTA/MAILTO
# configurado — já vira o alerta, sem precisar de infra extra):
#   0 * * * * /caminho/para/gastos-web/scripts/disk-space-check.sh
#
# Limite customizável: DISK_ALERT_THRESHOLD=90 ./scripts/disk-space-check.sh
# Caminho(s) customizável(is): ./scripts/disk-space-check.sh /var/lib/docker
set -e

threshold="${DISK_ALERT_THRESHOLD:-80}"
fail=0

# "$@" preserva cada argumento como uma unidade (mesmo com espaço) — juntar
# tudo numa string e refazer word-splitting (como `paths="$*"` faria)
# quebraria um caminho como "/mnt/meu disco" em dois.
[ "$#" -eq 0 ] && set -- /

for path in "$@"; do
  # `df -P` (POSIX): saída em colunas fixas, sem quebra de linha em nomes
  # longos de filesystem — a última coluna da 2ª linha é o % de uso.
  usage=$(df -P "$path" | awk 'NR==2 { gsub("%", "", $5); print $5 }')
  if [ -z "$usage" ]; then
    echo "ERRO: não consegui ler o uso de disco de '$path'" >&2
    fail=1
    continue
  fi
  if [ "$usage" -ge "$threshold" ]; then
    echo "ERRO: disco em '$path' está em ${usage}% de uso (limite: ${threshold}%)" >&2
    fail=1
  else
    echo "OK: '$path' em ${usage}% de uso (limite: ${threshold}%)"
  fi
done

exit $fail
