
--CreateEnum
CREATE TYPE "Language" AS ENUM ('English', 'Odia', 'Hindi');

--DropIndex
DROP INDEX "WeatherObservation_latitude_longitude_idx";

--DropIndex
DROP INDEX "WeatherObservation_observedAt_idx";

--AlterTable
ALTER TABLE "Farmer" DROP COLUMN "language",
ADD COLUMN     "language" "Language" NOT NULL;

--CreateIndex
CREATE INDEX "Farmer_state_district_idx" ON "Farmer"("state", "district");

--CreateIndex
CREATE INDEX "WeatherObservation_latitude_longitude_observedAt_idx" ON "WeatherObservation"("latitude", "longitude", "observedAt");
