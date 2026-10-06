-- AlterTable
ALTER TABLE "BudgetMonth" ADD COLUMN     "firstHalfIncomeCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "FixedExpense" ADD COLUMN     "half" INTEGER NOT NULL DEFAULT 1;

-- Renda existente fica toda na 1ª quinzena até o usuário dividir.
UPDATE "BudgetMonth" SET "firstHalfIncomeCents" = "incomeCents";
