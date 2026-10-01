/* Rendered-pixel regressions: a computed inset shadow can exist while a blur
 * layer erases it. Optional native HA bundles use the actual card/badge code. */
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const root = path.resolve(__dirname, "..");
const sections = JSON.parse(execFileSync("python3", ["-c", `
import json,os,yaml
from pathlib import Path
result=[]
for p in Path(os.environ.get('FROSTED_GLASS_THEMES_DIR','themes')).glob('*.yaml'):
 for name,t in yaml.safe_load(p.read_text()).items():
  if len(t.get('modes',{}))==2:
   for mode,v in t['modes'].items(): result.append(dict(name=name,mode=mode,values=v))
print(json.dumps(result))
`], { cwd: root, encoding: "utf8" }));
assert.equal(sections.length, 4, "Expected combined Full/Lite themes in both modes.");

// Decode browser screenshots with the browser's PNG decoder; no image library
// is needed in CI. Inspect straight edges beside each rounded glass corner.
async function reflections(page, painted, plain, width, height) {
  return page.evaluate(async ({ painted, plain, width, height }) => {
    async function pixels(data) {
      const image = new Image();
      image.src = "data:image/png;base64," + data;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      return { data: ctx.getImageData(0, 0, image.width, image.height).data, scale: image.width / width };
    }
    const a = await pixels(painted), b = await pixels(plain);
    const regions = [
      [[20, 0.5, 35, 3.5], [0.5, 20, 3.5, Math.min(height / 2, 35)]],
      [[width - 35, height - 3.5, width - 20, height - 0.5],
       [width - 3.5, height - 35, width - 0.5, height - 20]],
    ];
    return regions.map(rects => {
      const gains = [];
      for (const [x1, y1, x2, y2] of rects)
        for (let y = Math.ceil(y1 * a.scale); y < Math.floor(y2 * a.scale); y++)
          for (let x = Math.ceil(x1 * a.scale); x < Math.floor(x2 * a.scale); x++) {
            const i = (y * Math.round(width * a.scale) + x) * 4;
            gains.push((a.data[i] - b.data[i] + a.data[i + 1] - b.data[i + 1] + a.data[i + 2] - b.data[i + 2]) / 3);
          }
      gains.sort((x, y) => y - x);
      const top = gains.slice(0, Math.max(1, Math.ceil(gains.length / 10)));
      return top.reduce((n, x) => n + x, 0) / top.length;
    });
  }, { painted: painted.toString("base64"), plain: plain.toString("base64"), width, height });
}

async function textureRange(page, screenshot, width, badge) {
  return page.evaluate(async ({ data, width, badge }) => {
    const image = new Image(); image.src = "data:image/png;base64," + data;
    await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d"); ctx.drawImage(image, 0, 0);
    const scale = image.width / width;
    const roi = badge ? [70, 5, 40, 3] : [140, 85, 40, 8];
    const pixels = ctx.getImageData(...roi.map(x => Math.round(x * scale))).data;
    let low = 255, high = 0;
    for (let i = 0; i < pixels.length; i += 4) { low = Math.min(low, pixels[i]); high = Math.max(high, pixels[i]); }
    return high - low;
  }, { data: screenshot.toString("base64"), width, badge });
}

