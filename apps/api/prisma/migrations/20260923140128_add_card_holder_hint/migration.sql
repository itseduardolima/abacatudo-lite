-- CreateTable
CREATE TABLE "CardHolderHint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "cardLast4" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardHolderHint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardHolderHint_userId_idx" ON "CardHolderHint"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CardHolderHint_accountId_cardLast4_key" ON "CardHolderHint"("accountId", "cardLast4");

-- AddForeignKey
ALTER TABLE "CardHolderHint" ADD CONSTRAINT "CardHolderHint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardHolderHint" ADD CONSTRAINT "CardHolderHint_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardHolderHint" ADD CONSTRAINT "CardHolderHint_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
