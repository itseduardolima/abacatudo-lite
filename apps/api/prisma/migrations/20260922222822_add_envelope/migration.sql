-- CreateTable
CREATE TABLE "Envelope" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "budgetMonthId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amountCents" INTEGER,
    "percent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Envelope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Envelope_budgetMonthId_categoryId_key" ON "Envelope"("budgetMonthId", "categoryId");

-- CreateIndex
CREATE INDEX "Envelope_userId_idx" ON "Envelope"("userId");

-- AddForeignKey
ALTER TABLE "Envelope" ADD CONSTRAINT "Envelope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envelope" ADD CONSTRAINT "Envelope_budgetMonthId_fkey" FOREIGN KEY ("budgetMonthId") REFERENCES "BudgetMonth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envelope" ADD CONSTRAINT "Envelope_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: exatamente um dos dois (amountCents fixo OU percent do teto variável), nunca os dois
-- nem nenhum.
ALTER TABLE "Envelope" ADD CONSTRAINT "Envelope_amount_xor_percent_check" CHECK (
  ("amountCents" IS NOT NULL AND "percent" IS NULL) OR ("amountCents" IS NULL AND "percent" IS NOT NULL)
);