(async () => {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.FROSTED_GLASS_BROWSER ? { executablePath: process.env.FROSTED_GLASS_BROWSER, args: ["--no-sandbox", "--disable-gpu"] } : {}) });
  const failures = [];
  const strengths = [];
  let count = 0;
  const check = (ok, label) => { count++; if (!ok) failures.push(label); };
  try {
    for (const section of sections) {
      const page = await browser.newPage({ viewport: { width: 460, height: 300 }, deviceScaleFactor: 2 });
      await page.route("**/*", r => r.abort());
      await page.setContent('<body style="margin:0;background:#35465a;color:white;font:14px system-ui"><qa-glass-host style="display:block;padding:32px"></qa-glass-host></body>');
      if (process.env.FROSTED_GLASS_HA_BUNDLE)
        await page.addScriptTag({ path: process.env.FROSTED_GLASS_HA_BUNDLE });
      await page.evaluate(async ({ values: v }) => {
        if (!customElements.get("ha-card")) customElements.define("ha-card", class extends HTMLElement {
          constructor() { super(); this.attachShadow({ mode: "open" }).innerHTML = '<style>:host{display:block;position:relative;box-sizing:border-box;border:var(--ha-card-border);border-radius:var(--ha-card-border-radius);box-shadow:var(--ha-card-box-shadow);background:var(--ha-card-background);backdrop-filter:var(--ha-card-backdrop-filter)}</style><slot></slot>'; }
        });
        if (!customElements.get("ha-badge")) customElements.define("ha-badge", class extends HTMLElement {
          constructor() { super(); this.attachShadow({ mode: "open" }).innerHTML = '<style>.badge{box-sizing:border-box;height:36px;border:var(--ha-card-border);border-radius:18px;background:var(--ha-card-background);backdrop-filter:var(--ha-card-backdrop-filter);box-shadow:var(--ha-card-box-shadow);display:flex;align-items:center;justify-content:center}</style><div class="badge"><slot></slot></div>'; }
        });
        const host = document.querySelector("qa-glass-host");
        for (const [k, value] of Object.entries(v)) if (typeof value === "string" && !k.startsWith("card-mod-") && !k.startsWith("uix-")) host.style.setProperty("--" + k, value);
        const shadow = host.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = v["card-mod-card"] + v["card-mod-badge"] + '\nha-card{width:320px;height:140px;padding:40px;transition:none}ha-badge{display:block;width:180px;margin-top:24px}';
        shadow.append(style);
        const card = document.createElement("ha-card"); card.textContent = "Glass card"; shadow.append(card);
        const badge = document.createElement("ha-badge"); badge.textContent = "Living Room"; shadow.append(badge);
        await card.updateComplete; await badge.updateComplete;
        badge.shadowRoot.querySelector(".badge").style.transition = "none";
        window.qaGlass = { shadow, card, badge };
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      }, section);
      const boxes = await page.evaluate(() => {
        const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
        return [rect(window.qaGlass.card), rect(window.qaGlass.badge.shadowRoot.querySelector(".badge"))];
      });
      const painted = [];
      for (const clip of boxes) painted.push(await page.screenshot({ clip }));
      await page.evaluate(() => {
        const off = document.createElement("style"); off.id = "qa-no-reflections";
        off.textContent = 'ha-card{box-shadow:var(--frosted-glass-card-depth-shadow)}ha-card::before{box-shadow:none}ha-badge{--ha-card-box-shadow:none}';
        window.qaGlass.shadow.append(off);
      });
      const plain = [];
      for (const clip of boxes) plain.push(await page.screenshot({ clip }));
      const gains = [];
      for (let i = 0; i < boxes.length; i++) gains.push(await reflections(page, painted[i], plain[i], boxes[i].width, boxes[i].height));
      const label = section.name + "/" + section.mode;
      for (let i = 0; i < gains.length; i++) {
        check(gains[i][0] >= 4, label + (i ? " badge" : " card") + " top-left glass is actually visible: " + gains[i][0].toFixed(2));
        check(gains[i][1] >= 4, label + (i ? " badge" : " card") + " bottom-right glass is actually visible: " + gains[i][1].toFixed(2));
      }
      strengths.push({ name: section.name, mode: section.mode, gains });
      // A pixel pattern must actually blur in Full and stay sharp in Lite.
      await page.evaluate(() => {
        document.querySelector("qa-glass-host").style.setProperty("--ha-card-glass-inset-shadow", "0 0 0 0 transparent");
        document.body.style.background = "repeating-linear-gradient(90deg,#224a65 0 3px,#9a5172 3px 6px)";
      });
      for (let i = 0; i < boxes.length; i++) {
        const range = await textureRange(page, await page.screenshot({ clip: boxes[i] }), boxes[i].width, !!i);
        check(section.name.includes("Lite") ? range >= 40 : range <= 12, label + (i ? " badge" : " card") + " actually renders Full blur / sharp Lite texture: " + range);
      }
      if (process.env.FROSTED_GLASS_SCREENSHOTS) {
        fs.mkdirSync(process.env.FROSTED_GLASS_SCREENSHOTS, { recursive: true });
        for (let i = 0; i < painted.length; i++) fs.writeFileSync(path.join(process.env.FROSTED_GLASS_SCREENSHOTS, `${section.name.includes("Lite") ? "lite" : "full"}-${section.mode}-${i ? "badge" : "card"}.png`), painted[i]);
      }
      console.log(label, JSON.stringify(gains));
      await page.close();
    }
    for (const mode of ["light", "dark"]) {
      const full = strengths.find(x => x.mode === mode && !x.name.includes("Lite"));
      const lite = strengths.find(x => x.mode === mode && x.name.includes("Lite"));
      if (full && lite) for (let i = 0; i < 2; i++) for (let corner = 0; corner < 2; corner++) {
        check(full.gains[i][corner] >= lite.gains[i][corner] * 0.75, mode + (i ? " badge" : " card") + " Full keeps visible glass strength relative to Lite");
        check(full.gains[i][corner] <= lite.gains[i][corner] * 1.25, mode + (i ? " badge" : " card") + " Full does not double the corner reflections");
      }
    }
    assert.deepEqual(failures, []);
    console.log(count + " rendered glass pixel checks passed.");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
