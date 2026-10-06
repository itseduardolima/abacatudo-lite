-- Row-Level Security (08-seguranca § 1): segunda camada de isolamento, por usuário.
-- A aplicação seta app.user_id em cada transação (extensão do Prisma, prisma/prisma.client.ts); sem isso
-- as tabelas de domínio não devolvem nem aceitam linha nenhuma. FORCE faz valer até para o dono das
-- tabelas; superusuário sempre ignora RLS — por isso a API nunca conecta como superusuário
-- (infra/postgres/init-app-role.sh).
--
-- User e Session NÃO entram aqui, de propósito (exceção documentada em 08-seguranca § 1): são resolvidas
-- antes de existir um userId no contexto (login por e-mail, sessão pelo hash do cookie). O isolamento
-- delas é só de aplicação, restrito ao AuthRepository (regra de lint em eslint.config.mjs).

CREATE OR REPLACE FUNCTION app_user_id() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.user_id', true), '') $$;

ALTER TABLE "Person" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Person" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "Person"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());

ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "Category"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());
