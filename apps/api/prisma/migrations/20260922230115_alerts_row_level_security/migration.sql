-- RLS para EnvelopeAlert e BudgetMonthAlert (08-seguranca § 1), mesma função app_user_id() já criada.

ALTER TABLE "EnvelopeAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EnvelopeAlert" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "EnvelopeAlert"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());

ALTER TABLE "BudgetMonthAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetMonthAlert" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "BudgetMonthAlert"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());
