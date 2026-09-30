/* Behavioral CSS regression fixtures, based on the public component contracts:
 * home-assistant/frontend: ha-card, ha-sidebar, ha-drawer, state-badge;
 * hacs/frontend + its legacy HA submodule: fixedMenuPosition MWC selects;
 * Clooos/Bubble-Card: .bubble-container / .bubble-wrapper / icon attributes;
 * joseluis9595/lovelace-navbar-card: :host defaults and sibling popup;
 * piitaya/lovelace-mushroom: slotted icons and .shape.disabled;
 * custom-cards/stack-in-card: inline background and keep.background behavior.
 * These are DOM/CSS fixtures, not an end-to-end Home Assistant installation.
 */
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const sections = JSON.parse(execFileSync('python3', ['-c', `
import json, os, pathlib, yaml
result = []
for p in sorted(pathlib.Path(os.environ.get('FROSTED_GLASS_THEMES_DIR', 'themes')).glob('*.yaml')):
    data = yaml.safe_load(p.read_text())
    for name, theme in data.items():
        modes = theme.get('modes', {})
        entries = modes.items() if len(modes) == 2 else [(next(iter(modes)), theme)]
        for mode, values in entries:
            values = dict(values)
            for key, value in list(values.items()):
                if key.startswith('card-mod-') and key.endswith('-yaml'):
                    values[key] = yaml.safe_load(value)
            result.append(dict(name=name, mode=mode, values=values))
print(json.dumps(result))
`], { cwd: root, encoding: 'utf8' }));

