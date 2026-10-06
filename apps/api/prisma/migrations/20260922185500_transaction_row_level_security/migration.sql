-- RLS para PluggyItem e Transaction (08-seguranca § 1), mesma função app_user_id() já criada.

ALTER TABLE "PluggyItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PluggyItem" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "PluggyItem"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());

ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "Transaction"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());
