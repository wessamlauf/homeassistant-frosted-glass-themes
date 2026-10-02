/* Actual audited HA/Web Awesome dialogs and dropdowns, with no styling engine.
 * This is a local component fixture, not a live HA session. */
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { chromium } = require("playwright");
const bundle = process.env.FROSTED_GLASS_MODERN_DIALOGS_BUNDLE;
assert(
  bundle,
  "Set FROSTED_GLASS_MODERN_DIALOGS_BUNDLE to the audited component bundle.",
);
const sections = JSON.parse(
  execFileSync(
    "python3",
    [
      "-c",
      `
import json, pathlib, os, yaml
result=[]
for p in pathlib.Path(os.environ.get('FROSTED_GLASS_THEMES_DIR','themes')).glob('*.yaml'):
 for name, theme in yaml.safe_load(p.read_text()).items():
  if len(theme.get('modes',{})) == 2:
   for mode, values in theme['modes'].items(): result.append(dict(name=name,mode=mode,values=values))
print(json.dumps(result))
`,
    ],
    { cwd: path.resolve(__dirname, ".."), encoding: "utf8" },
  ),
);
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.FROSTED_GLASS_BROWSER
      ? {
          executablePath: process.env.FROSTED_GLASS_BROWSER,
          args: ["--no-sandbox", "--disable-gpu"],
        }
      : {}),
  });
  let checks = 0;
  try {
    for (const section of sections)
      for (const layout of ["direct", "adaptive", "mobile"]) {
        const page = await browser.newPage({
          viewport: { width: layout === "mobile" ? 430 : 1280, height: 960 },
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route("**/*", (r) => r.abort());
        await page.setContent(
          '<body style="margin:0;background:repeating-linear-gradient(135deg,#33516c 0 40px,#a6bccb 40px 80px);min-height:100vh;font:16px system-ui"></body>',
        );
        await page.evaluate(({ values }) => {
          const root = document.documentElement.style;
          // Current HA design-system tokens; never injected into the legacy fixture.
          for (let n = 1; n <= 20; n++)
            root.setProperty("--ha-space-" + n, n * 4 + "px");
          root.setProperty("--ha-color-neutral-50", "#808080");
          root.setProperty("--safe-width", "100vw");
          root.setProperty("--safe-height", "100vh");
          for (const edge of ["top", "right", "bottom", "left"])
            root.setProperty("--safe-area-inset-" + edge, "0px");
          root.setProperty("--ha-border-radius-3xl", "28px");
          root.setProperty("--ha-border-radius-2xl", "24px");
          root.setProperty("--ha-border-radius-md", "8px");
          root.setProperty("--wa-font-size-m", "16px");
          for (const [k, v] of Object.entries(values))
            if (!k.startsWith("card-mod-") && !k.startsWith("uix-"))
              root.setProperty("--" + k, v);
          window.deep = (root, selector) => {
            const found = root.querySelector(selector);
            if (found) return found;
            for (const el of root.querySelectorAll("*"))
              if (el.shadowRoot) {
                const hit = window.deep(el.shadowRoot, selector);
                if (hit) return hit;
              }
            return null;
          };
        }, section);
        await page.addScriptTag({ path: bundle });
        await page.evaluate(async (layout) => {
          const host = document.createElement(
            layout === "direct" ? "ha-dialog" : "ha-adaptive-dialog",
          );
          host.headerTitle = "Light details";
          host.innerHTML =
            '<div style="min-height:240px"><p>Light brightness and weather controls</p><ha-dropdown><button slot="trigger" style="width:180px;height:44px">Choose option</button><ha-dropdown-item>First option</ha-dropdown-item><ha-dropdown-item>Second option</ha-dropdown-item></ha-dropdown></div>';
          document.body.append(host);
          host.open = true;
          window.qaDialog = host;
        }, layout);
        await page.waitForFunction(() => {
          const el = window.deep(
            window.qaDialog.shadowRoot,
            'dialog[part="dialog"]',
          );
          return el?.open && el.getBoundingClientRect().width > 100;
        });
        await page.waitForTimeout(350);
        await page.evaluate(async () => {
          const dropdown = window.qaDialog.querySelector("ha-dropdown");
          dropdown.open = true;
          await dropdown.updateComplete;
        });
        await page.waitForFunction(
          () =>
            window
              .deep(window.qaDialog, '[part="popup"]')
              ?.getBoundingClientRect().height > 10,
        );
        await page.waitForTimeout(150);
        const result = await page.evaluate(
          ({ lite, layout }) => {
            const failures = [];
            let count = 0;
            const check = (ok, label) => {
              count++;
              if (!ok) failures.push(label);
            };
            const dialog = window.deep(
              window.qaDialog.shadowRoot,
              'dialog[part="dialog"]',
            );
            const surface =
              layout === "mobile"
                ? dialog.querySelector('[part="body"]')
                : dialog;
            const style = getComputedStyle(surface);
            const alpha = Number(
              style.backgroundColor.match(
                /(?:rgba\(.*,[ ]*|\/\s*)([\d.]+)\s*\)$/,
              )?.[1] || 1,
            );
            check(
              Math.abs(alpha - (lite ? 1 : 0.35)) < 0.001,
              "surface alpha: " + style.backgroundColor,
            );
            check(
              (style.backdropFilter === "none") === lite,
              "native surface blur: " + style.backdropFilter,
            );
            check(
              getComputedStyle(dialog, "::backdrop").backdropFilter === "none",
              "scrim does not add a second blur",
            );
            check(
              !customElements.get("card-mod") &&
                !customElements.get("uix-node"),
              "popup does not depend on an engine",
            );
            if (layout !== "direct")
              check(
                window.qaDialog.mode ===
                  (layout === "mobile" ? "bottom-sheet" : "dialog"),
                "native adaptive mode",
              );
            const trigger = window.qaDialog
              .querySelector("button")
              .getBoundingClientRect();
            const popup = window
              .deep(window.qaDialog, '[part="popup"]')
              .getBoundingClientRect();
            check(
              Math.abs(popup.left - trigger.left) < 2,
              "dropdown horizontal alignment: " +
                JSON.stringify({ popup, trigger }),
            );
            check(
              Math.abs(popup.top - trigger.bottom) < 2,
              "dropdown vertical alignment: " +
                JSON.stringify({ popup, trigger }),
            );
            return { count, failures };
          },
          { lite: section.name.includes("Lite"), layout },
        );
        assert.deepEqual(
          errors,
          [],
          `${section.name}/${section.mode}/${layout} runtime errors`,
        );
        assert.deepEqual(
          result.failures,
          [],
          `${section.name}/${section.mode}/${layout}`,
        );
        checks += result.count;
        if (process.env.FROSTED_GLASS_SCREENSHOTS && layout === "direct")
          await page.screenshot({
            path: path.join(
              process.env.FROSTED_GLASS_SCREENSHOTS,
              `popup-${section.name.includes("Lite") ? "lite" : "full"}-${section.mode}.png`,
            ),
          });
        await page.close();
        console.log(
          `PASS native dialog ${section.name}/${section.mode}/${layout}`,
        );
      }
  } finally {
    await browser.close();
  }
  console.log(
    `${checks} native dialog checks passed without a styling engine.`,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
