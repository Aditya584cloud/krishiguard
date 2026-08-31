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

    if (error instanceof Error && error.message === "DATA_GOV_API_KEY is not configured") {
      return reply.status(503).send({
        success: false,
        error: "Market data service is not configured on this server.",
      });
    }

    // Remaining failures at this point are upstream mandi-API problems
    // (timeout, non-OK status, network failure) — a 502, not a generic 500.
    return reply.status(502).send({
      success: false,
      error: "Unable to fetch market data — the mandi price service is currently unavailable.",
    });
  }
};