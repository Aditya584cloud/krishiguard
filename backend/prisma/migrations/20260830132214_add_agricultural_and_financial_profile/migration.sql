
--CreateEnum
CREATE TYPE "SoilType" AS ENUM ('Alluvial', 'Black', 'Red', 'Laterite', 'Sandy', 'Clay', 'Loamy');

--AlterTable
ALTER TABLE "Farmer" ADD COLUMN     "hasActiveLoan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "loanAmountRupees" DOUBLE PRECISION,
ADD COLUMN     "loanDueDate" TIMESTAMP(3),
ADD COLUMN     "primaryCrop" TEXT NOT NULL,
ADD COLUMN     "soilType" "SoilType" NOT NULL;
