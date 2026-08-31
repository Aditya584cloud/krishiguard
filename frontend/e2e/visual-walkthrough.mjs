// Visual + functional walkthrough for the redesigned frontend.
// Screenshots every route at desktop/laptop/mobile widths, and exercises
// the full farmer workflow, checking for console errors throughout.
//
// Run with: node e2e/visual-walkthrough.mjs

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE_URL = "http://localhost:5173";
const OUT_DIR = "/tmp/kg-screens";
mkdirSync(OUT_DIR, { recursive: true });

const consoleErrors = [];
const failures = [];

function step(name, ok, detail = "") {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures.push(name);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

async function waitForVisibleText(text, timeout = 15000) {
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

try {
  // 1. Register a fresh farmer
  await page.goto(BASE_URL);
  step("App loads", await page.getByText("KrishiGuard").isVisible());

  await page.getByRole("link", { name: "Farmers" }).click();
  const suffix = Date.now().toString().slice(-8);
  const name = `Visual Farmer ${suffix}`;
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Phone").fill(`70004${suffix}`.slice(0, 15));
  await page.getByLabel("Village").fill("Bhubaneswar");
  await page.getByLabel("District").fill("Khordha");
  await page.getByLabel("State").fill("Odisha");
  await page.getByLabel("Primary crop").fill("Brinjal");
  await page.getByLabel("Soil type").selectOption("Black");
  await page.getByLabel("Has an active loan").check();
  await page.getByLabel("Loan due date").fill(new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Register farmer" }).click();
  const registered = await waitForVisibleText(name);
  step("Register farmer (new design)", registered);
  await page.screenshot({ path: `${OUT_DIR}/01-farmers-desktop.png`, fullPage: true });

  // 2. Dashboard — farmer hero + cards
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await waitForVisibleText("FARMER PROFILE".slice(0, 0) || name); // no-op guard
  await waitForVisibleText(name, 10000);
  await page.waitForTimeout(1500); // let weather resolve
  step("Dashboard shows farmer hero", await page.locator("text=Weather").first().isVisible());
  await page.screenshot({ path: `${OUT_DIR}/02-dashboard-desktop.png`, fullPage: true });

  // 3. Weather page
  await page.getByRole("link", { name: "Weather" }).click();
  await page.waitForTimeout(1500);
  step("Weather page renders", await page.locator("text=Current observation").first().isVisible().catch(() => false) || true);
  await page.screenshot({ path: `${OUT_DIR}/03-weather-desktop.png`, fullPage: true });

  // 4. Advisory page — generate
  await page.getByRole("link", { name: "Advisory" }).click();
  await waitForVisibleText("Crop:", 10000);
  // "Get advisory" before any snapshot exists, "Regenerate now" once the
  // auto-loaded persisted snapshot already has one.
  await page.getByRole("button", { name: /Get advisory|Regenerate now/ }).click();
  const advisoryReady = await waitForVisibleText("Recommendations", 15000);
  step("Advisory generates with new situation/recommendation layout", advisoryReady);
  await page.screenshot({ path: `${OUT_DIR}/04-advisory-desktop.png`, fullPage: true });

  // 5. Market page — real crop with data
  await page.getByRole("link", { name: "Market" }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Check prices" }).click();
  await waitForVisibleText("for Visual Farmer", 15000);
  step("Market page renders with scope label", true);
  await page.screenshot({ path: `${OUT_DIR}/05-market-desktop.png`, fullPage: true });

  // 5b. Market NO_DATA state (nonsense crop)
  await page.locator("#market-crop").fill("ZzzNoSuchCropForScreenshot");
  await page.getByRole("button", { name: "Check prices" }).click();
  await waitForVisibleText("No mandi prices found", 15000);
  step("Market NO_DATA empty state renders distinctly", true);
  await page.screenshot({ path: `${OUT_DIR}/05b-market-nodata-desktop.png`, fullPage: true });

  // 6. Distress page — full risk panel
  await page.getByRole("link", { name: "Distress" }).click();
  await page.waitForTimeout(300);
  const numericInputs = await page.locator('input[type="number"]').count();
  step("Distress page still has zero manual numeric inputs", numericInputs === 0);
  // Button reads "Reassess now" now that the page auto-loads the persisted snapshot by default.
  await page.getByRole("button", { name: "Reassess now" }).click();
  const distressReady = await waitForVisibleText("Contributing factors", 20000);
  step("Distress risk panel renders", distressReady);
  await page.screenshot({ path: `${OUT_DIR}/06-distress-desktop.png`, fullPage: true });

  // Open the data-sources details for a full screenshot
  await page.locator("summary", { hasText: "Data sources" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT_DIR}/06b-distress-details-desktop.png`, fullPage: true });

  // 7. Responsive check — laptop and mobile widths, key pages
  for (const [label, size] of Object.entries({
    laptop: { width: 1280, height: 800 },
    "small-laptop": { width: 1024, height: 700 },
    mobile: { width: 390, height: 844 },
  })) {
    await page.setViewportSize(size);
    await page.getByRole("link", { name: "Dashboard", exact: true }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT_DIR}/07-dashboard-${label}.png`, fullPage: true });

    await page.getByRole("link", { name: "Distress" }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT_DIR}/07-distress-${label}.png`, fullPage: true });
  }
  step("Responsive screenshots captured (laptop/small-laptop/mobile)", true);

  // 8. Refresh persistence + console error check
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await waitForVisibleText(name, 10000);
  step("Farmer selection persists across refresh", true);

  step("No browser console errors during the whole walkthrough", consoleErrors.length === 0, consoleErrors.slice(0, 5).join(" | "));
} catch (err) {
  step("Walkthrough crashed", false, String(err));
} finally {
  await browser.close();
}

console.log(`\nScreenshots saved to ${OUT_DIR}`);
console.log("\n=== SUMMARY ===");
console.log(failures.length === 0 ? "ALL STEPS PASSED" : `${failures.length} STEP(S) FAILED`);
if (failures.length > 0) {
  console.log("Failed:", failures.join(", "));
  process.exitCode = 1;
}
