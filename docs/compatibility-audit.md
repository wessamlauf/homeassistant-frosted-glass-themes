# Frosted Glass 1.5.0 compatibility audit

Reviewed on 2026-10-01. The audit covers the custom cards identified in this repository's reports, plus Home Assistant, the legacy frontend used by HACS, and both styling engines. It does not claim compatibility with every HACS card.

## Source contracts

| Component and reviewed source | Finding and implementation |
| --- | --- |
| [Bubble Card, 061ed8376134](https://github.com/Clooos/Bubble-Card/tree/061ed8376134) | `.bubble-container` owns its radius, shadow and border through public `bubble-*` variables. Container and active `.bubble-background` stay transparent. Blur uses a background pseudo-element; corner highlights are painted on the visible surface. The theme adds no state animations or light glow. Bubble itself resets the outer `ha-card` border/shadow inline; manual outer overrides need `!important`, while normal `.bubble-container` shadow/border CSS works. The theme no longer forces an important outer shadow/border. No blur is applied to the container that positions menus. |
| [Navbar Card, d2fa531e595f](https://github.com/joseluis9595/lovelace-navbar-card/tree/d2fa531e595f), [background contract discussion](https://github.com/joseluis9595/lovelace-navbar-card/issues/240) | Its native `--navbar-background-color` depends on `--card-background-color`, normally an opaque menu base. Static host CSS scopes that dependency to `--ha-card-background` and the native elevation shadow to the glass shadow. It no longer redeclares the public background variable or parses configuration using Jinja. `.navbar ha-card` consumes the native background. Explicit public-variable overrides remain effective. Navbar and media-player surfaces receive one layer; sibling popup positions remain unchanged. |
| [stack-in-card, 6d8401dd2c90](https://github.com/custom-cards/stack-in-card/tree/6d8401dd2c90) | The card recursively writes an inline transparent background when a child background is not kept. That explicit decision suppresses the child's glass and border. No blanket inherited opt-out hides children configured with `keep.background` or `--keep-background: true`. |
| [Mushroom, d8a90ffff1b2](https://github.com/piitaya/lovelace-mushroom/tree/d8a90ffff1b2) | Title/chip containers stay transparent. Template cards keep both pseudo-elements available for user artwork. Native animation options remain in control; the theme adds no fan/light state feedback or template subscription. Native and Mushroom badge shadows use a smaller shared profile. |
| [Room Summary, 282005c400e5](https://github.com/homeassistant-extras/room-summary-card/tree/282005c400e5) | The card already detects Frosted Glass and creates its own glass overlay. Global glass tokens feed that implementation; the generic overlay excludes it, preserving its image and threshold-border logic. |
| [Hue-Like Light Card, 7162282cf85b](https://github.com/Gh61/lovelace-hue-like-light-card/tree/7162282cf85b) | Foreground contrast is calculated against `--hue-background`. The requested transparent surface requires overriding `--hue-text-color` on `ha-card` with the theme foreground as well. The shared glass overlay supplies blur and highlights. |
| [Slider Button Card, f63628332e1f](https://github.com/custom-cards/slider-button-card/tree/f63628332e1f) | Button/track defaults declared on `:host` require local theme aliases. The native slider fill, drag behavior, labels and configured icon animation are preserved. |
| [Simple Swipe Card, b0aeca7eb17e](https://github.com/nutteloost/simple-swipe-card/tree/b0aeca7eb17e) | Public pagination variables receive the theme palette. Its native `enable_backdrop_filter: true` setting is needed for blurred children because the default slide `clip-path` blocks that rendering. A theme cannot set the card's JavaScript configuration. |
| [config-template-card, 17a4d22b76b0](https://github.com/iantrich/config-template-card/tree/17a4d22b76b0) | A wrapper without its own surface; style the rendered child. |
| [auto-entities, f2ddbad8fdf0](https://github.com/thomasloven/lovelace-auto-entities/tree/f2ddbad8fdf0) | Passes configuration to the child card; glass belongs to that child, including entity-list rows. Empty/editor behavior remains native. |
| [layout-card, b67162283d36](https://github.com/thomasloven/lovelace-layout-card/tree/b67162283d36) | Layout wrapper; retain its sizing and let actual child cards consume the shared theme. |
| [streamline-card, 3a2667f9f5fc](https://github.com/brunosabot/streamline-card/tree/3a2667f9f5fc) | Template wrapper; no additional surface. Bubble descendants are also detected by their rendered container. |
| [Energy Flow Card Plus, b43fb0a8a81f](https://github.com/flixlix/energy-flow-card-plus/tree/b43fb0a8a81f), [current monorepo, 28df3548537a](https://github.com/flixlix/flixlix-cards/tree/28df3548537a) | Standard `ha-card` and HA color variables consume the shared tint, radius, border and shadow. Energy-flow geometry and semantic colors stay native. |

## Home Assistant and engine boundaries

| Source | Contract |
| --- | --- |
| [Home Assistant frontend, fb3519404152](https://github.com/home-assistant/frontend/tree/fb3519404152) | Current forms, switches, Web Awesome menus, `ha-badge`, sidebar host and slotted drawer shell. Glass tokens are global YAML keys; dashboard-only root declarations cannot reach sibling panels. Monospace remains available in the code editor. |
| [HACS frontend, d97dce047de4](https://github.com/hacs/frontend/tree/d97dce047de4), [legacy HA submodule, 3ffbd435e0e5](https://github.com/home-assistant/frontend/tree/3ffbd435e0e5) | Legacy selects use viewport coordinates with `fixedMenuPosition`. Filtering their dialog surface or `.mdc-dialog` ancestor displaces them. `ha-space-1` and `ha-color-neutral-50` are absent in this frontend; gated popup variables become invalid and native CSS falls back to an opaque surface with no filter. The scrim filter stays `none`. |
| [Liquid Glass reference, ad741700d661](https://github.com/Nezz/homeassistant-visionos-theme/tree/ad741700d66106624d727c73f25aac5fc030e42a) | Inspiration for native dialog variables gated by modern frontend tokens, rather than injected popup hooks. Frosted Glass keeps its own transparent cards, palette, reflections, sidebar and Lite behavior. |
| [card-mod, 11005313b240](https://github.com/thomasloven/lovelace-card-mod/tree/11005313b240) | Static `card-mod-card`, sidebar/drawer and badge hooks. No automatic state templates, row/glance animation hooks or popup traversal remain. User-supplied Jinja glow still uses HA's existing template subscription. Styling-engine keys stay at the top level of generated single-mode themes. Load as a frontend module for non-Lovelace panels. |
| [UIX, 770f8aa99cb5](https://github.com/Lint-Free-Technology/uix/tree/770f8aa99cb5) | Reads the same static card-mod theme keys. Both direct and adaptive popups now style through native variables regardless of engine support. Use one styling engine at a time. |

## Surface behavior

Full cards retain zero-opacity backgrounds, a separate blur layer and the existing corner reflections. Ordinary cards do not get an explicit theme `box-shadow` rule; HA's native `ha-card-box-shadow` supplies the default, leaving normal manual CSS in control. Automatic fan rotation and light glow, their tokens, keyframes, icon filters and state subscriptions have been removed.

Navbar styling changes the opaque dependency used by its native default instead of overriding the public background variable through Jinja. The regression suite also tests adopted native stylesheet order and explicit `styles`/`card_mod` background colors. Its popup remains a sibling of the filtered surface.

Modern Full dialog surfaces use 35% opacity with 18px blur. Native bottom sheets paint this on `wa-drawer::part(body)`, not on the transparent outer dialog; desktop `wa-dialog` paints its dialog part. No `card-mod-more-info` or `card-mod-dialog` hook is needed. Modern Web Awesome dropdowns use the top layer and remain aligned. HACS's old MWC frontend deliberately uses the opaque/unfiltered fallback. Lite dialogs are always opaque and unfiltered.

Full sidebar/topbar use alpha 0.10; Lite uses the mode's solid base. Settings remain solid. Dark uses `#02060B` and cool blue/slate accents; Light retains the warm beige base. All six base variants and both Manager templates are synchronized.

## Validation

```sh
python scripts/sync_themes.py --check
python scripts/validate_themes.py
npm ci
npx playwright install --with-deps chromium
npm test
git diff --check
```

The static validator checks duplicate YAML keys, every theme value, CSS balance, mode declarations, release headers, engine references, absence of automatic state effects and the Full/Lite contracts. CI browser fixtures check all eight mode/variant combinations, native surface variables, plain headings, user shadows/borders, transparent custom cards, corner reflections, Settings/sidebar colors and legacy dropdown displacement. The legacy fixture first reproduces the displacement with a filtered ancestor, then verifies the fallback.

Optional native checks use audited upstream components and actual card-mod 4.2.1/UIX 8.3.1 browser bundles. The fixture supplies HA state/backend/action/icon/feature services; it does not run a live HA installation. The engine suite checks normal manual light glow on/off, no automatic Tile animation/glow, Heading clearing, native/adopted Navbar backgrounds, public-variable overrides and MWC dropdown coordinates. Mushroom/Bubble checks retain their native rendering code and verify transparent surfaces and absence of theme state effects.

```sh
FROSTED_GLASS_HA_BUNDLE=/path/to/qa-native-ha.js \
FROSTED_GLASS_NAVBAR_BUNDLE=/path/to/qa-native-navbar.js \
FROSTED_GLASS_MDC_BUNDLE=/path/to/qa-native-mdc.js \
FROSTED_GLASS_CARD_MOD_BUNDLE=/path/to/card-mod.js \
FROSTED_GLASS_UIX_BUNDLE=/path/to/uix.js \
node scripts/test_styling_engines.cjs

FROSTED_GLASS_MUSHROOM_BUNDLE=/path/to/mushroom-fan-light.js \
FROSTED_GLASS_BUBBLE_BUNDLE=/path/to/bubble-card.js \
node scripts/test_native_cards.cjs
```

`scripts/build_native_test_components.cjs` builds the HA/ Navbar/MWC bundles from the pinned revisions above. Set absolute paths in `FROSTED_GLASS_HA_SOURCE`, `FROSTED_GLASS_NAVBAR_SOURCE`, `FROSTED_GLASS_LEGACY_HA_SOURCE`, `FROSTED_GLASS_NATIVE_OUTPUT` and `FROSTED_GLASS_NATIVE_DEPENDENCIES` (a `node_modules` directory). The optional build requires esbuild, lit, js-yaml, @mdi/js, memoize-one, @lit/context, @lit/task, home-assistant-js-websocket, intl-messageformat, superstruct, culori, color-name and @material/mwc-dialog 0.27.0.

For the modern popup bundle also set `FROSTED_GLASS_BUILD_MODERN_DIALOGS=1` and install @home-assistant/webawesome 3.7.0-ha.0 and @lit-labs/observers 2.0.5. This builds actual HA direct/adaptive dialogs, bottom sheets and dropdowns with the real Web Awesome components. Their rendering and placement are not mocked. Run the resulting suite **without loading either styling engine**:

```sh
FROSTED_GLASS_MODERN_DIALOGS_BUNDLE=/path/to/qa-native-modern-dialogs.js \
node scripts/test_native_dialogs.cjs
```

It checks desktop/direct, desktop/adaptive and mobile/bottom-sheet surfaces, native dropdown coordinates, alpha and blur in Full/Lite and Light/Dark. These Chromium checks are not verification on the user's installation or on Safari/iOS. Keep the full theme set installed so combined themes can resolve their Light/Dark engine names; regenerate Manager Custom files after updating the integration.
