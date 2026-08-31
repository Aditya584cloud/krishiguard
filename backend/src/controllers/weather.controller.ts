import type { FastifyRequest, FastifyReply } from "fastify";
import { weatherQuerySchema } from "../schemas/weather.schema.js";
import { getCurrentWeather } from "../services/weather.service.js";

export const getWeather = async (req: FastifyRequest, reply: FastifyReply) => {
  const parsed = weatherQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return reply.status(400).send({
      success: false,
      error: "Invalid weather coordinates",
      details: parsed.error.flatten(),
    });
  }

  try {
    const weather = await getCurrentWeather(parsed.data.lat, parsed.data.lon);
    return reply.send({
      success: true,
      data: weather,
    });
  } 
  catch (error) {
    console.error("Weather service error:", error);
    return reply.status(502).send({
      success: false,
      error: "Unable to fetch weather data",
    });
  }
}
