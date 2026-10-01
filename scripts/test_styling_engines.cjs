/* Integration checks with unmodified card-mod/UIX bundles and the audited HA
 * Tile/Heading/Entity Badge/ha-card and Navbar sources. HA backend/actions/icon registry and
 * feature services are fixtures; this is not a live Home Assistant session. */
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const engines = [
  ["card-mod", process.env.FROSTED_GLASS_CARD_MOD_BUNDLE],
  ["uix", process.env.FROSTED_GLASS_UIX_BUNDLE],
].filter(([, file]) => file);
assert(
  engines.length &&
    process.env.FROSTED_GLASS_HA_BUNDLE &&
    process.env.FROSTED_GLASS_NAVBAR_BUNDLE,
  "Set FROSTED_GLASS_HA_BUNDLE, FROSTED_GLASS_NAVBAR_BUNDLE and at least one styling-engine bundle.",
);
const sections = JSON.parse(
  execFileSync(
    "python3",
    [
      "-c",
      `
import json, os, pathlib, yaml
result=[]
for file in pathlib.Path(os.environ.get('FROSTED_GLASS_THEMES_DIR','themes')).glob('*.yaml'):
 for name, theme in yaml.safe_load(file.read_text()).items():
  if len(theme.get('modes',{}))!=2: continue
  for mode, values in theme['modes'].items(): result.append(dict(name=name,mode=mode,values=values))
print(json.dumps(result))
`,
    ],
    { cwd: root, encoding: "utf8" },
  ),
);
const manualClear = `ha-card {background:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important;border:none!important;}
ha-card::before {content:none!important;background:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}`;
const manualGlow = `ha-card { {% if is_state(config.entity,'on') %} box-shadow:0px 0px 10px 2px rgba(255,165,0,0.3);border:1px solid rgba(255,165,0,0.1); {% endif %} }`;
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
    for (const [engine, bundle] of engines)
      for (const section of sections) {
        const page = await browser.newPage({
          viewport: { width: 1280, height: 960 },
        });
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.route("**/*", (r) =>
          r.request().url() === "https://frosted-glass.test/"
            ? r.fulfill({
                contentType: "text/html",
                body: '<body style="margin:0;background:linear-gradient(135deg,#64859c,#dad0ba,#485463);font:16px system-ui"></body>',
              })
            : r.abort(),
        );
        await page.goto("https://frosted-glass.test/");
        await page.exposeFunction("renderTemplate", (message, states) =>
          execFileSync(
            "python3",
            [
              "-c",
              `
import json,sys
from jinja2 import Environment,StrictUndefined
m,states=json.loads(sys.argv[1])
print(Environment(undefined=StrictUndefined).from_string(m['template']).render(**m['variables'],is_state=lambda e,s:states.get(e,{}).get('state')==s))
`,
              JSON.stringify([message, states]),
            ],
            { encoding: "utf8" },
          ),
        );
        await page.evaluate(({ values, mode }) => {
          for (const [k, v] of Object.entries(values))
            if (!k.startsWith("card-mod-") && !k.startsWith("uix-"))
              document.documentElement.style.setProperty("--" + k, v);
          document.documentElement.style.setProperty(
            "--card-mod-theme",
            values["card-mod-theme"],
          );
          document.documentElement.style.setProperty(
            "--uix-theme",
            values["uix-theme"],
          );
          window.qaSubscriptions = [];
          window.qaHass = {
            states: {},
            entities: {},
            devices: {},
            areas: {},
            user: { id: "qa", name: "QA" },
            panels: {},
            language: "en",
            locale: {
              language: "en",
              number_format: "language",
              time_format: "24",
              week_start: "monday",
            },
            translationMetadata: { translations: { en: { isRTL: false } } },
            themes: {
              theme: values["card-mod-theme"],
              darkMode: mode === "dark",
              themes: { [values["card-mod-theme"]]: values },
            },
            config: {
              version: "2026.9.0",
              components: [],
              unit_system: { temperature: "°C" },
            },
            localize: (k) => k,
            formatEntityName: (s) => s.attributes.friendly_name,
            formatEntityState: (s) => s.state,
            formatEntityAttributeValue: (s, k, v) => String(v),
            callService: async () => {},
            callWS: async () => ({}),
            connection: {
              addEventListener: () => {},
              removeEventListener: () => {},
              subscribeEvents: async () => () => {},
              subscribeMessage: async (callback, message) => {
                const item = { callback, message };
                window.qaSubscriptions.push(item);
                if (message.type === "render_template")
                  callback({
                    result: await window.renderTemplate(
                      message,
                      window.qaHass.states,
                    ),
                    listeners: {},
                  });
                return () => {
                  window.qaSubscriptions = window.qaSubscriptions.filter(
                    (s) => s !== item,
                  );
                };
              },
            },
          };
          customElements.define("home-assistant", class extends HTMLElement {});
          for (const tag of [
            "home-assistant-main",
            "partial-panel-resolver",
            "ha-panel-lovelace",
            "hui-root",
            "developer-tools-event",
          ])
            customElements.define(tag, class extends HTMLElement {});
          customElements.define(
            "ha-yaml-editor",
            class extends HTMLElement {
              _onChange(e) {
                this.value = window.qaParseYaml(e.detail.value);
                this.isValid = true;
              }
            },
          );
          const home = document.createElement("home-assistant");
          home.hass = window.qaHass;
          document.body.append(home);
          const main = document.createElement("home-assistant-main");
          home.attachShadow({ mode: "open" }).append(main);
          const resolver = document.createElement("partial-panel-resolver");
          main.attachShadow({ mode: "open" }).append(resolver);
          const panel = document.createElement("ha-panel-lovelace");
          panel.hass = window.qaHass;
          panel.panel = { url_path: "", component_name: "lovelace" };
          panel.route = { prefix: "", path: "" };
          resolver.append(panel);
          const hui = document.createElement("hui-root");
          hui.config = { views: [{}] };
          panel.attachShadow({ mode: "open" }).append(hui);
          hui.attachShadow({ mode: "open" });
          customElements.define(
            "hui-card",
            class extends HTMLElement {
              _loadElement() {
                this.append(this._element);
              }
            },
          );
          customElements.define(
            "hui-badge",
            class extends HTMLElement {
              _loadElement() { this.append(this._element); }
            },
          );
          window.qaGrid = document.createElement("div");
          window.qaGrid.style.cssText =
            "display:grid;grid-template-columns:repeat(2,400px);gap:24px;padding:32px";
          document.body.append(window.qaGrid);
        }, section);
        await page.addScriptTag({ path: process.env.FROSTED_GLASS_HA_BUNDLE });
        await page.addScriptTag({
          path: process.env.FROSTED_GLASS_NAVBAR_BUNDLE,
        });
        if (process.env.FROSTED_GLASS_MDC_BUNDLE)
          await page.addScriptTag({
            path: process.env.FROSTED_GLASS_MDC_BUNDLE,
          });
        await page.addScriptTag({ path: bundle });
        assert.deepEqual(
          errors,
          [],
          `${engine} component initialization errors`,
        );
        await page.evaluate(
          async ({ manualClear, manualGlow }) => {
            await new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r)),
            );
            const state = (id, value) => ({
              entity_id: id,
              state: value,
              attributes: {
                friendly_name: id,
                percentage: 50,
                supported_features: 63,
                brightness: 160,
                supported_color_modes: ["brightness"],
                color_mode: "brightness",
              },
            });
            window.qaHass.states = {
              "fan.dmaker_p18_4f0c_fan": state("fan.dmaker_p18_4f0c_fan", "on"),
              "light.lsc_moodlight": state("light.lsc_moodlight", "on"),
            };
            window.qaCards = {};
            const add = (key, tag, config, wrapperTag = "hui-card") => {
              const card = document.createElement(tag);
              card.setConfig(config);
              card.hass = window.qaHass;
              const wrapper = document.createElement(wrapperTag);
              wrapper.config = config;
              wrapper._element = card;
              window.qaGrid.append(wrapper);
              wrapper._loadElement();
              window.qaCards[key] = card;
            };
            add("fan", "hui-tile-card", {
              type: "tile",
              entity: "fan.dmaker_p18_4f0c_fan",
              features: [{ type: "fan-speed" }],
              features_position: "inline",
              vertical: false,
              grid_options: { columns: 24, rows: 1 },
            });
            add("light", "hui-tile-card", {
              type: "tile",
              entity: "light.lsc_moodlight",
              features_position: "bottom",
              vertical: false,
              name: "Moodlight",
            });
            add("badge", "hui-entity-badge", {
              type: "entity", entity: "light.lsc_moodlight",
            }, "hui-badge");
            add("manualLight", "hui-tile-card", {
              type: "tile",
              entity: "light.lsc_moodlight",
              card_mod: { style: manualGlow },
            });
            add("heading", "hui-heading-card", {
              type: "heading",
              heading: "Calendar",
              card_mod: { style: manualClear },
            });
            add("clearTile", "hui-tile-card", {
              type: "tile",
              entity: "light.lsc_moodlight",
              card_mod: { style: manualClear },
            });
            add("navbar", "navbar-card", {
              type: "custom:navbar-card",
              routes: [{ url: "/dashboard", icon: "mdi:home", label: "Home" }],
              layout: { auto_padding: { enabled: false } },
              desktop: { position: "bottom" },
              mobile: { mode: "floating" },
            });
            add("customNavbar", "navbar-card", {
              type: "custom:navbar-card",
              routes: [{ url: "/dashboard", icon: "mdi:home" }],
              layout: { auto_padding: { enabled: false } },
              card_mod: {
                style: ":host {\n--navbar-background-color : rgb(12,34,56)}",
              },
            });
            add("styledNavbar", "navbar-card", {
              type: "custom:navbar-card",
              routes: [{ url: "/dashboard", icon: "mdi:home" }],
              layout: { auto_padding: { enabled: false } },
              styles: ":host {--navbar-background-color:rgb(23,45,67)}",
            });
          },
          { manualClear, manualGlow },
        );
        await page
          .waitForFunction(
            () =>
              Object.values(window.qaCards).every((c) =>
                [...c.shadowRoot.querySelectorAll("card-mod,uix-node")].some(
                  (e) => e.textContent.includes("frosted-glass"),
                ),
              ),
            null,
            { timeout: 5000 },
          )
          .catch(async (e) => {
            console.log(
              "Engine diagnostics",
              JSON.stringify(
                await page.evaluate(() => ({
                  cards: Object.fromEntries(
                    Object.entries(window.qaCards).map(([k, c]) => [
                      k,
                      {
                        mods: c._cardMod?.map((cm) => ({
                          input: cm.card_mod_input,
                          fixed: cm._fixed_styles,
                          variables: cm.variables,
                          theme:
                            getComputedStyle(cm).getPropertyValue(
                              "--card-mod-theme",
                            ),
                          type: cm.type,
                        })),
                        css: getComputedStyle(
                          c.shadowRoot.querySelector("ha-card,ha-badge"),
                        ).boxShadow,
                      },
                    ]),
                  ),
                  templates: Object.values(
                    window.cardMod_template_cache || {},
                  ).map((t) => ({ error: t.error, length: t.value.length })),
                  subscriptions: window.qaSubscriptions.length,
                })),
              ),
            );
            throw e;
          });
        await page.waitForTimeout(350);
        await page.evaluate(() => {
          const fallback = document.createElement("ha-tile-icon");
          fallback.dataset.domain = "fan";
          fallback.dataset.state = "on";
          fallback.icon = "mdi:fan";
          fallback.style.setProperty("--tile-icon-size", "40px");
          window.qaCards.fan.shadowRoot.append(fallback);
          window.qaFallback = fallback;
        });
        await page.evaluate(() => {
          // Model the native style order used by builds that adopt their defaults.
          // Adopted sheets follow ordinary <style> nodes, even those added by an engine.
          const shadow = window.qaCards.navbar.shadowRoot;
          const native = shadow.querySelector("#navbar-card-default-styles");
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(native.textContent);
          shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
          native.remove();
        });
        const result = await page.evaluate(
          ({ lite }) => {
            const failures = [];
            let count = 0;
            const check = (ok, label) => {
              count++;
              if (!ok) failures.push(label);
            };
            const css = (e, p, pseudo) =>
              getComputedStyle(e, pseudo).getPropertyValue(p).trim();
            const card = (key) =>
              window.qaCards[key].shadowRoot.querySelector("ha-card");
            const glow = css(card("light"), "box-shadow");
            check(
              !glow.includes("255, 165, 0"),
              "native Tile has no automatic light glow: " + glow,
            );
            check(
              css(card("manualLight"), "box-shadow") ===
                "rgba(255, 165, 0, 0.3) 0px 0px 10px 2px",
              "manual glow must win: " + css(card("manualLight"), "box-shadow"),
            );
            check(
              css(card("manualLight"), "border-top-color") ===
                "rgba(255, 165, 0, 0.1)",
              "manual light border must win",
            );
            for (const key of ["heading", "clearTile"]) {
              check(
                css(card(key), "background-color") === "rgba(0, 0, 0, 0)",
                key + " clears background",
              );
              check(
                css(card(key), "backdrop-filter") === "none",
                key + " clears host blur",
              );
              check(
                css(card(key), "content", "::before") === "none",
                key +
                  " removes glass layer: " +
                  css(card(key), "content", "::before"),
              );
              check(
                css(card(key), "box-shadow") === "none",
                key + " clears all shadows",
              );
            }
            check(
              css(card("navbar"), "background-color") === "rgba(0, 0, 0, 0)",
              "actual Navbar transparency: " +
                css(card("navbar"), "background-color"),
            );
            check(
              (css(card("navbar"), "backdrop-filter") === "none") === lite,
              "actual Navbar blur",
            );
            check(
              css(card("customNavbar"), "background-color") ===
                "rgb(12, 34, 56)",
              "Navbar explicit public variable is preserved",
            );
            check(
              css(card("styledNavbar"), "background-color") ===
                "rgb(23, 45, 67)",
              "Navbar native styles public variable is preserved",
            );
            check(
              css(card("light"), "box-shadow", lite ? undefined : "::before").includes("inset"),
              "corner highlights on the rendered card layer",
            );
            const badge = window.qaCards.badge.shadowRoot.querySelector("ha-badge");
            const badgeSurface = badge.shadowRoot.querySelector(".badge");
            check(css(badgeSurface, "box-shadow").includes("inset"), "native badge glass reflections survive the engine hook");
            check(css(badge, "backdrop-filter") === "none", "badge host avoids a duplicate blur");
            check((css(badgeSurface, "backdrop-filter") === "none") === lite, "native badge surface owns Full blur / Lite none");
            const icon =
              window.qaCards.fan.shadowRoot.querySelector("ha-state-icon");
            check(
              css(icon, "animation-name") === "none",
              "theme leaves active Tile fan still",
            );
            const fallback =
              window.qaFallback.shadowRoot.querySelector(".container ha-icon");
            check(
              css(fallback, "animation-name") === "none",
              "theme leaves fallback icon still",
            );
            check(
              window.qaSubscriptions
                .filter((s) => s.message.type === "render_template")
                .every((s) => !s.message.template.includes("{% set")),
              "only user-provided CSS uses backend templates",
            );
            return { count, failures };
          },
          { lite: section.name.includes("Lite") },
        );
        checks += result.count;
        console.log(engine, section.name, section.mode, JSON.stringify(result));
        assert.deepEqual(errors, [], `${engine} browser errors`);
        assert.deepEqual(
          result.failures,
          [],
          `${engine} ${section.name} ${section.mode}`,
        );
        await page.emulateMedia({ reducedMotion: "reduce" });
        assert(
          await page.evaluate(
            () =>
              getComputedStyle(
                window.qaCards.fan.shadowRoot.querySelector("ha-state-icon"),
              ).animationName === "none",
          ),
          "Tile fan respects reduced motion",
        );
        checks++;
        assert(
          await page.evaluate(
            () =>
              getComputedStyle(
                window.qaFallback.shadowRoot.querySelector(
                  ".container ha-icon",
                ),
              ).animationName === "none",
          ),
          "internal Tile fan respects reduced motion",
        );
        checks++;
        await page.emulateMedia({ reducedMotion: "no-preference" });
        if (process.env.FROSTED_GLASS_MDC_BUNDLE) {
          await page.evaluate(async (engine) => {
            const dialog = document.createElement("ha-dialog");
            dialog.open = true;
            dialog.heading = "Moodlight";
            dialog.hideActions = true;
            dialog.innerHTML =
              "<p>Light popup / weather / settings</p><ha-select></ha-select>";
            const select = dialog.querySelector("ha-select");
            select.attachShadow({ mode: "open" }).innerHTML =
              '<style>:host{display:block}.anchor{width:200px;height:36px;background:var(--mdc-select-fill-color)}.menu{position:fixed;width:200px;height:90px;background:var(--frosted-glass-menu-surface)}</style><div class="anchor">Repository Type</div><div class="menu">Integration<br>Dashboard<br>Theme</div>';
            document.body.append(dialog);
            await dialog.updateComplete;
            window.qaDialog = dialog;
          }, engine);
          await page.waitForTimeout(350);
          const popup = await page.evaluate((lite) => {
            const failures = [];
            let count = 0;
            const check = (ok, label) => {
              count++;
              if (!ok) failures.push(label);
            };
            const surface = window.qaDialog.shadowRoot.querySelector(
              ".mdc-dialog__surface",
            );
            const css = (p, pseudo) =>
              getComputedStyle(surface, pseudo).getPropertyValue(p).trim();
            check(
              css("background-color") ===
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--primary-background-color")
                  .trim(),
              "native HACS MWC fallback is opaque without hooks",
            );
            check(
              css("backdrop-filter") === "none",
              "native MWC surface remains unfiltered",
            );
            check(
              css("backdrop-filter", "::before") === "none",
              "native legacy MWC has no blur layer",
            );
            const root = window.qaDialog.querySelector("ha-select").shadowRoot;
            const anchor = root.querySelector(".anchor");
            const menu = root.querySelector(".menu");
            const bounds = anchor.getBoundingClientRect();
            menu.style.left = bounds.left + "px";
            menu.style.top = bounds.bottom + "px";
            check(
              Math.abs(menu.getBoundingClientRect().left - bounds.left) < 1,
              "native MWC dropdown horizontal alignment",
            );
            check(
              Math.abs(menu.getBoundingClientRect().top - bounds.bottom) < 1,
              "native MWC dropdown vertical alignment",
            );
            const nativePosition = getComputedStyle(surface).position;
            surface.style.backdropFilter = "blur(8px)";
            check(
              Math.abs(menu.getBoundingClientRect().top - bounds.bottom) > 20,
              "native MWC fixture reproduces original dropdown displacement",
            );
            surface.style.backdropFilter = "none";
            check(
              getComputedStyle(surface).position === nativePosition,
              "native MWC placement retained",
            );
            window.qaDialog.remove();
            return { count, failures };
          }, section.name.includes("Lite"));
          assert.deepEqual(popup.failures, [], `${engine} native MWC popup`);
          checks += popup.count;
        }
        await page.evaluate(async () => {
          const states = window.qaHass.states;
          window.qaHass = {
            ...window.qaHass,
            states: Object.fromEntries(
              Object.entries(states).map(([id, s]) => [
                id,
                { ...s, state: "off" },
              ]),
            ),
          };
          for (const card of Object.values(window.qaCards))
            card.hass = window.qaHass;
          document.querySelector("home-assistant").hass = window.qaHass;
          window.qaFallback.dataset.state = "off";
          for (const { callback, message } of window.qaSubscriptions)
            if (message.type === "render_template")
              callback({
                result: await window.renderTemplate(
                  message,
                  window.qaHass.states,
                ),
                listeners: {},
              });
        });
        await page.waitForTimeout(350);
        assert(
          await page.evaluate(
            () =>
              getComputedStyle(
                window.qaCards.fan.shadowRoot.querySelector("ha-state-icon"),
              ).animationName === "none",
          ),
          "Tile fan stops when off",
        );
        checks++;
        assert(
          await page.evaluate(
            () =>
              getComputedStyle(
                window.qaFallback.shadowRoot.querySelector(
                  ".container ha-icon",
                ),
              ).animationName === "none",
          ),
          "internal Tile fan stops when off",
        );
        checks++;
        assert(
          await page.evaluate(
            () =>
              !getComputedStyle(
                window.qaCards.light.shadowRoot.querySelector("ha-card"),
              ).boxShadow.includes("255, 165, 0"),
          ),
          "theme has no automatic light glow",
        );
        checks++;
        assert(
          await page.evaluate(
            () =>
              !getComputedStyle(
                window.qaCards.manualLight.shadowRoot.querySelector("ha-card"),
              ).boxShadow.includes("255, 165, 0"),
          ),
          "manual Jinja glow clears when off",
        );
        checks++;
        await page.close();
      }
  } finally {
    await browser.close();
  }
  console.log(`Styling-engine integration: ${checks} checks passed.`);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
