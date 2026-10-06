-- CreateTable
CREATE TABLE "EnvelopeAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvelopeAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnvelopeAlert_envelopeId_threshold_key" ON "EnvelopeAlert"("envelopeId", "threshold");

-- CreateIndex
CREATE INDEX "EnvelopeAlert_userId_idx" ON "EnvelopeAlert"("userId");

-- AddForeignKey
ALTER TABLE "EnvelopeAlert" ADD CONSTRAINT "EnvelopeAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvelopeAlert" ADD CONSTRAINT "EnvelopeAlert_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "Envelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "BudgetMonthAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "budgetMonthId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "firedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetMonthAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetMonthAlert_budgetMonthId_threshold_key" ON "BudgetMonthAlert"("budgetMonthId", "threshold");

-- CreateIndex
CREATE INDEX "BudgetMonthAlert_userId_idx" ON "BudgetMonthAlert"("userId");

-- AddForeignKey
ALTER TABLE "BudgetMonthAlert" ADD CONSTRAINT "BudgetMonthAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetMonthAlert" ADD CONSTRAINT "BudgetMonthAlert_budgetMonthId_fkey" FOREIGN KEY ("budgetMonthId") REFERENCES "BudgetMonth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: só os 3 limiares do produto (03-regras-negocio § Orçamento mensal).
ALTER TABLE "EnvelopeAlert" ADD CONSTRAINT "EnvelopeAlert_threshold_check" CHECK ("threshold" IN (70, 90, 100));
ALTER TABLE "BudgetMonthAlert" ADD CONSTRAINT "BudgetMonthAlert_threshold_check" CHECK ("threshold" IN (70, 90, 100));
