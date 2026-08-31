// TEMPORARY — production data cleanup only. Registered from app.ts;
// remove that registration (and this file) once the one-off cleanup this
// was added for is done. Render's free-tier Postgres has no external
// connectivity, so this is the only way to run an ad-hoc admin query
// against the production database.
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma.js";

export const adminRoutes = async (app: FastifyInstance) => {
  app.delete("/admin/test-farmers", async (request: FastifyRequest, reply: FastifyReply) => {
    const key = process.env.ADMIN_CLEANUP_KEY;
    const providedKey = request.headers["x-admin-key"];

    if (!key || providedKey !== key) {
      return reply.status(404).send({ success: false, error: "Not found" });
    }

    const result = await prisma.farmer.deleteMany({
      where: { name: { startsWith: "Prod " } },
    });

    return reply.send({ success: true, data: { deletedCount: result.count } });
  });
};
