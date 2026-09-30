# Frosted Glass Theme for Home Assistant ✨
[![HACS Badge](https://img.shields.io/badge/Available%20in-HACS-41BDF5?logo=home-assistant&logoColor=white)](https://my.home-assistant.io/redirect/hacs_repository/?owner=WessamLauf&repository=homeassistant-frosted-glass-themes&category=theme)
[![Latest Release](https://img.shields.io/github/v/release/wessamlauf/homeassistant-frosted-glass-themes?label=Release&logo=github)](https://github.com/wessamlauf/homeassistant-frosted-glass-themes/releases)
[![Last Commit](https://img.shields.io/github/last-commit/wessamlauf/homeassistant-frosted-glass-themes?label=Last%20commit)](https://github.com/wessamlauf/homeassistant-frosted-glass-themes/commits/main)
[![GitHub Stars](https://img.shields.io/github/stars/wessamlauf/homeassistant-frosted-glass-themes?style=social)](https://github.com/wessamlauf/homeassistant-frosted-glass-themes/stargazers)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-orange?logo=buymeacoffee&logoColor=white)](https://www.buymeacoffee.com/wessamlauf)


<img alt="Frosted Glass logo" src="https://github.com/user-attachments/assets/f1fd71d5-f5bb-451e-862c-cc668d987f66" />



### Bring depth and elegance to your dashboard with blurred glass panels and soft UI touches. ☀️


This theme brings a sophisticated "**Frosted Glass**" aesthetic to your dashboard, combining transparency with elegant blurring effects to create a truly unique and contemporary look. Designed for both visual appeal and comfortable usability, the Frosted Glass Theme transforms your Home Assistant interface into a work of art. 🖼️

## ✨ Features

- **Frosted Glass Aesthetic**: Transparent and blurred card elements create depth and layering. ❄️
- **Light & Dark Modes**: Choose between a bright, clean look or a soft dark interface. ☀️🌑
- **Modern Design**: Rounded corners, minimal shadows, and cohesive color palettes. 🛋️
- **Enhanced UX**: Designed to feel fluid, comfortable, and polished. 🖼️
- **Lite Editions**: Optional no-blur builds for older or low-end devices. They keep the same semi-transparent, glassy look while improving performance. ⚡
- **Home Assistant 2026.8 Ready**: Uses the current form, switch and border-radius theme tokens, with validated single-mode declarations.
- **Two Styling Engines**: Works with UIX and remains compatible with card-mod.
- **Native Custom-Card Profiles**: Bubble Card, Navbar Card, stack-in-card, Mushroom, Simple Swipe Card and other common HACS cards inherit deliberate theme contracts instead of generic overrides.
- **Subtle State Motion**: Active lights receive a restrained glow and running fans rotate, with `prefers-reduced-motion` respected automatically.
- **Want to Customize? (New!)**: Install Frosted Glass Theme Manager to choose your own color&background! 🎨

## 🚀 Quick Installation Guide

**Step 1: Prerequisites**
- Make sure [HACS](https://hacs.xyz/) is installed.
- Install exactly one styling engine through HACS:
  - [`UIX`](https://github.com/Lint-Free-Technology/uix), the actively developed successor to card-mod. UIX understands this theme's existing card-mod keys, so migration does not require dashboard changes.
  - [`card-mod`](https://github.com/thomasloven/lovelace-card-mod), for existing installations that prefer to stay on card-mod.

Do not install both engines at the same time. They can both try to patch the same Home Assistant elements.

For sidebar and drawer styling on Settings and other panels, load the selected engine as a **frontend module** using its installation instructions. A dashboard resource alone is loaded only on Lovelace dashboards. Select Frosted Glass in your **profile** to apply it to the whole interface; a per-view theme only affects that view.

**Step 2: Install Theme via HACS**

[![Open your Home Assistant instance and install via HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=WessamLauf&repository=homeassistant-frosted-glass-themes&category=theme)

**Step 3: Restart Home Assistant**

**Step 4: Activate Theme**
- Go to your profile (bottom-left corner of Home Assistant UI), and select **Frosted Glass**, **Frosted Glass Light** or **Frosted Glass Dark** from the theme dropdown.

-----

> ⚠️ **Note:** This theme requires either [UIX](https://github.com/Lint-Free-Technology/uix) or [card-mod](https://github.com/thomasloven/lovelace-card-mod) to render the glass styling. UIX also understands the `card-mod-*-yaml` keys used for shadow-root styling. The source audit covers card-mod 4.2.1 and UIX 8.3.1; older engines may lack the current drawer hook.

> Additionally, **Markdown cards** that are text-only will still receive the theme’s glass/border styling (themes can’t reliably detect “text-only” variants). If you want a truly plain text-only Markdown card, add this to that card (copy&paste ready):

```yaml
card_mod:
  style: |
    ha-card {
      background: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      box-shadow: none !important;
      border: none !important;
    }
    ha-card::before {
      content: none !important;
      background: none !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
```


> 💡 **Optional:** To match the navigation bar shown in screenshots, install the [lovelace-navbar-card](https://github.com/joseluis9595/lovelace-navbar-card).

-----

## 🧩 Third-party card compatibility

The theme uses each card's public CSS variables where they exist. This keeps the integration stable across card updates and also lets custom colors generated by Frosted Glass Theme Manager flow into the card.

| Card / integration | Theme behavior |
| --- | --- |
| Bubble Card | Uses official surface, border, shadow, popup and select-menu variables. Blur sits on a background pseudo-element, keeping fixed-position menus out of a filtered containing block. The outer `ha-card` does not add a second border or tint. |
| Navbar Card | Uses the official navbar color, radius and shadow variables. Standard builds apply blur directly to the navbar surface; Lite builds use the same opaque visual profile without blur. |
| stack-in-card | Suppresses glass and borders on children whose background the card explicitly makes transparent. `keep.background` and individual `--keep-background: true` choices retain their surfaces. |
| Mushroom | Title and chip containers remain transparent. Template cards use a direct glass layer so custom `::before` / `::after` styling remains available. |
| room-summary-card | Its built-in Frosted Glass detection continues to consume the theme's card tint, filter, border and inset-shadow tokens. |
| Hue-Like Light Card | The card's calculated light background and matching foreground are preserved instead of being replaced by a transparent generic surface. |
| Slider Button Card | Public button and slider-track variables follow the light/dark palette. |
| Simple Swipe Card | Pagination uses the theme palette. For blurred child cards, add `enable_backdrop_filter: true` to the card configuration as required by Simple Swipe Card itself. |
| config-template-card, auto-entities, layout-card and streamline-card | These are transparent wrappers, so the actual child card receives the theme. Bubble Card nested inside a wrapper is detected by its rendered container to avoid a duplicate layer. |
| Energy Flow Card Plus and standard `ha-card` custom cards | Inherit the shared radius, border, tint and shadow tokens normally. |

Fan animation follows exposed HA state attributes, entity-row and Glance icons, Mushroom's internal disabled state, and Bubble's active `mdi:fan` / `mdi:fan-speed-*` icons. Standard active light cards and Bubble lightbulb cards receive a subtle surface glow; Mushroom light icons receive a small glow. Other custom icons and cards without exposed state are left to their native behavior. All added fan motion respects `prefers-reduced-motion`.

The sidebar has a dedicated theme-engine hook. Its wallpaper and tint match the dashboard, with blur on a pseudo-element so the sidebar host can still position tooltips correctly. Lite variants use the same structure with every filter token set to `none`.

Legacy MWC selects and current Material/Web Awesome menus share an opaque glass menu surface. Dialog and select hosts intentionally do not use `backdrop-filter`, because a filtered ancestor changes the containing block of fixed-position legacy menus. This keeps dropdowns such as **HACS → Custom repositories → Type** aligned and visible.

See [the source audit and regression checks](docs/compatibility-audit.md) for the reviewed versions, styling contracts and test scope.

-----

## 🎨 Want to Customize? (New!)

**Want to use your own Primary Color or Background Image without editing code?**

Check out the official **[Frosted Glass Theme Manager](https://github.com/wessamlauf/frosted-glass-manager)** integration! 🛠️

It allows you to:
* 🌈 **Pick any color** via a UI Color Picker (it automatically calculates the correct contrast/shades).
* 🖼️ **Set custom backgrounds** by simply pasting a URL.
* ⚡ **Generate both** Standard and Lite versions of your custom theme instantly.

![Untitled design (1)](https://github.com/user-attachments/assets/c5b9dd7b-290e-4769-9b8d-97d1d87046c6)

---

## 🖼️ **Screenshots**

### ☀️ Light Mode:
<img alt="Snímka obrazovky 2025-08-22 182634" src="https://github.com/user-attachments/assets/6adca904-9a3d-4df6-b080-1480fce3fa35" />
<img alt="Snímka obrazovky 2025-08-22 182706" src="https://github.com/user-attachments/assets/f0000f43-8afe-48c8-97f4-cfe52a6b6e42" />
<img alt="Snímka obrazovky 2025-08-22 182719" src="https://github.com/user-attachments/assets/78e30168-16ae-4ac6-82d2-ef50c1262756" />
<img alt="Snímka obrazovky 2025-08-22 182906" src="https://github.com/user-attachments/assets/b9782161-d9e8-47d8-b027-4bcf2a765135" />


### 🌑 Dark Mode:
<img alt="Snímka obrazovky 2025-08-22 182734" src="https://github.com/user-attachments/assets/8fadd748-c3a9-4578-994d-838f2b6a1329" />
<img alt="Snímka obrazovky 2025-08-22 182756" src="https://github.com/user-attachments/assets/c0b2e265-5d5b-4d4b-bb6c-37fa7223c6bd" />
<img alt="Snímka obrazovky 2025-08-22 182809" src="https://github.com/user-attachments/assets/da57d161-aeca-4266-95a5-b772c6c58007" />
<img alt="Snímka obrazovky 2025-08-22 182852" src="https://github.com/user-attachments/assets/a8c5f368-568f-46c3-b705-fdc71d27cef1" />


## ❤️ Support the Project
- If you enjoy this theme and want to support future updates, consider buying me a coffee:
<a href="https://www.buymeacoffee.com/wessamlauf" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

---

## 🐞 Issues / Feedback

Have a problem or a suggestion?
Open an [issue](https://github.com/wessamlauf/homeassistant-frosted-glass-themes/issues) or start a discussion on GitHub.

---

## 🧩 Known Limitations

### 1. **Simple Swipe Card blur opt-in**

Simple Swipe Card uses `clip-path` for slide clipping by default, while CSS `backdrop-filter` cannot render correctly through that clipping path. Set `enable_backdrop_filter: true` on that card when using the standard (blurred) theme. This is not needed for Lite themes.

### 2. **Closed custom-card internals**

Cards that expose neither standard Home Assistant tokens nor public CSS variables cannot be fully restyled by a theme without card-specific support from their author. Frosted Glass avoids brittle deep overrides for those cards.

### 3. **Performance on Low-End Devices**
The heavy use of `backdrop-filter: blur()` may cause noticeable lag on low-end hardware (older tablets, Pi-based dashboards, etc.).
➡️ Tip: Use the **Lite version** for the same glassy palette without real-time blur.

---

## ✨ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=wessamlauf/homeassistant-frosted-glass-themes&type=Date)](https://www.star-history.com/#wessamlauf/homeassistant-frosted-glass-themes&Date)
