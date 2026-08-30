import type { FastifyRequest, FastifyReply } from "fastify";

import { marketPriceSchema } from "../schemas/market.schema.js";
import { getMarketComparison } from "../services/market.service.js";

export const marketController = async (request: FastifyRequest, reply: FastifyReply) => {
  const parsed = marketPriceSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.status(400).send({
      success: false,
      error: "Invalid request data",
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = await getMarketComparison(parsed.data);

    return reply.send({
      success: true,
      data: result,
    });
  }
  catch (error) {
    console.error("Market error:", error);

    if (error instanceof Error && error.message === "Farmer not found") {
      return reply.status(404).send({
        success: false,
        error: error.message,
      });
    }

    if (error instanceof Error && error.message.startsWith("No mandi prices found")) {
      return reply.status(404).send({
        success: false,
        error: error.message,
      });
    }

    return reply.status(500).send({
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
};