import type { FastifyRequest, FastifyReply } from "fastify";

import { advisorySchema } from "../schemas/advisory.schema.js";
import { getAdvisory } from "../services/advisory.service.js";

export const advisoryController = async (request: FastifyRequest, reply: FastifyReply) => {
  const parsed = advisorySchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.status(400).send({
      success: false,
      error: "Invalid request data",
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = await getAdvisory(parsed.data);

    return reply.send({
      success: true,
      data: result,
    });
  }
  catch (error) {
    console.error("Advisory error:", error);

    if (error instanceof Error && error.message === "Farmer not found") {
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