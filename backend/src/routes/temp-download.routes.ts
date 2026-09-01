// TEMPORARY — one-off way to get the debug APK onto a phone directly via
// browser download, since no other file-transfer path was available.
// Registered from app.ts; remove that registration, this file, and
// public/krishiguard-debug.apk once downloaded.
import { readFile } from "node:fs/promises";
import type { FastifyInstance, FastifyReply } from "fastify";

export const tempDownloadRoutes = async (app: FastifyInstance) => {
  app.get("/downloads/krishiguard-debug.apk", async (_request, reply: FastifyReply) => {
    const buffer = await readFile(new URL("../../public/krishiguard-debug.apk", import.meta.url));
    reply
      .header("Content-Type", "application/vnd.android.package-archive")
      .header("Content-Disposition", "attachment; filename=krishiguard-debug.apk")
      .send(buffer);
  });
};
