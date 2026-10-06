-- AlterTable: personId vira opcional (uma Rule pode ser só de categoria) e ganha categoryId
ALTER TABLE "Rule" ALTER COLUMN "personId" DROP NOT NULL;
ALTER TABLE "Rule" ADD COLUMN "categoryId" TEXT;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint: nunca as duas pontas vazias — uma Rule sem pessoa nem categoria não decide nada
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_person_or_category_check" CHECK ("personId" IS NOT NULL OR "categoryId" IS NOT NULL);
