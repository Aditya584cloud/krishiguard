import type { CreateFarmerInput } from "../schemas/farmer.schema.js";
import { prisma } from "../lib/prisma.js";
import { geocodeLocation } from "./geocoding.service.js";
import { getCurrentWeather } from "./weather.service.js";

export const createFarmer = async (data: CreateFarmerInput) => {
  const coordinates = await geocodeLocation(
    data.village,
    data.district,
    data.state,
  );

  return prisma.farmer.create({
    data: {
      ...data,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    },
  });
};

export const getFarmers = async () => {
  return prisma.farmer.findMany();
};

export const getFarmerById = async (id: string) => {
  return prisma.farmer.findUnique({
    where: { id },
  });
};

export const getFarmerWeather = async (id: string) => {
  const farmer = await getFarmerById(id);

  if (!farmer) {
    return null;
  }

  if (farmer.latitude === null || farmer.longitude === null) {
    throw new Error("Farmer location is not available");
  }

  const weather = await getCurrentWeather(
    farmer.latitude,
    farmer.longitude,
  );

  return {
    farmer,
    weather,
  };
};