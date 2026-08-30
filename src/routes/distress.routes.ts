import type { FastifyInstance } from "fastify";
import { distressController } from "../controllers/distress.controller.js";

export async function distressRoutes(app: FastifyInstance) {
  app.post("/distress", distressController);
}