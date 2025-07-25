# Frosted Glass Theme for Home Assistant ✨ 
[![HACS Badge](https://img.shields.io/badge/Available%20in-HACS-41BDF5?logo=home-assistant&logoColor=white)](https://my.home-assistant.io/redirect/hacs_repository/?owner=WessamLauf&repository=homeassistant-frosted-glass-themes&category=theme)
[![Latest Release](https://img.shields.io/github/v/release/wessamlauf/homeassistant-frosted-glass-themes?label=Release&logo=github)](https://github.com/wessamlauf/homeassistant-frosted-glass-themes/releases)
[![Last Commit](https://img.shields.io/github/last-commit/wessamlauf/homeassistant-frosted-glass-themes?label=Last%20commit)](https://github.com/wessamlauf/homeassistant-frosted-glass-themes/commits/main)
[![GitHub Stars](https://img.shields.io/github/stars/wessamlauf/homeassistant-frosted-glass-themes?style=social)](https://github.com/wessamlauf/homeassistant-frosted-glass-themes/stargazers)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-☕-orange?logo=buymeacoffee&logoColor=white)](https://www.buymeacoffee.com/wessamlauf)


<img width="1536" height="424" alt="Frosted glass logo" src="https://github.com/user-attachments/assets/2d12f6ec-9c68-4744-9386-56fb37d2ad45" />


### Bring depth and elegance to your dashboard with blurred glass panels and soft UI touches. ☀️


This theme brings a sophisticated "**Frosted Glass**" aesthetic to your dashboard, combining transparency with elegant blurring effects to create a truly unique and contemporary look. Designed for both visual appeal and comfortable usability, the Frosted Glass Theme transforms your Home Assistant interface into a work of art. 🖼️

## ✨ Features

- **Frosted Glass Aesthetic**: Transparent and blurred card elements create depth and layering. ❄️
- **Light & Dark Modes**: Choose between a bright, clean look or a soft dark interface. ☀️🌑
- **Modern Design**: Rounded corners, minimal shadows, and cohesive color palettes. 🛋️
- **Enhanced UX**: Designed to feel fluid, comfortable, and polished. 🖼️

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

> 💡 **Optional:** To match the navigation bar shown in screenshots, install the [lovelace-navbar-card](https://github.com/joseluis9595/lovelace-navbar-card).

-----

## 🖼️ **Screenshots** 

### ☀️ Light Mode: 
![Screenshot_2025-07-25-23-04-57-629](https://github.com/user-attachments/assets/85fe48bf-c151-4af0-8c29-8bb0bc93222b)
![Screenshot_2025-07-25-23-05-19-615](https://github.com/user-attachments/assets/d20a2787-04f5-47ea-a9a4-0cc0780deefa)
![Screenshot_2025-07-25-23-05-01-929](https://github.com/user-attachments/assets/fe27c4d3-b428-4a7e-96f2-4ffe986ce498)

### 🌑 Dark Mode: 
![Screenshot_2025-07-25-23-05-39-956](https://github.com/user-attachments/assets/68b928ec-d2ce-4a13-add5-3cad97124947)
![Screenshot_2025-07-25-23-05-57-936](https://github.com/user-attachments/assets/c675de08-1483-4a25-ba29-d68c004191e8)
![Screenshot_2025-07-25-23-05-45-793](https://github.com/user-attachments/assets/f225d13a-5dc8-4104-b233-6ace56e306b8)


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


### 2. **State-Based card-mod Styling Fails**  
🎨 [#17](https://github.com/wessamlauf/homeassistant-frosted-glass-themes/issues/17)  
Dynamic background colors using Jinja templates in `card_mod` (e.g., for chips) are overridden by the theme’s global transparency rules (`background: none !important`).  
➡️ *Workaround: Disable Frosted Glass manually per card using `card-mod`.*


### 3. **HACS Dropdowns Broken by Blur**  
📦 [#42](https://github.com/wessamlauf/homeassistant-frosted-glass-themes/issues/42)  
Blur effects break dropdown visibility inside HACS menus due to how Home Assistant renders these elements **outside the theme root DOM**.  
Multiple fixes were tested, but the problem stems from **Material Web Components** and is unlikely to be solvable from the theme side.  
➡️ *Won’t fix unless upstream behavior changes.*


### 4. **stack-in-card Incompatibility**  
🧱 [#44](https://github.com/wessamlauf/homeassistant-frosted-glass-themes/issues/44)  
Cards rendered inside `custom:stack-in-card` are deeply nested, and the theme’s `::before` blur cannot be excluded reliably for inner elements.  
➡️ *Recommended workaround: Use `card-mod` inside each card to manually disable the `::before` layer.*


### 5. **Performance on Low-End Devices**  
The heavy use of `backdrop-filter: blur()` may cause noticeable lag on low-end hardware (older tablets, Pi-based dashboards, etc.).  
➡️ *A future “Frosted Glass Lite” variant is planned, with simplified visuals for better performance.*

---

## ✨ Star History 

[![Star History Chart](https://api.star-history.com/svg?repos=wessamlauf/homeassistant-frosted-glass-themes&type=Date)](https://www.star-history.com/#wessamlauf/homeassistant-frosted-glass-themes&Date)
