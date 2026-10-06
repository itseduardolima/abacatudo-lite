-- RLS para Envelope (08-seguranca § 1), mesma função app_user_id() já criada.

ALTER TABLE "Envelope" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Envelope" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "Envelope"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());
