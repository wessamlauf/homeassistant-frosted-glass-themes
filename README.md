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
- **Lite Editions (New)**: Optional no-blur builds for older/low-end devices. They keep the same semi-transparent, glassy look while improving performance and avoiding dropdown misplacement caused by HA’s blur handling. ⚡

## 🚀 Quick Installation Guide

**Step 1: Prerequisites**
- Make sure [HACS](https://hacs.xyz/) is installed.
- Install the [`card-mod`](https://github.com/thomasloven/lovelace-card-mod) integration via HACS — this theme depends on it for the blur and styling.

**Step 2: Install Theme via HACS**

[![Open your Home Assistant instance and install via HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=WessamLauf&repository=homeassistant-frosted-glass-themes&category=theme)

**Step 3: Restart Home Assistant**

**Step 4: Activate Theme**
- Go to your profile (bottom-left corner of Home Assistant UI), and select **Frosted Glass**, **Frosted Glass Light** or **Frosted Glass Dark** from the theme dropdown.

-----

> ⚠️ **Note:** This theme *requires* [`card-mod`](https://github.com/thomasloven/lovelace-card-mod) to render correctly. Without it, blur effects and styling will not work.

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

## 🧩 Known Issues & Limitations

> These are known limitations caused by platform constraints, aggressive CSS behavior in certain custom cards, or performance trade-offs. Workarounds may be possible in some cases via `card-mod`.


### 1. **Hue-Like Light Card Text Visibility**  
🪔 [#5](https://github.com/wessamlauf/homeassistant-frosted-glass-themes/issues/5)  
When the light is **on**, text inside the `custom:hue-like-light-card` may turn black and become unreadable against the card background.  
This card aggressively reapplies internal styles that override theme-level colors, even with `!important` declarations.  
➡️ *Currently not fixable from the theme side.*


### 2. **Dropdowns Broken by Blur**  
📦 [#42](https://github.com/wessamlauf/homeassistant-frosted-glass-themes/issues/42)  
Blur effects break dropdown visibility inside HACS menus (and other deeper level HA dropdowns) due to how Home Assistant renders these elements **outside the theme root DOM**.  
Multiple fixes were tested, but the problem stems from **Material Web Components** and is unlikely to be solvable from the theme side.  
➡️ Tip: **The Lite version** (no blur) render dropdowns correctly and avoid this issue.


### 3. **stack-in-card Incompatibility**  
🧱 [#44](https://github.com/wessamlauf/homeassistant-frosted-glass-themes/issues/44)  
Cards rendered inside `custom:stack-in-card` are deeply nested, and the theme’s `::before` blur cannot be excluded reliably for inner elements.  
➡️ *Recommended workaround: Use `card-mod` inside each card to manually disable the `::before` layer.*


### 4. **Performance on Low-End Devices**  
The heavy use of `backdrop-filter: blur()` may cause noticeable lag on low-end hardware (older tablets, Pi-based dashboards, etc.).  
➡️ Tip: **The Lite version** (no blur) for the same glassy look without blur, dramatically better performance, and no dropdown misplacement.

---

## ✨ Star History 

[![Star History Chart](https://api.star-history.com/svg?repos=wessamlauf/homeassistant-frosted-glass-themes&type=Date)](https://www.star-history.com/#wessamlauf/homeassistant-frosted-glass-themes&Date)
