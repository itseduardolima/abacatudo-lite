-- CreateEnum
CREATE TYPE "PluggyItemStatus" AS ENUM ('WAITING_USER_INPUT', 'UPDATED', 'LOGIN_ERROR', 'OUTDATED', 'ERROR');

-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER', 'REFUND', 'CARD_PAYMENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('POSTED', 'PENDING');

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "externalAccountId" TEXT,
ADD COLUMN     "pluggyItemId" TEXT;

-- CreateTable
CREATE TABLE "PluggyItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pluggyItemId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "status" "PluggyItemStatus" NOT NULL DEFAULT 'WAITING_USER_INPUT',
    "lastErrorCode" TEXT,
    "consentExpiresAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PluggyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "externalId" TEXT,
    "kind" "TransactionKind" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'POSTED',
    "amountCents" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "merchant" TEXT,
    "categoryId" TEXT,
    "personId" TEXT,
    "note" TEXT,
    "cardLast4" TEXT,
    "installmentNumber" INTEGER,
    "installmentTotal" INTEGER,
    "billId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PluggyItem_pluggyItemId_key" ON "PluggyItem"("pluggyItemId");

-- CreateIndex
CREATE INDEX "PluggyItem_userId_idx" ON "PluggyItem"("userId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_accountId_occurredAt_idx" ON "Transaction"("accountId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_accountId_externalId_key" ON "Transaction"("accountId", "externalId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_pluggyItemId_fkey" FOREIGN KEY ("pluggyItemId") REFERENCES "PluggyItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PluggyItem" ADD CONSTRAINT "PluggyItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
