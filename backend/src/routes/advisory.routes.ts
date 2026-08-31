import type { FastifyInstance } from "fastify";

import { advisoryController } from "../controllers/advisory.controller.js";

export async function advisoryRoutes(app: FastifyInstance) {
  app.post("/advisory", advisoryController);
}