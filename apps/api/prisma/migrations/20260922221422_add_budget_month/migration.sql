-- CreateTable
CREATE TABLE "BudgetMonth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "incomeCents" INTEGER NOT NULL DEFAULT 0,
    "benefitCents" INTEGER NOT NULL DEFAULT 0,
    "fixedExpensesCents" INTEGER NOT NULL DEFAULT 0,
    "savingsGoalCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetMonth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetMonth_userId_month_key" ON "BudgetMonth"("userId", "month");

-- CreateIndex
CREATE INDEX "BudgetMonth_userId_idx" ON "BudgetMonth"("userId");

-- AddForeignKey
ALTER TABLE "BudgetMonth" ADD CONSTRAINT "BudgetMonth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
