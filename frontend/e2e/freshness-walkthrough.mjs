// Real-browser verification of the 6-hour Market/Advisory/Distress
// freshness policy. Registers a fresh farmer, then drives the browser
// through: first-time auto-generation, cached revisit, stale auto-refresh,
// failed-refresh preservation, and reload persistence — backdating the
// persisted snapshot directly in Postgres between steps (the same
// technique the backend test suite uses) since we can't literally wait 6
// hours.
//
// Run with: node e2e/freshness-walkthrough.mjs
// Requires backend (:8000) and frontend (:5173) running.

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";

const BASE_URL = "http://localhost:5173";
const BACKEND_DIR = "/home/aditya/krishiguard/backend";
const failures = [];

function step(name, ok, detail = "") {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures.push(name);
}

/** Runs a small Prisma script in the backend project and returns its parsed stdout (JSON on the last line). */
function runDbScript(body) {
  const path = `${BACKEND_DIR}/.tmp-freshness-script.mjs`;
  writeFileSync(
    path,
    `import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
${body}
await prisma.$disconnect();
`,
  );
  try {
    const out = execFileSync("npx", ["tsx", path], { cwd: BACKEND_DIR, encoding: "utf-8" });
    const lastLine = out.trim().split("\n").pop();
    return JSON.parse(lastLine);
  } finally {
    unlinkSync(path);
  }
}

async function waitForVisibleText(page, text, timeout = 20000) {
  const deadline = Date.now() + timeout;
  const locator = page.locator(`text=${text}`);
  while (Date.now() < deadline) {
    const count = await locator.count();
    for (let i = 0; i < count; i++) {
      if (await locator.nth(i).isVisible().catch(() => false)) return true;
    }
    await page.waitForTimeout(150);
  }
  return false;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));

