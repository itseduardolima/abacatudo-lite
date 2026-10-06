-- RLS para CardHolderHint (08-seguranca § 1), mesma função app_user_id() já criada.

ALTER TABLE "CardHolderHint" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CardHolderHint" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "CardHolderHint"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());