async function run() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.FROSTED_GLASS_BROWSER ? {
      executablePath: process.env.FROSTED_GLASS_BROWSER,
      args: ['--no-sandbox', '--disable-gpu'],
    } : {}),
  });
  let checks = 0;
  try {
    for (const section of sections) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
      await page.route('**/*', route => route.abort());
      await page.setContent('<body style="margin:0; font:14px system-ui; background:linear-gradient(120deg,#82adc7,#bd95c9,#c7b87e); min-height:100vh"></body>');
      const result = await page.evaluate(({ values: v, name }) => {
        const errors = [];
        let count = 0;
        const check = (ok, message) => { count++; if (!ok) errors.push(message); };
        const css = (el, prop, pseudo) => getComputedStyle(el, pseudo).getPropertyValue(prop).trim();
        const color = value => {
          const el = document.createElement('span');
          el.style.color = value; document.body.append(el);
          const result = css(el, 'color'); el.remove(); return result;
        };
        const addStyle = (where, text) => {
          const style = document.createElement('style'); style.textContent = text; where.append(style);
        };
        // Validate every embedded CSS leaf with the browser's parser. A dropped
        // rule changes this count, including nested media and keyframe rules.
        function validateStyles(node, location) {
          if (typeof node === 'object') {
            for (const [key, value] of Object.entries(node)) validateStyles(value, `${location}.${key}`);
            return;
          }
          const source = node.replace(/\/\*[\s\S]*?\*\//g, '');
          const sheet = new CSSStyleSheet(); sheet.replaceSync(source);
          const ruleCount = rules => [...rules].reduce((n, rule) => n + 1 + (rule.cssRules ? ruleCount(rule.cssRules) : 0), 0);
          check(ruleCount(sheet.cssRules) === (source.match(/\{/g) || []).length, `${location}: CSS rule was discarded`);
        }
        for (const [key, value] of Object.entries(v)) {
          if (key.startsWith('card-mod-') && key !== 'card-mod-theme') validateStyles(value, key);
          if (typeof value === 'string' && !key.startsWith('card-mod-') && !key.startsWith('uix-')) {
            document.documentElement.style.setProperty(`--${key}`, value);
          }
        }
        document.body.style.color = 'var(--primary-text-color)';
        const cardStyles = v['card-mod-card-yaml'];
        const base = cardStyles['.'];
        const lite = name.includes('Lite');
        customElements.define('ha-card', class extends HTMLElement {
          constructor() {
            super();
            const shadow = this.attachShadow({ mode: 'open' });
            shadow.innerHTML = `<style>:host { display:block; border:var(--ha-card-border); border-radius:var(--ha-card-border-radius); box-shadow:var(--ha-card-box-shadow); background:var(--ha-card-background); color:var(--primary-text-color); }</style><slot></slot>`;
          }
        });
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:24px 24px 180px 220px';
        document.body.append(grid);
        function card(tag, markup, native = '') {
          const host = document.createElement(tag); const shadow = host.attachShadow({ mode: 'open' });
          shadow.innerHTML = `<style>${native}\nha-card {min-height:80px;padding:14px;box-sizing:border-box} ha-state-icon, ha-icon {display:inline-block;width:24px;height:24px;text-align:center}</style>${markup}`;
          addStyle(shadow, base); grid.append(host); return host;
        }
        const button = card('hui-button-card', '<ha-card><ha-state-icon data-domain="fan" data-state="on">✣</ha-state-icon> Fan</ha-card>');
        const normal = button.shadowRoot.querySelector('ha-card');
        const fan = button.shadowRoot.querySelector('ha-state-icon');
        check(css(normal, 'background-color', '::before') === color(v['ha-card-glass-tint']), 'standard card tint');
        check(css(normal, 'backdrop-filter') === 'none', 'standard card must not trap fixed menus');
        check((css(normal, 'backdrop-filter', '::before') === 'none') === lite, 'standard glass/Lite filter');
        check(css(fan, 'animation-name') === 'frosted-glass-fan-spin', 'fan on animation');
        fan.dataset.state = 'off';
        check(css(fan, 'animation-name') === 'none', 'fan off must stop');
        fan.dataset.state = 'on';
        const light = card('hui-entity-card', '<ha-card><ha-state-icon data-domain="light" data-state="off">☀</ha-state-icon> Light</ha-card>');
        const lightCard = light.shadowRoot.querySelector('ha-card');
        const lightIcon = light.shadowRoot.querySelector('ha-state-icon');
        lightCard.style.transition = 'none';
        const inactiveShadow = css(lightCard, 'box-shadow');
        lightIcon.dataset.state = 'on';
        check(css(lightCard, 'box-shadow') !== inactiveShadow, 'active light card glow');
        lightIcon.dataset.state = 'off';
        check(css(lightCard, 'box-shadow') === inactiveShadow, 'inactive light clears glow');

        const bubbleNative = '.bubble-container{position:relative;height:50px;background:var(--bubble-main-background-color);border:var(--bubble-border);border-radius:var(--bubble-border-radius);box-shadow:var(--bubble-box-shadow)}.bubble-wrapper{position:absolute;inset:0;display:flex;align-items:center;padding:8px;gap:12px}';
        const bubble = card('bubble-card', '<ha-card><div class="bubble-container"><div class="bubble-wrapper is-on"><ha-icon class="bubble-main-icon" icon="mdi:fan">✣</ha-icon>Bubble fan</div></div></ha-card>', bubbleNative);
        const bubbleCard = bubble.shadowRoot.querySelector('ha-card');
        const bubbleSurface = bubble.shadowRoot.querySelector('.bubble-container');
        const bubbleIcon = bubble.shadowRoot.querySelector('ha-icon');
        check(css(bubbleCard, 'content', '::before') === 'none', 'Bubble outer layer disabled');
        check(css(bubbleCard, 'border-top-style') === 'none', 'Bubble outer border disabled');
        check(css(bubbleSurface, 'background-color') === color(v['ha-card-glass-tint']), 'Bubble native tint');
        check(css(bubbleSurface, 'backdrop-filter') === 'none', 'Bubble surface must not trap fixed menus');
        check((css(bubbleSurface, 'backdrop-filter', '::before') === 'none') === lite, 'Bubble glass/Lite filter');
        check(css(bubbleIcon, 'animation-name') === 'frosted-glass-fan-spin', 'Bubble fan on animation');
        bubble.shadowRoot.querySelector('.bubble-wrapper').className = 'bubble-wrapper is-off';
        check(css(bubbleIcon, 'animation-name') === 'none', 'Bubble fan off must stop');
        bubble.shadowRoot.querySelector('.bubble-wrapper').className = 'bubble-wrapper is-on';

        const navbarNative = ':host{--navbar-background-color:var(--card-background-color);--navbar-border-radius:var(--ha-card-border-radius,12px);--navbar-primary-color:var(--primary-color);--navbar-box-shadow:0 -1px 4px #0002;--navbar-box-shadow-mobile-floating:0 2px 4px #0002}.navbar{position:fixed;bottom:18px;left:260px;right:24px}.navbar-card{display:flex;gap:30px;min-height:60px}.navbar-card.mobile.floating{box-shadow:var(--navbar-box-shadow-mobile-floating)!important;border-radius:var(--navbar-border-radius)!important}.navbar-popup{position:fixed;top:110px;left:310px;z-index:901}.popup-item .button{background:var(--navbar-background-color)}';
        const navbar = card('navbar-card', '<div class="navbar"><ha-card class="navbar-card mobile floating">Home　　Lights　　Climate</ha-card><ha-card class="media-player">Media player</ha-card></div><div class="navbar-popup"><div class="popup-item"><div class="button">Popup</div></div></div>', navbarNative);
        const navCard = navbar.shadowRoot.querySelector('.navbar-card');
        check(css(navCard, 'background-color') === color(v['navbar-background-color']), 'Navbar host defaults overridden');
        check((css(navCard, 'backdrop-filter') === 'none') === lite, 'Navbar glass/Lite filter');
        check(css(navCard, 'content', '::before') === 'none', 'Navbar no second glass layer');
        check(css(navbar.shadowRoot.querySelector('.media-player'), 'content', '::before') === 'none', 'Navbar media player no second layer');
        check(navbar.shadowRoot.querySelector('.navbar-popup').getBoundingClientRect().top === 110, 'Navbar popup remains viewport-positioned');
        // A later per-card override at the same specificity remains possible.
        addStyle(navbar.shadowRoot, ':host {--navbar-background-color:rgb(12,34,56)}');
        check(css(navCard, 'background-color') === 'rgb(12, 34, 56)', 'Navbar user variable override');

        const slider = card('slider-button-card', '<ha-card><div class="button off">Slider button</div><div class="track"></div></ha-card>', ':host{--btn-bg-color-off:#2b374e;--btn-bg-color-on:#20293c;--slider-track-color:#2b374e}.button.off{background:var(--btn-bg-color-off)}.track{background:var(--slider-track-color);height:4px}');
        check(css(slider.shadowRoot.querySelector('.button'), 'background-color') === color(v['btn-bg-color-off']), 'Slider host button defaults overridden');
        check(css(slider.shadowRoot.querySelector('.track'), 'background-color') === color(v['slider-track-color']), 'Slider track defaults overridden');
        const hue = card('hue-like-light-card', '<ha-card style="--hue-background:rgb(230,196,85);color:rgb(20,20,20)">Hue light</ha-card>', 'ha-card{background:var(--hue-background)}');
        check(css(hue.shadowRoot.querySelector('ha-card'), 'background-color') === 'rgb(230, 196, 85)', 'Hue calculated background preserved');
        check(css(hue.shadowRoot.querySelector('ha-card'), 'content', '::before') === 'none', 'Hue overlay disabled');

        const art = card('mushroom-template-card', '<ha-card>Template artwork</ha-card>');
        addStyle(art.shadowRoot, 'ha-card::before{content:"";position:absolute;width:8px;height:8px;border-radius:50%;background:red;top:8px;left:8px}');
        const artCard = art.shadowRoot.querySelector('ha-card');
        check(css(artCard, 'width', '::before') === '8px', 'Mushroom custom pseudo-element geometry preserved');
        check(css(artCard, 'backdrop-filter', '::before') === 'none', 'Mushroom artwork must not acquire blur');

        const room = card('room-summary-card', '<ha-card>Room summary</ha-card>', ':host([frosted-glass]) ha-card::before{content:"";position:absolute;inset:0;background:var(--ha-card-glass-tint);backdrop-filter:var(--ha-card-backdrop-filter);box-shadow:var(--ha-card-glass-inset-shadow);border-radius:inherit}');
        room.setAttribute('frosted-glass', '');
        check(css(room.shadowRoot.querySelector('ha-card'), 'z-index', '::before') === 'auto', 'Room Summary native overlay preserved');
        const stack = card('stack-in-card', '<ha-card><div></div></ha-card>');
        const child = card('hui-sensor-card', '<ha-card style="background: transparent;box-shadow:none;border-radius:0">Nested sensor</ha-card>');
        const kept = card('hui-button-card', '<ha-card style="--keep-background:true">Kept background</ha-card>');
        stack.shadowRoot.querySelector('ha-card > div').append(child, kept);
        check(css(child.shadowRoot.querySelector('ha-card'), 'content', '::before') === 'none', 'stack child has no duplicate overlay');
        check(css(child.shadowRoot.querySelector('ha-card'), 'border-top-style') === 'none', 'stack child has no duplicate border');
        check(css(kept.shadowRoot.querySelector('ha-card'), 'content', '::before') !== 'none', 'stack keep-background remains supported');
        const wrapper = document.createElement('config-template-card'); wrapper.attachShadow({mode:'open'}).append(bubble); grid.append(wrapper);
        check(css(bubbleCard, 'content', '::before') === 'none', 'wrapped Bubble detection');

        const badgeHost = document.createElement('hui-entity-badge'); grid.append(badgeHost);
        const badgeRoot = badgeHost.attachShadow({mode:'open'});
        badgeRoot.innerHTML = '<ha-badge></ha-badge><div class="badge">Mushroom badge</div>';
        addStyle(badgeRoot, v['card-mod-badge']);
        const badge = badgeRoot.querySelector('ha-badge');
        const badgeContent = badge.attachShadow({mode:'open'});
        badgeContent.innerHTML = '<style>.badge{box-shadow:var(--ha-card-box-shadow);background:var(--ha-card-background);padding:8px;border-radius:18px}</style><div class="badge">Entity badge</div>';
        check(css(badge, '--ha-card-box-shadow') === v['frosted-glass-badge-shadow'], 'native badge gets restrained shadow');
        check(css(badgeRoot.querySelector('.badge'), '--ha-card-box-shadow') === v['frosted-glass-badge-shadow'], 'Mushroom badge gets same shadow');
        check((css(badge, 'backdrop-filter') === 'none') === lite, 'native badge glass/Lite filter');

        const row = document.createElement('hui-fan-entity-row'); grid.append(row);
        const rowRoot = row.attachShadow({mode:'open'});
        rowRoot.innerHTML = '<hui-generic-entity-row></hui-generic-entity-row>';
        const genericRoot = rowRoot.firstChild.attachShadow({mode:'open'});
        genericRoot.innerHTML = '<state-badge></state-badge>Fan entity row';
        const stateRoot = genericRoot.firstChild.attachShadow({mode:'open'});
        stateRoot.innerHTML = '<ha-state-icon data-domain="fan" data-state="on">✣</ha-state-icon>';
        addStyle(stateRoot, v['card-mod-row-yaml']['hui-generic-entity-row $']['state-badge $']);
        const rowIcon = stateRoot.firstChild;
        check(css(rowIcon, 'animation-name') === 'frosted-glass-fan-spin', 'entity-row fan crosses both shadow boundaries');
        rowIcon.dataset.state = 'off';
        check(css(rowIcon, 'animation-name') === 'none', 'entity-row off fan stops');
        rowIcon.dataset.state = 'on';

        // Mushroom's disabled state is reflected on its internal .shape, not
        // on the card or icon. Test inheritance across that actual slot boundary.
        function mushroom(tag) {
          const host = card(tag, '<ha-card><mushroom-shape-icon><ha-state-icon>✣</ha-state-icon></mushroom-shape-icon>Mushroom</ha-card>', 'ha-state-icon{animation:none}.spin ha-state-icon{animation:spin 1s linear infinite}');
          const shapeHost = host.shadowRoot.querySelector('mushroom-shape-icon');
          const shapeShadow = shapeHost.attachShadow({mode:'open'});
          shapeShadow.innerHTML = '<div class="shape"><slot></slot></div>';
          addStyle(shapeShadow, cardStyles['mushroom-shape-icon $']);
          return { host, shape:shapeShadow.querySelector('.shape'), icon:host.shadowRoot.querySelector('ha-state-icon') };
        }
        const mushFan = mushroom('mushroom-fan-card');
        check(css(mushFan.icon, 'animation-name') === 'frosted-glass-fan-spin', 'Mushroom active fan slot inheritance');
        mushFan.shape.classList.add('disabled');
        check(css(mushFan.icon, 'animation-name') === 'none', 'Mushroom off fan stops');
        mushFan.shape.classList.remove('disabled');
        const mushLight = mushroom('mushroom-light-card');
        check(css(mushLight.icon, 'filter').startsWith('drop-shadow('), 'Mushroom active light icon glow');
        mushLight.shape.classList.add('disabled');
        check(css(mushLight.icon, 'filter') === 'none', 'Mushroom inactive light clears glow');

        // Legacy dialog/filter geometry: the menu is inside two shadow roots,
        // while its foundation supplies viewport coordinates for position:fixed.
        const dialog = document.createElement('ha-dialog'); document.body.append(dialog);
        const dialogRoot = dialog.attachShadow({mode:'open'});
        dialogRoot.innerHTML = '<style>.surface{position:fixed;left:330px;top:180px;width:360px;padding:24px;background:var(--ha-dialog-surface-background);backdrop-filter:var(--ha-dialog-surface-backdrop-filter);box-shadow:var(--dialog-box-shadow)}</style><div class="surface"><ha-select></ha-select></div>';
        const select = dialogRoot.querySelector('ha-select');
        const selectRoot = select.attachShadow({mode:'open'});
        selectRoot.innerHTML = '<style>:host{display:block}.anchor{height:48px;background:var(--mdc-select-fill-color)}.menu{position:fixed;width:220px;background:var(--mdc-theme-surface)}</style><div class="anchor">HACS repository Type ▾</div><div class="menu">Integration<br>Dashboard<br>Theme</div>';
        const anchor = selectRoot.querySelector('.anchor');
        const menu = selectRoot.querySelector('.menu');
        const anchorRect = anchor.getBoundingClientRect();
        menu.style.left = `${anchorRect.left}px`; menu.style.top = `${anchorRect.bottom}px`;
        dialog.style.setProperty('--ha-dialog-surface-backdrop-filter', 'blur(8px)');
        check(Math.abs(menu.getBoundingClientRect().top - anchorRect.bottom) > 20, 'legacy dropdown fixture must reproduce displacement');
        dialog.style.removeProperty('--ha-dialog-surface-backdrop-filter');
        check(Math.abs(menu.getBoundingClientRect().top - anchorRect.bottom) < 1, 'HACS menu vertical alignment');
        check(Math.abs(menu.getBoundingClientRect().left - anchorRect.left) < 1, 'HACS menu horizontal alignment');
        check(css(menu, 'background-color') === color(v['frosted-glass-menu-surface']), 'legacy menu readable surface');
        const modernMenu = document.createElement('ha-dropdown'); document.body.append(modernMenu);
        const modernRoot = modernMenu.attachShadow({mode:'open'});
        modernRoot.innerHTML = '<style>:host{--wa-color-surface-raised:var(--card-background-color,var(--ha-dialog-surface-background))}.menu{background:var(--wa-color-surface-raised)}</style><div class="menu">Modern menu</div>';
        check(css(modernRoot.querySelector('.menu'), 'background-color') === color(v['frosted-glass-menu-surface']), 'modern dropdown host default readable surface');

        // Dedicated engine sidebar/drawer hooks, rather than unreachable hui-root
        // selectors, style a slotted sidebar on desktop and the modal drawer part.
        const drawer = document.createElement('ha-drawer'); document.body.append(drawer);
        const drawerRoot = drawer.attachShadow({mode:'open'});
        drawerRoot.innerHTML = '<style>.sidebar-shell{position:fixed;inset:0 auto 0 0;width:200px}</style><div class="sidebar-shell"><slot name="sidebar"></slot></div><wa-drawer></wa-drawer>';
        addStyle(drawerRoot, v['card-mod-drawer']);
        const sidebar = document.createElement('ha-sidebar'); sidebar.slot='sidebar'; drawer.append(sidebar);
        const sidebarRoot = sidebar.attachShadow({mode:'open'});
        sidebarRoot.innerHTML = '<style>:host{display:block;height:100%;background:var(--sidebar-background-color)}.menu{padding:20px}</style><div class="menu">Home Assistant<br><br>Overview<br><br>Settings</div>';
        addStyle(sidebarRoot, v['card-mod-sidebar']);
        check(css(sidebar, 'background-color') === 'rgba(0, 0, 0, 0)', 'sidebar avoids a duplicate tint');
        check(css(sidebar, 'background-color', '::before') === color(v['sidebar-background-color']), 'sidebar glass tint');
        check((css(sidebar, 'backdrop-filter', '::before') === 'none') === lite, 'sidebar glass/Lite blur');
        check(css(sidebar, 'backdrop-filter') === 'none', 'sidebar host must not trap tooltips');
        check(css(drawerRoot.querySelector('.sidebar-shell'), 'background-image') !== 'none', 'sidebar wallpaper exists behind the glass');
        const wa = drawerRoot.querySelector('wa-drawer'); const waRoot = wa.attachShadow({mode:'open'});
        waRoot.innerHTML = '<div part="dialog">Modal drawer</div>';
        check(css(waRoot.firstChild, 'background-image') !== 'none', 'modal drawer part gets wallpaper');

        // Expose handles for reduced-motion assertions after media emulation.
        window.frostedQa = { fan, bubbleIcon, mushFan:mushFan.icon, rowIcon };
        return { errors, count };
      }, section);
      assert.deepEqual(result.errors, [], `${section.name}/${section.mode}`);
      checks += result.count;
      await page.emulateMedia({ reducedMotion:'reduce' });
      const reduced = await page.evaluate(() => Object.values(window.frostedQa).map(el => getComputedStyle(el).animationName));
      assert.deepEqual(reduced, ['none','none','none','none'], `${section.name}: reduced motion`);
      checks += reduced.length;
      if (process.env.FROSTED_GLASS_SCREENSHOTS && section.name === 'Frosted Glass') {
        await page.screenshot({ path:path.join(process.env.FROSTED_GLASS_SCREENSHOTS, `${section.mode}.png`), fullPage:true });
      }
      await page.close();
      console.log(`PASS ${section.name} / ${section.mode}`);
    }
  } finally {
    await browser.close();
  }
  console.log(`${checks} browser checks passed across ${sections.length} theme/mode combinations.`);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
