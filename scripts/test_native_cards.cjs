/* Optional integration check with actual audited Mushroom/Bubble bundles.
 * HA services and icon components are mocked; this is not a live HA session.
 */
const { chromium } = require("playwright");
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const mushroomBundle = process.env.FROSTED_GLASS_MUSHROOM_BUNDLE;
const bubbleBundle = process.env.FROSTED_GLASS_BUBBLE_BUNDLE;
assert(
  mushroomBundle && bubbleBundle,
  "Set FROSTED_GLASS_MUSHROOM_BUNDLE and FROSTED_GLASS_BUBBLE_BUNDLE to the audited browser bundles.",
);
const sections = JSON.parse(
  execFileSync(
    "python3",
    [
      "-c",
      `
import json, yaml
from pathlib import Path
from jinja2 import Environment, StrictUndefined
result=[]
for filename in ('Frosted Glass.yaml','Frosted Glass Lite.yaml'):
    theme=next(iter(yaml.safe_load((Path('themes')/filename).read_text()).values()))
    for mode,v in theme['modes'].items():
        template=Environment(undefined=StrictUndefined).from_string(v['card-mod-card'])
        styles={}
        for domain in ('fan','light'):
            for state in ('on','off'):
                styles[domain+'_'+state]=template.render(config={'entity':domain+'.qa'},is_state=lambda e,s,current=state:s==current)
        result.append(dict(name=filename,mode=mode,values=v,styles=styles))
print(json.dumps(result))
`,
    ],
    { cwd: root, encoding: "utf8" },
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
  let count = 0;
  try {
    for (const section of sections) {
      const page = await browser.newPage({
        viewport: { width: 1000, height: 900 },
      });
      await page.route("**/*", (r) => r.abort());
      const wallpaper =
        section.mode === "dark"
          ? "linear-gradient(130deg,#172b42,#51425f,#1b283c)"
          : "linear-gradient(130deg,#f8eadf,#edd9e7,#e8e1d2)";
      await page.setContent(
        `<body style="display:grid;align-content:start;grid-template-columns:repeat(2,400px);gap:20px;background:${wallpaper};padding:30px;min-height:820px"></body>`,
      );
      const pageErrors = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));
      await page.evaluate(() => {
        customElements.define(
          "ha-card",
          class extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" }).innerHTML =
                "<style>:host{display:block;color:var(--primary-text-color);border:var(--ha-card-border);border-radius:var(--ha-card-border-radius);box-shadow:var(--ha-card-box-shadow);background:var(--ha-card-background)}</style><slot></slot>";
            }
          },
        );
        customElements.define(
          "ha-state-icon",
          class extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" }).innerHTML =
                "<style>:host{display:inline-flex;width:24px;height:24px;align-items:center;justify-content:center}</style>✣";
            }
          },
        );
        customElements.define(
          "ha-icon",
          class extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({ mode: "open" }).innerHTML =
                "<style>:host{display:inline-flex;width:24px;height:24px;align-items:center;justify-content:center}</style>✣";
            }
          },
        );
        window.qaHass = {
          states: {},
          entities: {},
          devices: {},
          areas: {},
          translationMetadata: { translations: { en: { isRTL: false } } },
          language: "en",
          themes: { darkMode: true, themes: {} },
          config: {
            version: "2026.9.0",
            unit_system: { temperature: "°C" },
            components: [],
          },
          locale: {
            language: "en",
            number_format: "language",
            time_format: "24",
            week_start: "monday",
          },
          localize: (k) => k,
          formatEntityName: (s) => s.attributes.friendly_name,
          formatEntityState: (s) => s.state,
          formatEntityAttributeValue: (s, k, v) => String(v),
          hassUrl: (p) => p,
          callWS: async () => ({}),
        };
      });
      await page.addScriptTag({ path: mushroomBundle });
      await page.addScriptTag({ path: bubbleBundle });
      const result = await page.evaluate(
        async ({ values: v, styles, mode }) => {
          const errors = [];
          let count = 0;
          const check = (value, label) => {
            count++;
            if (!value) errors.push(label);
          };
          const css = (e, p, pseudo) =>
            getComputedStyle(e, pseudo).getPropertyValue(p).trim();
          for (const [k, value] of Object.entries(v)) {
            if (!k.startsWith("card-mod-") && !k.startsWith("uix-"))
              document.documentElement.style.setProperty("--" + k, value);
          }
          document.body.style.color = "var(--primary-text-color)";
          const hass = window.qaHass;
          hass.themes.darkMode = mode === "dark";
          const state = (domain, on) => ({
            entity_id: domain + ".qa",
            state: on ? "on" : "off",
            attributes: {
              friendly_name:
                domain === "fan" ? "Living Room Fan" : "Living Room Light",
              supported_features: 63,
              percentage: 43,
              brightness: 219,
              rgb_color: [255, 176, 91],
              supported_color_modes: ["rgb"],
              color_mode: "rgb",
            },
          });
          async function mushroom(domain) {
            const e = document.createElement("mushroom-" + domain + "-card");
            e.setConfig({
              type: "custom:mushroom-" + domain + "-card",
              entity: domain + ".qa",
              icon_animation: false,
              show_percentage_control: domain === "fan",
              show_brightness_control: domain === "light",
            });
            hass.states[domain + ".qa"] = state(domain, true);
            e.hass = { ...hass };
            document.body.append(e);
            await e.updateComplete;
            const cm = document.createElement("card-mod");
            const style = document.createElement("style");
            style.textContent = styles[domain + "_on"];
            cm.append(style);
            e.shadowRoot.append(cm);
            return {
              e,
              style,
              icon: e.shadowRoot.querySelector(
                "mushroom-shape-icon ha-state-icon",
              ),
              surface: e.shadowRoot.querySelector("ha-card"),
            };
          }
          const fan = await mushroom("fan");
          check(
            !fan.icon.hasAttribute("data-state"),
            "native Mushroom icon has no synthetic state",
          );
          check(
            css(fan.icon, "animation-name") === "none",
            "theme honors disabled native Mushroom animation",
          );
          check(
            css(fan.surface, "background-color") === "rgba(0, 0, 0, 0)",
            "native Mushroom fan card transparent",
          );
          hass.states["fan.qa"] = state("fan", false);
          fan.e.hass = { ...hass };
          await fan.e.updateComplete;
          fan.style.textContent = styles.fan_off;
          check(
            css(fan.icon, "animation-name") === "none",
            "native Mushroom off fan stops",
          );
          const light = await mushroom("light");
          light.surface.style.transition = "none";
          const onShadow = css(light.surface, "box-shadow");
          check(
            css(light.icon, "filter") === "none",
            "native Mushroom light has no theme filter",
          );
          check(
            css(light.surface, "background-color") === "rgba(0, 0, 0, 0)",
            "native Mushroom light card transparent",
          );
          hass.states["light.qa"] = state("light", false);
          light.e.hass = { ...hass };
          await light.e.updateComplete;
          light.style.textContent = styles.light_off;
          check(
            css(light.surface, "box-shadow") === onShadow,
            "native Mushroom shadow does not change with light state",
          );
          check(
            css(light.icon, "filter") === "none",
            "native Mushroom off light has no theme filter",
          );
          // Bubble's actual JavaScript attaches is-on to ha-card and sets an
          // active native background. Explicit icons avoid a HA icon API request.
          async function bubble(domain) {
            const e = document.createElement("bubble-card");
            e.setConfig({
              type: "custom:bubble-card",
              card_type: "button",
              button_type: "switch",
              entity: domain + ".qa",
              icon: domain === "fan" ? "mdi:fan" : "mdi:lightbulb",
              show_state: true,
            });
            hass.states[domain + ".qa"] = state(domain, true);
            document.body.append(e);
            e.hass = { ...hass };
            for (let i = 0; i < 20; i++) {
              const icon = e.shadowRoot?.querySelector(".bubble-main-icon");
              if (
                icon &&
                getComputedStyle(icon).display !== "none" &&
                icon.getBoundingClientRect().width > 0
              )
                break;
              await new Promise((r) => requestAnimationFrame(r));
            }
            const cm = document.createElement("card-mod");
            const style = document.createElement("style");
            style.textContent = styles[domain + "_on"];
            cm.append(style);
            e.shadowRoot.append(cm);
            return {
              e,
              style,
              icon: e.shadowRoot.querySelector(".bubble-main-icon"),
              surface: e.shadowRoot.querySelector(".bubble-container"),
            };
          }
          const bubbleFan = await bubble("fan");
          check(
            bubbleFan.e.shadowRoot
              .querySelector("ha-card")
              .classList.contains("is-on"),
            "native Bubble marks ha-card on",
          );
          check(
            css(bubbleFan.icon, "animation-name") === "none",
            "native Bubble fan animation",
          );
          check(
            css(bubbleFan.surface, "background-color") === "rgba(0, 0, 0, 0)",
            "native Bubble surface transparent",
          );
          check(
            css(bubbleFan.surface, "box-shadow").includes("inset"),
            "native Bubble corner highlights",
          );
          hass.states["fan.qa"] = state("fan", false);
          bubbleFan.e.hass = { ...hass };
          bubbleFan.style.textContent = styles.fan_off;
          for (
            let i = 0;
            i < 20 &&
            !bubbleFan.e.shadowRoot
              .querySelector("ha-card")
              .classList.contains("is-off");
            i++
          )
            await new Promise((r) => requestAnimationFrame(r));
          check(
            bubbleFan.e.shadowRoot
              .querySelector("ha-card")
              .classList.contains("is-off"),
            "native Bubble marks fan off",
          );
          check(
            css(bubbleFan.icon, "animation-name") === "none",
            "native Bubble off fan stops",
          );
          const bubbleLight = await bubble("light");
          bubbleLight.surface.style.transition = "none";
          const bubbleOnShadow = css(bubbleLight.surface, "box-shadow");
          const bg =
            bubbleLight.e.shadowRoot.querySelector(".bubble-background");
          check(
            css(bg, "background-color") === "rgba(0, 0, 0, 0)",
            "native Bubble active background transparent: " +
              JSON.stringify({
                color: css(bg, "background-color"),
                html: bg.outerHTML,
                style: bubbleLight.style.isConnected,
                length: bubbleLight.style.textContent.length,
              }),
          );
          hass.states["light.qa"] = state("light", false);
          bubbleLight.e.hass = { ...hass };
          bubbleLight.style.textContent = styles.light_off;
          for (
            let i = 0;
            i < 20 &&
            !bubbleLight.e.shadowRoot
              .querySelector("ha-card")
              .classList.contains("is-off");
            i++
          )
            await new Promise((r) => requestAnimationFrame(r));
          check(
            css(bubbleLight.surface, "box-shadow") === bubbleOnShadow,
            "native Bubble light shadow is independent of state",
          );
          const manual = document.createElement("style");
          manual.textContent =
            "ha-card{box-shadow:0 0 10px 2px rgba(255,165,0,.3)!important;border:1px solid rgba(255,165,0,.1)!important}";
          bubbleLight.e.shadowRoot.append(manual);
          const outerLight = bubbleLight.e.shadowRoot.querySelector("ha-card");
          check(
            css(outerLight, "box-shadow") ===
              "rgba(255, 165, 0, 0.3) 0px 0px 10px 2px",
            "Bubble accepts manual glow overriding its native inline reset",
          );
          check(
            css(outerLight, "border-top-color") === "rgba(255, 165, 0, 0.1)",
            "Bubble accepts manual border overriding its native inline reset",
          );
          manual.textContent =
            ".bubble-container{box-shadow:0 0 10px 2px rgba(255,165,0,.3);border:1px solid rgba(255,165,0,.1)}";
          check(
            css(bubbleLight.surface, "box-shadow") ===
              "rgba(255, 165, 0, 0.3) 0px 0px 10px 2px",
            "Bubble inner surface accepts normal manual glow",
          );
          check(
            css(bubbleLight.surface, "border-top-color") ===
              "rgba(255, 165, 0, 0.1)",
            "Bubble inner surface accepts normal manual border",
          );
          manual.remove();
          // The real standalone popup is a sibling of ha-card. Its own native
          // background and inline blur defaults must obey the Full/Lite split.
          const lite = v["frosted-glass-popup-backdrop-filter"] === "none";
          const popupCard = document.createElement("bubble-card");
          const popupConfig = {
            type: "custom:bubble-card",
            card_type: "pop-up",
            hash: "#qa-popup",
            name: "Native Bubble popup",
            icon: "mdi:lightbulb",
            cards: [],
            background_update: true,
          };
          popupCard.setConfig(popupConfig);
          document.body.append(popupCard);
          popupCard.hass = { ...hass };
          const popupStyle = document.createElement("style");
          popupStyle.textContent = styles.light_on;
          popupCard.shadowRoot.append(popupStyle);
          location.hash = "qa-popup";
          const popupBackground = () =>
            popupCard.shadowRoot.querySelector(".bubble-pop-up-background");
          for (let i = 0; i < 90; i++) {
            if (
              popupBackground() &&
              popupCard.shadowRoot
                .querySelector(".bubble-pop-up")
                ?.classList.contains("is-popup-opened")
            )
              break;
            await new Promise((r) => requestAnimationFrame(r));
          }
          const popup = popupCard.shadowRoot.querySelector(".bubble-pop-up");
          check(!!popupBackground(), "native standalone Bubble popup renders");
          const popupTint = css(popupBackground(), "background-color");
          check(
            lite
              ? popupTint === v["primary-background-color"]
              : popupTint.endsWith(", 0.35)"),
            "native Bubble popup has requested alpha: " + popupTint,
          );
          check(
            (css(popup, "backdrop-filter") === "none") === lite,
            "native Bubble popup has Full blur / Lite none: " +
              css(popup, "backdrop-filter"),
          );
          check(
            popup.parentElement?.tagName !== "HA-CARD",
            "Bubble popup remains outside the card blur layer",
          );
          popupCard.remove();
          const backdropCard = document.createElement("bubble-card");
          backdropCard.setConfig({
            ...popupConfig,
            hash: "#qa-backdrop",
            backdrop_blur: 20,
          });
          document.body.append(backdropCard);
          backdropCard.hass = { ...hass };
          backdropCard.shadowRoot.append(popupStyle.cloneNode(true));
          location.hash = "qa-backdrop";
          const backdrop = () =>
            document.querySelector(".bubble-backdrop-host")?.shadowRoot
              .querySelector(".bubble-backdrop");
          for (let i = 0; i < 90; i++) {
            if (backdrop()?.style.getPropertyValue("--custom-backdrop-filter"))
              break;
            await new Promise((r) => requestAnimationFrame(r));
          }
          check(
            css(backdrop(), "backdrop-filter") === (lite ? "none" : "blur(20px)"),
            "Lite suppresses native configured Bubble backdrop blur; Full honors it: " +
              JSON.stringify({
                actual: css(backdrop(), "backdrop-filter"),
                inline: backdrop().getAttribute("style"),
              }),
          );
          backdropCard.remove();
          window.qaFan = fan;
          hass.states["fan.qa"] = state("fan", true);
          fan.e.hass = { ...hass };
          fan.style.textContent = styles.fan_on;
          hass.states["light.qa"] = state("light", true);
          light.e.hass = { ...hass };
          light.style.textContent = styles.light_on;
          bubbleFan.e.hass = { ...hass };
          bubbleFan.style.textContent = styles.fan_on;
          bubbleLight.e.hass = { ...hass };
          bubbleLight.style.textContent = styles.light_on;
          await fan.e.updateComplete;
          await light.e.updateComplete;
          for (
            let i = 0;
            i < 20 &&
            !bubbleLight.e.shadowRoot
              .querySelector("ha-card")
              .classList.contains("is-on");
            i++
          )
            await new Promise((r) => requestAnimationFrame(r));
          return { errors, count };
        },
        section,
      );
      assert.deepEqual(result.errors, [], section.name + "/" + section.mode);
      assert.deepEqual(pageErrors, [], section.name + " native JavaScript");
      if (process.env.FROSTED_GLASS_SCREENSHOTS) {
        fs.mkdirSync(process.env.FROSTED_GLASS_SCREENSHOTS, {
          recursive: true,
        });
        await page.screenshot({
          path: path.join(
            process.env.FROSTED_GLASS_SCREENSHOTS,
            `native-${section.name.includes("Lite") ? "lite" : "full"}-${section.mode}.png`,
          ),
        });
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await page.evaluate(
          () => getComputedStyle(window.qaFan.icon).animationName,
        ),
        "none",
      );
      count += result.count + 1;
      console.log("PASS native Mushroom/Bubble", section.name, section.mode);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log(count + " native component checks passed");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
