#!/bin/sh
# Roda só na primeira inicialização do volume do Postgres (docker-entrypoint-initdb.d).
# Cria o usuário da aplicação SEM superusuário: superusuário ignora Row-Level
# Security, e a RLS é a segunda camada de isolamento entre usuários (08-seguranca § 1).
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${APP_DB_USER}') THEN
    CREATE ROLE "${APP_DB_USER}" LOGIN PASSWORD '${APP_DB_PASSWORD}' NOSUPERUSER NOCREATEROLE NOBYPASSRLS;
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE "${APP_DB_NAME}" OWNER "${APP_DB_USER}"'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${APP_DB_NAME}')\gexec
SQL
