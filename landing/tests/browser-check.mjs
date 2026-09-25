import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(60000);
page.setDefaultNavigationTimeout(90000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.PREVIEW_URL || "http://localhost:3000";
try {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator("canvas").waitFor();
  await page.locator(".nav-trigger").first().hover();
  assert.equal(await page.locator("nav .dropdown").count(), 1);
  await page.locator(".nav-trigger").nth(1).hover();
  assert.equal(await page.locator("nav .dropdown").count(), 1);
  assert.match(
    await page.locator("nav .dropdown").innerText(),
    /Sales channels/,
  );
  const courierX = () =>
    page
      .locator(".courier-set")
      .first()
      .evaluate((element) => element.getBoundingClientRect().x);
  const firstCourierX = await courierX();
  await page.waitForTimeout(200);
  assert.notEqual(firstCourierX, await courierX(), "Courier strip should move");
  const firstFeature = page.locator(".feature").first();
  assert.equal(await page.locator(".feature").count(), 6);
  await firstFeature.hover({ position: { x: 140, y: 30 } });
  assert.match(
    await firstFeature.evaluate((element) =>
      element.style.getPropertyValue("--trace-x"),
    ),
    /px/,
  );
  await page.getByRole("button", { name: /WooCommerce/ }).click();
  assert.equal(
    await page
      .getByRole("button", { name: /WooCommerce/ })
      .getAttribute("aria-pressed"),
    "true",
  );
  assert.match(
    await page.locator(".channel-detail").innerText(),
    /WooCommerce/,
  );
  await page.locator(".scene").scrollIntoViewIfNeeded();
  const pixels = () =>
    page.locator("canvas").evaluate((c) => {
      const gl = c.getContext("webgl2");
      if (!gl) return null;
      const a = new Uint8Array(
        gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
      );
      gl.readPixels(
        0,
        0,
        gl.drawingBufferWidth,
        gl.drawingBufferHeight,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        a,
      );
      let opaque = 0,
        hash = 0;
      for (let i = 0; i < a.length; i += 64) {
        opaque += a[i + 3] > 0 ? 1 : 0;
        hash = (hash + a[i] * (i + 1)) % 1000000007;
      }
      return { opaque, hash };
    });
  const a = await pixels();
  assert.ok(a?.opaque > 100, "WebGL scene must contain rendered pixels");
  await page.waitForTimeout(500);
  const b = await pixels();
  assert.notEqual(a.hash, b.hash, "Scene should animate");
  await page.getByRole("button", { name: "Pause animation" }).click();
  assert.ok(
    await page.getByRole("button", { name: "Play animation" }).isVisible(),
  );
  const heroBounds = await page.locator(".hero").boundingBox();
  assert.ok(heroBounds);
  await page.mouse.move(heroBounds.x + 80, heroBounds.y + 240);
  await page.waitForTimeout(450);
  const cursorLeft = await pixels();
  await page.mouse.move(heroBounds.x + heroBounds.width - 80, heroBounds.y + 240);
  await page.waitForTimeout(450);
  const cursorRight = await pixels();
  assert.notEqual(
    cursorLeft.hash,
    cursorRight.hash,
    "Cursor should rotate the scene",
  );
  await page.getByRole("button", { name: "Play animation" }).click();
  assert.ok(
    await page
      .locator(".cta")
      .first()
      .evaluate((element) => element.getBoundingClientRect().height >= 380),
    "CTA should read as a full section",
  );
  assert.ok(
    await page
      .locator(".footer-group a")
      .first()
      .evaluate(
        (element) => parseFloat(getComputedStyle(element).fontSize) >= 15,
      ),
    "Footer links should be legible",
  );
  for (const img of await page.locator('img[loading="lazy"]').all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((i) => i.decode());
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: join(tmpdir(), "box-beyond-desktop.png"),
    fullPage: true,
  });
  await page.locator(".feature").first().click();
  await page.waitForURL("**/services/ecommerce");
  await page.goto(base);
  await page.locator(".tool-link").nth(1).click();
  await page.waitForURL("**/resources/weight-estimator");
  const routes = [
    "/platform",
    "/services/ecommerce",
    "/services/b2b",
    "/services/returns",
    "/integrations/sales-channels",
    "/integrations/courier-partners",
    "/resources/rate-calculator",
    "/resources/weight-estimator",
    "/track",
    "/blogs",
    "/blogs/shipping-weight",
    "/blogs/reduce-returns",
    "/blogs/first-shipment",
    "/about",
    "/careers",
    "/partners",
    "/contact",
    "/privacy",
    "/terms",
  ];
  for (const route of routes) {
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200, route);
    assert.equal(await page.locator("h1").count(), 1, route);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      route + " overflow",
    );
  }
  await page.goto(base + "/resources/weight-estimator");
  for (const [name, value] of [
    ["weight", "1"],
    ["length", "30"],
    ["width", "20"],
    ["height", "20"],
  ])
    await page.locator(`[name="${name}"]`).fill(value);
  await page.getByRole("button", { name: "Calculate weight" }).click();
  assert.match(await page.locator(".tool-results").innerText(), /2.40/);
  await page.goto(base + "/resources/rate-calculator");
  await page.locator('[name="origin"]').fill("123");
  await page.locator('[name="destination"]').fill("400001");
  await page.locator('[name="weight"]').fill("1");
  await page.getByRole("button", { name: "Get shipping rate" }).click();
  assert.match(await page.locator(".form-error").innerText(), /six-digit/);
  await page.route("**/api/rates/delhivery?*", (route) =>
    route.fulfill({
      json: {
        total_amount: 118,
        gross_amount: 100,
        tax_amount: 18,
        charge_FS: 0,
      },
    }),
  );
  await page.locator('[name="origin"]').fill("110001");
  await page.getByRole("button", { name: "Get shipping rate" }).click();
  await page.getByText("LIVE PREPAID QUOTE", { exact: true }).waitFor();
  assert.match(await page.locator(".tool-results").innerText(), /118/);
  await page.route("**/api/track?*", (route) =>
    route.fulfill({
      json: {
        found: true,
        awb: "TEST-AWB",
        status: "in_transit",
        courier: "Test courier",
        origin: "Delhi",
        destination: "Mumbai",
        events: [
          {
            statusText: "Picked up",
            location: "Delhi",
            timestamp: "2026-09-17T10:00:00Z",
          },
        ],
      },
    }),
  );
  await page.goto(base + "/track?q=TEST-AWB");
  await page.waitForFunction(
    () =>
      document.querySelector('input[placeholder="Enter your tracking number"]')
        ?.value === "TEST-AWB",
  );
  await page.getByRole("button", { name: "Track shipment" }).click();
  await page.getByText("SHIPMENT UPDATE", { exact: true }).waitFor();
  assert.match(await page.locator(".tool-results").innerText(), /Picked up/);
  await page.unroute("**/api/track?*");
  await page.getByRole("button", { name: "Track shipment" }).click();
  await page.locator(".form-error").waitFor();
  assert.match(
    await page.locator(".form-error").innerText(),
    /unavailable|timed out/,
  );
  await page.goto(base + "/contact");
  await page.getByLabel("Full name").fill("Local QA");
  await page.getByLabel("Email", { exact: true }).fill("qa@example.test");
  await page
    .getByLabel("Your message")
    .fill("Local website verification. No external delivery needed.");
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await page.getByRole("status").waitFor();
  assert.match(await page.getByRole("status").innerText(), /received/);
  await page.goto(base);
  const auth = await page
    .getByRole("link", { name: "Start shipping", exact: true })
    .first()
    .getAttribute("href");
  assert.equal(auth, "http://localhost:5173/signup");
  const response = await page.goto(auth);
  assert.equal(response.status(), 200);
  await page.locator("input").first().waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "mobile overflow",
  );
  assert.ok((await pixels())?.opaque > 100, "mobile WebGL must render");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByText("Resources", { exact: true }).first().click();
  await page
    .getByRole("link", { name: "Weight estimator", exact: true })
    .first()
    .click();
  await page.waitForURL("**/resources/weight-estimator");
  assert.match(page.url(), /weight-estimator/);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.goto(base);
  for (const img of await page.locator('img[loading="lazy"]').all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((i) => i.decode());
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: join(tmpdir(), "box-beyond-mobile.png"),
    fullPage: true,
  });
  for (const route of [
    "/contact",
    "/track",
    "/platform",
    "/blogs",
    "/resources/rate-calculator",
  ]) {
    await page.goto(base + route);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "mobile " + route,
    );
  }
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `home overflow at ${width}px`,
    );
  }
  const relevant = errors.filter((e) => !e.includes("Network Error"));
  assert.deepEqual(relevant, []);
  console.log(
    JSON.stringify(
      {
        pages: routes.length,
        desktop: "1440x1000",
        mobile: "390x844",
        webglPixels: a.opaque,
        animation: true,
        weight: "passed",
        rateFixture: "passed",
        trackingFixture: "passed",
        backendUnavailable: "passed",
        contactPersisted: "passed",
        authLink: "passed",
        errors: relevant,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
