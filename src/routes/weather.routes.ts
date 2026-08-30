import type { FastifyInstance } from "fastify";
import { getWeather } from "../controllers/weather.controller.js";

export async function weatherRoutes(app: FastifyInstance) {
  app.get("/weather", getWeather);
}