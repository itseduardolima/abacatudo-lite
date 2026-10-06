-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rule_userId_merchant_key" ON "Rule"("userId", "merchant");

-- CreateIndex
CREATE INDEX "Rule_userId_idx" ON "Rule"("userId");

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
