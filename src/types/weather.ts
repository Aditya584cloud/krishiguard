export interface WeatherData {
  latitude: number;
  longitude: number;

  temperatureC: number;
  apparentTemperatureC: number;

  humidityPercent: number;

  precipitationMm: number;
  rainMm: number;

  windSpeedKmh: number;

  weatherCode: number;

  observedAt: string;
}
