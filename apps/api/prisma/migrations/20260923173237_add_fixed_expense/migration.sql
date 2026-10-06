-- CreateTable
CREATE TABLE "FixedExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FixedExpense_userId_idx" ON "FixedExpense"("userId");

-- AddForeignKey
ALTER TABLE "FixedExpense" ADD CONSTRAINT "FixedExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (08-seguranca § 1), mesma função app_user_id() já criada.
ALTER TABLE "FixedExpense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FixedExpense" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "FixedExpense"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());
