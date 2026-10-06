-- RLS para BudgetMonth (08-seguranca § 1), mesma função app_user_id() já criada.

ALTER TABLE "BudgetMonth" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetMonth" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "BudgetMonth"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());
