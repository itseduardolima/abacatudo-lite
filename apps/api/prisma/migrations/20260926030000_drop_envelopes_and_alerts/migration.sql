-- DropForeignKey
ALTER TABLE "BudgetMonthAlert" DROP CONSTRAINT "BudgetMonthAlert_budgetMonthId_fkey";

-- DropForeignKey
ALTER TABLE "BudgetMonthAlert" DROP CONSTRAINT "BudgetMonthAlert_userId_fkey";

-- DropForeignKey
ALTER TABLE "Envelope" DROP CONSTRAINT "Envelope_budgetMonthId_fkey";

-- DropForeignKey
ALTER TABLE "Envelope" DROP CONSTRAINT "Envelope_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Envelope" DROP CONSTRAINT "Envelope_userId_fkey";

-- DropForeignKey
ALTER TABLE "EnvelopeAlert" DROP CONSTRAINT "EnvelopeAlert_envelopeId_fkey";

-- DropForeignKey
ALTER TABLE "EnvelopeAlert" DROP CONSTRAINT "EnvelopeAlert_userId_fkey";

-- DropTable
DROP TABLE "BudgetMonthAlert";

-- DropTable
DROP TABLE "Envelope";

-- DropTable
DROP TABLE "EnvelopeAlert";

