# Frosted Glass 1.5.0 compatibility audit

Reviewed on 2026-09-30. The audit covers the custom cards identified in this repository's reports, plus Home Assistant, the legacy frontend used by HACS, and both styling engines. It does not claim compatibility with every HACS card.

## Source contracts

| Component and reviewed source | Finding and implementation |
| --- | --- |
| [Bubble Card, 061ed8376134](https://github.com/Clooos/Bubble-Card/tree/061ed8376134) | `.bubble-container` owns its radius, shadow and border through public `bubble-*` variables. Container and active `.bubble-background` stay transparent; blur and original inset highlights use a background pseudo-element. Native `changeState` places `is-on` on `context.card` (`ha-card`), not `.bubble-wrapper`; that actual class and reflected icon attributes drive fan/light feedback. No blur is applied to the container that positions menus. |
| [Navbar Card, d2fa531e595f](https://github.com/joseluis9595/lovelace-navbar-card/tree/d2fa531e595f) | Public background/radius/shadow variables have defaults declared on `:host`, which override inherited variables. Theme aliases reapply those values at the same specificity, allowing later user overrides. Navbar and media-player surfaces receive one layer; sibling popup positions remain unchanged. |
| [stack-in-card, 6d8401dd2c90](https://github.com/custom-cards/stack-in-card/tree/6d8401dd2c90) | The card recursively writes an inline transparent background when a child background is not kept. That explicit decision suppresses the child's glass and border. No blanket inherited opt-out hides children configured with `keep.background` or `--keep-background: true`. |
| [Mushroom, d8a90ffff1b2](https://github.com/piitaya/lovelace-mushroom/tree/d8a90ffff1b2) | Title/chip containers stay transparent. Template cards keep both pseudo-elements available for user artwork. Fan/light state is passed as non-reflected properties and lives on `.shape.disabled` inside another shadow root. Engine templates use `config.entity` and `is_state` to drive the main fan icon and the light card/icon through HA's existing template subscription. Native and Mushroom badge shadows use a smaller shared profile. |
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
| [HACS frontend, d97dce047de4](https://github.com/hacs/frontend/tree/d97dce047de4), [legacy HA submodule, 3ffbd435e0e5](https://github.com/home-assistant/frontend/tree/3ffbd435e0e5) | Custom repository Type uses a legacy select with `fixedMenuPosition`. Both its surface filter and the legacy `.mdc-dialog` ancestor's scrim filter can change the containing block. Both remain disabled globally, with fully opaque legacy popup/menu surfaces. Modern popup hooks filter only the sibling Web Awesome `::backdrop`, covering direct/adaptive dialogs and mobile bottom sheets. Missing hooks keep the opaque fallback; Lite always uses opaque popups. Modern menu host defaults read `card-background-color`, which stays the menu surface rather than the transparent card background. |
| [card-mod, 11005313b240](https://github.com/thomasloven/lovelace-card-mod/tree/11005313b240) | Dedicated `card`, `row`, `glance`, `badge`, `sidebar`, `drawer` and legacy `more-info` hooks, plus YAML shadow-root selectors. Card patches pass `{config}` to `bind_template`, which uses HA's `render_template` WebSocket subscription. Its reviewed more-info patch looks for a direct `ha-dialog`; newer adaptive popups may therefore retain the opaque fallback. Styling-engine keys stay at the top level of generated single-mode themes. Load it as a frontend module for non-Lovelace panels. |
| [UIX, 770f8aa99cb5](https://github.com/Lint-Free-Technology/uix/tree/770f8aa99cb5) | Supports the same card-mod theme keys as fallbacks, including `*-yaml`, sidebar/drawer hooks, templates and generic dialog styling. Its more-info patch supports `ha-adaptive-dialog`, so desktop/mobile nested popup hooks are included. Use one styling engine at a time. |

## Validation

```sh
python scripts/sync_themes.py --check
python scripts/validate_themes.py
npm ci
npx playwright install --with-deps chromium
npm test
git diff --check
```

The static validator checks every theme value, duplicate YAML keys, embedded styling YAML, balanced CSS, valid mode declarations, release headers, engine references and the Full/Lite contracts. The browser checks all embedded CSS leaves for discarded rules and exercises all eight theme/mode combinations.

Behavioral fixtures test zero-opacity card backgrounds, original inset highlights, native surfaces, user overrides, nested stacks, badge profiles, rendered entity-state templates, fan on/off transitions, actual animation objects and changing rotation transforms, light card/icon feedback, unavailable states, reduced motion, sidebar/drawer hooks, modern direct/adaptive popup backdrops, opaque Lite popups, Settings palette consistency, and both legacy and modern menu surfaces. The legacy dropdown test first reproduces displacement with blur enabled, then asserts alignment after the theme fix. Manager-generated themes are also checked with custom light/dark accents.

These fixtures reproduce the reviewed DOM and CSS contracts. They are not a running Home Assistant installation or a Safari/iOS visual test. Future upstream DOM changes and dashboard-specific styles still need checking on the actual installation. The rendering checks run in CI alongside YAML generation and HACS validation.

An additional native component check uses the actual audited Mushroom fan/light code and Bubble browser bundle, with HA services and icons mocked. It verifies on/off rotation, card/icon glow, transparent active backgrounds, corner highlights and reduced motion across Full/Lite and Light/Dark. Explicit `rotate(0deg)` keyframes avoid Mushroom's native `translateZ(0)` interpolating into an identity matrix instead of a visible turn. Bubble's native background-color transition is disabled only on its transparent background layer, because a running transition temporarily overrides even an important transparent declaration; slider fills remain native.

This optional check requires a browser bundle of the Mushroom fan/light entry points and Bubble's `dist/bubble-card.js` from the audited revisions above. Set their absolute paths and run:

```sh
FROSTED_GLASS_MUSHROOM_BUNDLE=/path/to/mushroom-fan-light.js \
FROSTED_GLASS_BUBBLE_BUNDLE=/path/to/bubble-card.js \
node scripts/test_native_cards.cjs
```

It runs separately from CI and supplements the reproducible DOM/CSS fixtures; it does not replace validation on the user's installation.
