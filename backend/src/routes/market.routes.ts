import type { FastifyInstance } from "fastify";

import { marketController } from "../controllers/market.controller.js";

export async function marketRoutes(app: FastifyInstance) {
  app.post("/market", marketController);
}