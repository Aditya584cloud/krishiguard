/*
  Warnings:

  - Added the required column `primaryCrop` to the `Farmer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `soilType` to the `Farmer` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SoilType" AS ENUM ('Alluvial', 'Black', 'Red', 'Laterite', 'Sandy', 'Clay', 'Loamy');

-- AlterTable
ALTER TABLE "Farmer" ADD COLUMN     "hasActiveLoan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "loanAmountRupees" DOUBLE PRECISION,
ADD COLUMN     "loanDueDate" TIMESTAMP(3),
ADD COLUMN     "primaryCrop" TEXT NOT NULL,
ADD COLUMN     "soilType" "SoilType" NOT NULL;
