-- CreateTable
CREATE TABLE "MandiPrice" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "minPrice" DOUBLE PRECISION NOT NULL,
    "maxPrice" DOUBLE PRECISION NOT NULL,
    "modalPrice" DOUBLE PRECISION NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MandiPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MandiPrice_state_commodity_idx" ON "MandiPrice"("state", "commodity");

-- CreateIndex
CREATE INDEX "MandiPrice_state_district_commodity_idx" ON "MandiPrice"("state", "district", "commodity");

-- CreateIndex
CREATE INDEX "MandiPrice_arrivalDate_idx" ON "MandiPrice"("arrivalDate");

-- CreateIndex
CREATE UNIQUE INDEX "MandiPrice_state_district_market_commodity_arrivalDate_key" ON "MandiPrice"("state", "district", "market", "commodity", "arrivalDate");
