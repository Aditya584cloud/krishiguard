-- CreateTable
CREATE TABLE "FarmerAnalysis" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "marketResult" JSONB,
    "advisoryResult" JSONB,
    "distressResult" JSONB,
    "lastSuccessAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FarmerAnalysis_farmerId_key" ON "FarmerAnalysis"("farmerId");

-- AddForeignKey
ALTER TABLE "FarmerAnalysis" ADD CONSTRAINT "FarmerAnalysis_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
