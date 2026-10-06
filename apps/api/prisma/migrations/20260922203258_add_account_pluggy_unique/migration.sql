-- Fecha a race do upsert em runSync (banking.service.ts): duas sincronizações simultâneas do mesmo item
-- não conseguem mais criar duas contas pra mesma conta real. NULL não colide com NULL no Postgres, então
-- isso só trava duplicata sincronizada pelo Pluggy (externalAccountId preenchido) — conta manual é livre.
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_externalAccountId_key" UNIQUE ("userId", "externalAccountId");
