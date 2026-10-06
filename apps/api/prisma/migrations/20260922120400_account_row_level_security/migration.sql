-- RLS para Account (08-seguranca § 1), mesma função app_user_id() já criada em
-- 20260922111600_row_level_security.

ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "Account"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());
