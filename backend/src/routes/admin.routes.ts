// TEMPORARY — production data curation only. Registered from app.ts;
// remove that registration (and this file) once used. Render's free-tier
// Postgres has no external connectivity, so this is the only way to run an
// ad-hoc update against the production database.
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma.js";

interface LoanDueUpdate {
  name: string;
  daysFromNow: number;
}

export const adminRoutes = async (app: FastifyInstance) => {
  app.patch("/admin/loan-due-days", async (request: FastifyRequest, reply: FastifyReply) => {
    const key = process.env.ADMIN_UPDATE_KEY;
    const providedKey = request.headers["x-admin-key"];

    if (!key || providedKey !== key) {
      return reply.status(404).send({ success: false, error: "Not found" });
    }

    const updates = (request.body as { updates: LoanDueUpdate[] } | undefined)?.updates ?? [];
    const results = [];

    for (const { name, daysFromNow } of updates) {
      const dueDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
      const result = await prisma.farmer.updateMany({
        where: { name, hasActiveLoan: true },
        data: { loanDueDate: dueDate },
      });
      results.push({ name, daysFromNow, matched: result.count });
    }

    return reply.send({ success: true, data: { results } });
  });
};
