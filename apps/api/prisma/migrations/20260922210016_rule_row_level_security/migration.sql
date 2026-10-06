-- RLS para Rule (08-seguranca § 1), mesma função app_user_id() já criada.

ALTER TABLE "Rule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rule" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "Rule"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());
