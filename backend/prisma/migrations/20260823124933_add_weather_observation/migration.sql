-- CreateTable
CREATE TABLE "WeatherObservation" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "temperatureC" DOUBLE PRECISION NOT NULL,
    "apparentTemperatureC" DOUBLE PRECISION NOT NULL,
    "humidityPercent" DOUBLE PRECISION NOT NULL,
    "precipitationMm" DOUBLE PRECISION NOT NULL,
    "rainMm" DOUBLE PRECISION NOT NULL,
    "windSpeedKmh" DOUBLE PRECISION NOT NULL,
    "weatherCode" INTEGER NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeatherObservation_latitude_longitude_idx" ON "WeatherObservation"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "WeatherObservation_observedAt_idx" ON "WeatherObservation"("observedAt");
