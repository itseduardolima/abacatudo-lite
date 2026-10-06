-- RLS para Split (08-seguranca § 1), mesma função app_user_id() já criada.

ALTER TABLE "Split" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Split" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "Split"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());
