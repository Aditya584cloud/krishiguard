import type { FastifyRequest, FastifyReply } from "fastify";

import { distressSchema } from "../schemas/distress.schema.js";
import { getDistressRisk } from "../services/distress.service.js";

export const distressController = async (request: FastifyRequest, reply: FastifyReply) => {
  const parsed = distressSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.status(400).send({
      success: false,
      error: "Invalid request data",
      details: parsed.error.flatten(),
    });
  }

  try {
    const result = await getDistressRisk(parsed.data);

    return reply.send({
      success: true,
      data: result,
    });
  }
  catch (error) {
    console.error("Distress error:", error);

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