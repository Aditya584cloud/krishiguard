import type { AdvisoryInput } from "../schemas/advisory.schema.js";
import { getFarmerWeather } from "./farmer.service.js";
import { generateFarmerAdvisory } from "./advisory.translation.js";

export const getAdvisory = async (data: AdvisoryInput) => {
  const result = await getFarmerWeather(data.farmerId);
  
  if (!result) {
    throw new Error("Farmer not found");
  }

  const { farmer, weather } = result;
  const crop = data.crop ?? farmer.primaryCrop;
  const soil = data.soil ?? farmer.soilType;

  const recommendations = generateFarmerAdvisory(farmer.language, {
    crop,
    soilType: soil,
    temperatureC: weather.temperatureC,
    humidityPercent: weather.humidityPercent,
    rainMm: weather.rainMm,
  });

  return {
    farmer: {
      id: farmer.id,
      name: farmer.name,
      village: farmer.village,
      district: farmer.district,
    },
    crop,
    soil,
    language: farmer.language,
    weather,
    recommendations,
  };
};