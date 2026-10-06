-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CREDIT_CARD', 'CHECKING', 'CASH');

-- CreateEnum
CREATE TYPE "AccountSource" AS ENUM ('MANUAL', 'IMPORT', 'PLUGGY');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "source" "AccountSource" NOT NULL DEFAULT 'MANUAL',
    "closingDay" INTEGER,
    "dueDay" INTEGER,
    "creditLimitCents" INTEGER,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
