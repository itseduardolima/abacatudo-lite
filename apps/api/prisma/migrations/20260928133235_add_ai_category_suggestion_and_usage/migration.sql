-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "categorySuggestedId" TEXT,
ADD COLUMN     "categorySuggestionConfidence" INTEGER;

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiUsage_userId_idx" ON "AiUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_userId_month_key" ON "AiUsage"("userId", "month");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categorySuggestedId_fkey" FOREIGN KEY ("categorySuggestedId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (08-seguranca § 1), mesma função app_user_id() já criada.
ALTER TABLE "AiUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiUsage" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON "AiUsage"
  USING ("userId" = app_user_id()) WITH CHECK ("userId" = app_user_id());
