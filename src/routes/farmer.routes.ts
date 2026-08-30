import type { FastifyInstance } from "fastify";
import {createFarmerController, getFarmerController, getFarmersController, getFarmerWeatherController} from "../controllers/farmer.controller.js";

export const farmerRoutes = async (app: FastifyInstance) => {
  app.post("/farmers", createFarmerController);
  app.get("/farmers", getFarmersController);
  app.get("/farmers/:id", getFarmerController);
  app.get("/farmers/:id/weather", getFarmerWeatherController);
};