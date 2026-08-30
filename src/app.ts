import Fastify from "fastify";
import cors from "@fastify/cors";

import { farmerRoutes } from "./routes/farmer.routes.js";
import { weatherRoutes } from "./routes/weather.routes.js";
import { advisoryRoutes } from "./routes/advisory.routes.js";
import { distressRoutes } from "./routes/distress.routes.js";
import { marketRoutes } from "./routes/market.routes.js";

const app = Fastify({logger: true});

await app.register(cors, {origin: true});
app.get("/health", async () => {
  return {
    status: "ok",
    service: "krishiguard-backend",
  };
});
await app.register(farmerRoutes, {prefix: "/api"});
await app.register(weatherRoutes, {prefix: "/api"});
await app.register(advisoryRoutes, {prefix: "/api"});
await app.register(distressRoutes, {prefix: "/api"});
await app.register(marketRoutes, { prefix: "/api" });

export default app;