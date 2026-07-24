const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "tmp-ui-screenshots");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:5173";

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();

  // Login page
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: path.join(OUT, "01-login.png") });

  // Login
  await page.getByPlaceholder("Email").fill("demo@silentreview.app");
  await page.getByPlaceholder("Password").fill("DemoPass123!");
  await page.getByRole("button", { name: /log in with email/i }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, "02-feed.png") });

  // Profile
  await page.goto(`${BASE}/profile/me`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "03-profile.png") });

  // Leaderboard
  await page.goto(`${BASE}/leaderboard`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "04-leaderboard.png") });

  // Viral
  await page.goto(`${BASE}/viral`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "05-viral.png") });

  // Record
  await page.goto(`${BASE}/record`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "06-record.png") });

  // Status
  await page.goto(`${BASE}/status`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, "07-status.png") });

  await browser.close();
  console.log("Screenshots saved to", OUT);
})();