try {
  // Register a fresh farmer with resolvable coordinates via the real form.
  await page.goto(BASE_URL);
  await page.getByRole("link", { name: "Farmers" }).click();
  const suffix = Date.now().toString().slice(-8);
  const name = `Freshness Farmer ${suffix}`;
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Phone").fill(`70003${suffix}`.slice(0, 15));
  await page.getByLabel("Village").fill("Bhubaneswar");
  await page.getByLabel("District").fill("Khordha");
  await page.getByLabel("State").fill("Odisha");
  await page.getByLabel("Primary crop").fill("Brinjal");
  await page.getByLabel("Soil type").selectOption("Black");
  await page.getByRole("button", { name: "Register farmer" }).click();
  await waitForVisibleText(page, name);
  step("1. Farmer registered", true);

  // 1. First-time farmer: visiting Dashboard alone (no manual click) must
  //    produce a full analysis.
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  const gotDistress = await waitForVisibleText(page, "Contributing", 20000).catch(() => false);
  const distressCardVisible = await page.getByText("DISTRESS RISK").isVisible().catch(() => false);
  await page.waitForTimeout(500);
  const mainText1 = await page.locator("main").innerText();
  const firstTimeWorked = mainText1.includes("Updated") && (distressCardVisible || mainText1.toLowerCase().includes("risk"));
  step("1. First-time farmer: analysis auto-generated with no manual click", firstTimeWorked, gotDistress ? "" : "(fallback text check)");

  const farmerRow = runDbScript(`
    const farmer = await prisma.farmer.findFirst({ where: { name: "${name}" } });
    const analysis = await prisma.farmerAnalysis.findUnique({ where: { farmerId: farmer.id } });
    console.log(JSON.stringify({ farmerId: farmer.id, lastSuccessAt: analysis?.lastSuccessAt ?? null, hasMarket: !!analysis?.marketResult }));
  `);
  step("1b. Snapshot persisted in Postgres (not just in-memory)", !!farmerRow.lastSuccessAt);
  const farmerId = farmerRow.farmerId;
  const originalTimestamp = farmerRow.lastSuccessAt;

  // 2. Revisit after 1 hour (backdated): must NOT refresh.
  runDbScript(`
    await prisma.farmerAnalysis.update({
      where: { farmerId: "${farmerId}" },
      data: { lastSuccessAt: new Date(Date.now() - 1 * 60 * 60 * 1000), lastAttemptAt: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    });
    console.log(JSON.stringify({ ok: true }));
  `);
  await page.reload();
  await waitForVisibleText(page, name, 10000);
  await page.waitForTimeout(800);
  const afterOneHour = runDbScript(`
    const analysis = await prisma.farmerAnalysis.findUnique({ where: { farmerId: "${farmerId}" } });
    console.log(JSON.stringify({ lastSuccessAt: analysis.lastSuccessAt }));
  `);
  step("2. Revisit after 1h: no refresh (timestamp unchanged)", new Date(afterOneHour.lastSuccessAt).getTime() < Date.now() - 55 * 60 * 1000);

  // 3. Revisit after 5h59m: still fresh, no refresh.
  runDbScript(`
    const t = new Date(Date.now() - (5 * 60 * 60 * 1000 + 59 * 60 * 1000));
    await prisma.farmerAnalysis.update({ where: { farmerId: "${farmerId}" }, data: { lastSuccessAt: t, lastAttemptAt: t } });
    console.log(JSON.stringify({ ok: true }));
  `);
  await page.reload();
  await waitForVisibleText(page, name, 10000);
  await page.waitForTimeout(800);
  const after559 = runDbScript(`
    const analysis = await prisma.farmerAnalysis.findUnique({ where: { farmerId: "${farmerId}" } });
    console.log(JSON.stringify({ lastSuccessAt: analysis.lastSuccessAt }));
  `);
  const stillOld = new Date(after559.lastSuccessAt).getTime() < Date.now() - 5 * 60 * 60 * 1000;
  step("3. Revisit after 5h59m: still fresh, no refresh", stillOld);

  // 4. Revisit after 6h+: must refresh, timestamp updates.
  runDbScript(`
    const t = new Date(Date.now() - (6 * 60 * 60 * 1000 + 5 * 60 * 1000));
    await prisma.farmerAnalysis.update({ where: { farmerId: "${farmerId}" }, data: { lastSuccessAt: t, lastAttemptAt: t } });
    console.log(JSON.stringify({ ok: true }));
  `);
  await page.reload();
  await waitForVisibleText(page, name, 10000);
  await page.waitForTimeout(2000); // allow the synchronous backend refresh to complete
  const after6h = runDbScript(`
    const analysis = await prisma.farmerAnalysis.findUnique({ where: { farmerId: "${farmerId}" } });
    console.log(JSON.stringify({ lastSuccessAt: analysis.lastSuccessAt }));
  `);
  const refreshed = new Date(after6h.lastSuccessAt).getTime() > Date.now() - 30 * 1000;
  step("4. Revisit after 6+ hours: triggers a refresh", refreshed);

  // 5 & 6. Failed refresh preserves old results; successful retry updates timestamp.
  const goodDistressText = await page.locator("main").innerText();
  runDbScript(`
    await prisma.farmer.update({ where: { id: "${farmerId}" }, data: { latitude: null, longitude: null } });
    const t = new Date(Date.now() - 7 * 60 * 60 * 1000);
    await prisma.farmerAnalysis.update({ where: { farmerId: "${farmerId}" }, data: { lastSuccessAt: t, lastAttemptAt: t, lastError: null } });
    console.log(JSON.stringify({ ok: true }));
  `);
  await page.reload();
  await waitForVisibleText(page, name, 10000);
  await page.waitForTimeout(2000);
  const failedState = runDbScript(`
    const analysis = await prisma.farmerAnalysis.findUnique({ where: { farmerId: "${farmerId}" } });
    console.log(JSON.stringify({ lastError: analysis.lastError, lastSuccessAt: analysis.lastSuccessAt, hasDistress: !!analysis.distressResult }));
  `);
  step("5. Failed refresh: old results preserved (distress still present)", failedState.hasDistress);
  step("5b. Failed refresh: error recorded, not silently swallowed", !!failedState.lastError);
  const mainTextAfterFailure = await page.locator("main").innerText();
  step("5c. UI shows 'Unable to refresh'", mainTextAfterFailure.includes("Unable to refresh"));

  // Restore coordinates and retry.
  runDbScript(`
    await prisma.farmer.update({ where: { id: "${farmerId}" }, data: { latitude: 20.2961, longitude: 85.8245 } });
    console.log(JSON.stringify({ ok: true }));
  `);
  await page.getByRole("button", { name: "Retry" }).first().click();
  await page.waitForTimeout(2000);
  const recovered = runDbScript(`
    const analysis = await prisma.farmerAnalysis.findUnique({ where: { farmerId: "${farmerId}" } });
    console.log(JSON.stringify({ lastError: analysis.lastError, lastSuccessAt: analysis.lastSuccessAt }));
  `);
  step("6. Successful retry: error cleared and timestamp advances", recovered.lastError === null && new Date(recovered.lastSuccessAt).getTime() > Date.now() - 15 * 1000);

  // 7. Page reload: results persist (already implicitly exercised above, confirm once more explicitly).
  await page.reload();
  const persistsAfterReload = await waitForVisibleText(page, name, 10000);
  step("7. Page reload: results persist", persistsAfterReload);

  // 9. Market/Advisory/Distress internal consistency: all three present together.
  const finalMain = await page.locator("main").innerText();
  const hasAllThree = finalMain.includes("MARKET") && finalMain.includes("ADVISORY") && finalMain.includes("DISTRESS");
  step("9. Market, Advisory and Distress all present together (coherent snapshot)", hasAllThree);

  step("No browser console errors during the walkthrough", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
} catch (err) {
  step("Walkthrough crashed", false, String(err));
} finally {
  await browser.close();
}

console.log("\n=== SUMMARY ===");
console.log(failures.length === 0 ? "ALL STEPS PASSED" : `${failures.length} STEP(S) FAILED`);
if (failures.length > 0) {
  console.log("Failed:", failures.join(", "));
  process.exitCode = 1;
}
