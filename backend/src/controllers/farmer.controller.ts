import type { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import {createFarmerSchema} from "../schemas/farmer.schema.js";
import {createFarmer, getFarmerById, getFarmers, getFarmerWeather} from "../services/farmer.service.js";
import { getOrRefreshFarmerAnalysis } from "../services/farmer-analysis.service.js";


export const createFarmerController = async (request: FastifyRequest, reply: FastifyReply) => {
  const result = createFarmerSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({
      success: false,
      error: "Invalid farmer data",
      details: result.error.flatten(),
    });
  }

  try {
    const farmer = await createFarmer(result.data);

    return reply.status(201).send({
      success: true,
      data: farmer,
    });
  }
  catch (error) {
    console.error("Create farmer error:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return reply.status(409).send({
        success: false,
        error: "A farmer with this phone number is already registered",
      });
    }

    return reply.status(500).send({
      success: false,
      error: "Unable to create farmer",
    });
  }
};

export const getFarmersController = async (_request: FastifyRequest, reply: FastifyReply) => {
  try {
    const farmers = await getFarmers();

    return reply.send({
      success: true,
      data: farmers,
    });
  }
  catch (error) {
    console.error("Get farmers error:", error);

    return reply.status(500).send({
      success: false,
      error: "Unable to fetch farmers",
    });
  }
};

export const getFarmerController = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  try {
    const farmer = await getFarmerById(request.params.id);

    if (!farmer) {
      return reply.status(404).send({
        success: false,
        error: "Farmer not found",
      });
    }

    return reply.send({
      success: true,
      data: farmer,
    });
  }
  catch (error) {
    console.error("Get farmer error:", error);

    return reply.status(500).send({
      success: false,
      error: "Unable to fetch farmer",
    });
  }
};

export const getFarmerWeatherController = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
  try {
    const result = await getFarmerWeather(request.params.id);
    if (!result) {
      return reply.status(404).send({
        success: false,
        error: "Farmer not found",
      });
    }
    return reply.send({
      success: true,
      data: result,
    });
  } 
  catch (error) {
    console.error("Farmer weather error:", error);

    if (error instanceof Error && error.message === "Farmer location is not available") {
      return reply.status(422).send({
        success: false,
        error: error.message,
      });
    }

    return reply.status(502).send({
      success: false,
      error: "Unable to fetch farmer weather",
    });
  }
};

export const getFarmerAnalysisController = async (
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) => {
  try {
    const result = await getOrRefreshFarmerAnalysis(request.params.id);
    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Farmer analysis error:", error);

    if (error instanceof Error && error.message === "Farmer not found") {
      return reply.status(404).send({
        success: false,
        error: error.message,
      });
    }

    return reply.status(500).send({
      success: false,
      error: "Unable to retrieve farmer analysis",
    });
  }
};