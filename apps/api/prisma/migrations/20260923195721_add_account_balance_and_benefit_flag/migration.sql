-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "balanceCents" INTEGER,
ADD COLUMN     "isBenefitAccount" BOOLEAN NOT NULL DEFAULT false;
