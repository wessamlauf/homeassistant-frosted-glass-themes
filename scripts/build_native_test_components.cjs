const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
// Optional source-level integration fixture builder; product files are not bundled.
const cwd = process.env.FROSTED_GLASS_NATIVE_OUTPUT;
const ha = process.env.FROSTED_GLASS_HA_SOURCE;
const navbar = process.env.FROSTED_GLASS_NAVBAR_SOURCE;
const legacy = process.env.FROSTED_GLASS_LEGACY_HA_SOURCE;
const dependencies = process.env.FROSTED_GLASS_NATIVE_DEPENDENCIES;
for (const [name, value] of Object.entries({
  cwd,
  ha,
  navbar,
  legacy,
  dependencies,
})) {
  if (!value || !path.isAbsolute(value))
    throw new Error("Set an absolute path for " + name);
}
const esbuild = require(path.join(dependencies, "esbuild"));
for (const [source, revision] of [
  [ha, "fb3519404152"],
  [navbar, "d2fa531e595f"],
  [legacy, "3ffbd435e0e5"],
]) {
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: source,
    encoding: "utf8",
  }).trim();
  if (!head.startsWith(revision))
    throw new Error("Expected audited source " + revision + " at " + source);
}
fs.mkdirSync(cwd, { recursive: true });
const names = new Set(
  execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD", "src"], {
    cwd: ha,
    encoding: "utf8",
  })
    .trim()
    .split("\n"),
);
const mocks = {
  "src/panels/lovelace/common/directives/action-handler-directive.ts":
    "export const actionHandler=()=>undefined;",
  "src/panels/lovelace/common/handle-action.ts":
    "export const handleAction=()=>{};",
  "src/panels/lovelace/components/hui-warning.ts":
    'export const createEntityNotFoundWarning=()=>document.createElement("div");',
  "src/panels/lovelace/card-features/hui-card-features.ts": "export {};",
  "src/panels/lovelace/heading-badges/hui-heading-badge.ts": "export {};",
  "src/state-display/state-display.ts": "export {};",
  "src/components/ha-icon-next.ts": "export {};",
  "src/components/ha-ripple.ts": "export {};",
  "src/components/ha-icon.ts": `import {LitElement,html} from 'lit'; import './ha-svg-icon';
    if(!customElements.get('ha-icon'))customElements.define('ha-icon',class extends LitElement {render(){return html\`<ha-svg-icon .path=\${'M12 2L16 9L22 12L16 15L12 22L8 15L2 12L8 9Z'}></ha-svg-icon>\`;}});`,
  "src/data/icons.ts": `export const DEFAULT_DOMAIN_ICON='M12 2L16 9L22 12L16 15L12 22L8 15L2 12L8 9Z'; export const FALLBACK_DOMAIN_ICONS={fan:DEFAULT_DOMAIN_ICON,light:DEFAULT_DOMAIN_ICON}; export const entityIcon=async()=> 'mdi:fan';export const attributeIcon=async()=> 'mdi:fan';`,
  "src/data/context.ts": `import {createContext} from '@lit/context'; export const configContext=createContext('config');export const connectionContext=createContext('connection');export const entitiesContext=createContext('entities');export const formattersContext=createContext('formatters');export const internationalizationContext=createContext('internationalization');export const statesContext=createContext('states');`,
};
let modernDialogs = false;
const plugin = {
  name: "ha-source",
  setup(build) {
    build.onResolve({ filter: /^@home-assistant\/webawesome/ }, (args) =>
      modernDialogs
        ? {
            path: require.resolve(
              args.path.endsWith(".js") ? args.path : args.path + ".js",
              { paths: [path.dirname(dependencies)] },
            ),
          }
        : {
            path: "webawesome",
            namespace: "mock",
          },
    );
    build.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
      contents: "export {};",
    }));
    build.onResolve({ filter: /^(?:lit|@lit-labs\/observers)\// }, (args) =>
      args.path.endsWith(".js")
        ? undefined
        : {
            path: require.resolve(args.path + ".js", {
              paths: [path.dirname(dependencies)],
            }),
          },
    );
    build.onResolve({ filter: /.*/ }, (args) => {
      if (args.namespace !== "ha" && !args.path.startsWith("ha-source:"))
        return;
      if (!args.path.startsWith(".") && !args.path.startsWith("ha-source:"))
        return;
      const candidate = args.path.startsWith("ha-source:")
        ? args.path.slice(10)
        : path.posix.normalize(
            path.posix.join(path.posix.dirname(args.importer), args.path),
          );
      const key = [candidate, candidate + ".ts", candidate + "/index.ts"].find(
        (p) => names.has(p) || mocks[p],
      );
      if (!key) throw new Error("Missing HA source " + candidate);
      return { path: key, namespace: "ha" };
    });
    build.onLoad({ filter: /.*/, namespace: "ha" }, (args) => ({
      contents: args.path.includes("/editor/")
        ? "export {};"
        : (mocks[args.path] ??
          execFileSync("git", ["show", "HEAD:" + args.path], {
            cwd: ha,
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024,
          })),
      loader: "ts",
      resolveDir: path.dirname(dependencies),
    }));
  },
};
const options = {
  bundle: true,
  format: "iife",
  target: "es2022",
  nodePaths: [dependencies],
  tsconfigRaw: {
    compilerOptions: {
      experimentalDecorators: true,
      useDefineForClassFields: false,
    },
  },
  define: { __DEV__: "false", __HASS_URL__: '""', __DEMO__: "false" },
  logLevel: "warning",
};
(async () => {
  await esbuild.build({
    ...options,
    stdin: {
      contents: `import 'ha-source:src/panels/lovelace/cards/hui-tile-card.ts';import 'ha-source:src/panels/lovelace/cards/hui-heading-card.ts';import {load} from 'js-yaml';window.qaParseYaml=load;`,
      resolveDir: cwd,
    },
    plugins: [plugin],
    outfile: path.join(cwd, "qa-native-ha.js"),
  });
  await esbuild.build({
    ...options,
    entryPoints: [path.join(navbar, "src/navbar-card.ts")],
    alias: { "@": path.join(navbar, "src") },
    plugins: [
      {
        name: "editor",
        setup(build) {
          build.onResolve({ filter: /navbar-card-editor$/ }, () => ({
            path: "editor",
            namespace: "mock",
          }));
          build.onResolve({ filter: /^custom-card-helpers$/ }, () => ({
            path: "helpers",
            namespace: "mock",
          }));
          build.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
            contents:
              args.path === "helpers"
                ? "export const navigate=()=>{};"
                : "export {};",
          }));
        },
      },
    ],
    outfile: path.join(cwd, "qa-native-navbar.js"),
  });
  await esbuild.build({
    ...options,
    entryPoints: [path.join(legacy, "src/components/ha-dialog.ts")],
    plugins: [
      {
        name: "mdc-services",
        setup(build) {
          build.onResolve(
            { filter: /^(?:lit|@lit-labs\/observers)\// },
            (args) =>
              args.path.endsWith(".js")
                ? undefined
                : {
                    path: require.resolve(args.path + ".js", {
                      paths: [path.dirname(dependencies)],
                    }),
                  },
          );
          build.onResolve(
            { filter: /make-dialog-manager|\/ha-icon-button$/ },
            (args) => ({ path: args.path, namespace: "mock" }),
          );
          build.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
            contents: args.path.includes("make-dialog-manager")
              ? "export const FOCUS_TARGET=Symbol();"
              : "export {};",
          }));
        },
      },
    ],
    outfile: path.join(cwd, "qa-native-mdc.js"),
  });
  if (process.env.FROSTED_GLASS_BUILD_MODERN_DIALOGS) {
    // Actual HA + Web Awesome surfaces and floating dropdown placement. Only
    // HA's icon registry/context services are fixtures, as in the card bundle.
    modernDialogs = true;
    await esbuild.build({
      ...options,
      stdin: {
        contents: `import 'ha-source:src/components/ha-adaptive-dialog.ts';import 'ha-source:src/components/ha-dropdown.ts';import 'ha-source:src/components/ha-dropdown-item.ts';`,
        resolveDir: cwd,
      },
      plugins: [plugin],
      outfile: path.join(cwd, "qa-native-modern-dialogs.js"),
    });
  }
  console.log(
    "Built actual HA Tile/Heading/ha-card and Navbar components; HA actions, features, icon registry and editor services are mocked.",
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
