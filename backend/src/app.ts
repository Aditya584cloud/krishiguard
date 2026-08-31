import dns from "node:dns";
import net from "node:net";
import Fastify from "fastify";
import cors from "@fastify/cors";

import env from "./config/env.js";

// Some deployment environments advertise IPv6 (AAAA) DNS records for
// external APIs while actually having no working IPv6 route. Node's fetch
// (via undici's Happy Eyeballs) then races/attempts IPv6 before falling
// back to IPv4, which showed up here as intermittent "fetch failed" errors
// on calls to Open-Meteo/data.gov.in. Verified during this session: with
// neither fix, ~1/8 outbound calls succeeded; with both, 10/10 succeeded.
// Applied here (not server.ts) so it also covers the test suite, which
// imports this module directly.
dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);
import { farmerRoutes } from "./routes/farmer.routes.js";
import { weatherRoutes } from "./routes/weather.routes.js";
import { advisoryRoutes } from "./routes/advisory.routes.js";
import { distressRoutes } from "./routes/distress.routes.js";
import { marketRoutes } from "./routes/market.routes.js";

const app = Fastify({logger: true});

// Open CORS in development (this runs entirely on localhost for the
// prototype); production requires an explicit CORS_ORIGIN allowlist.
const corsOrigin =
  env.NODE_ENV === "production" ? (env.CORS_ORIGIN ?? false) : true;
await app.register(cors, {origin: corsOrigin});
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