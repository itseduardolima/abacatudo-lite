-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN     "totpSecret" TEXT;

-- CreateTable
CREATE TABLE "TwoFactorRecoveryCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorRecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TwoFactorRecoveryCode_userId_idx" ON "TwoFactorRecoveryCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorChallenge_tokenHash_key" ON "TwoFactorChallenge"("tokenHash");

-- CreateIndex
CREATE INDEX "TwoFactorChallenge_userId_idx" ON "TwoFactorChallenge"("userId");

-- AddForeignKey
ALTER TABLE "TwoFactorRecoveryCode" ADD CONSTRAINT "TwoFactorRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorChallenge" ADD CONSTRAINT "TwoFactorChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
