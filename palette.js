// ======================================
// palette.js
// ======================================
// カラーパレット切替（全ページ共通）です。
//
// - Color Hunt の4色パレットを10セット持ち、CSS変数へ適用して
//   テーマを切り替えます。パレットは他の自作サイトと重複しない
//   セットを選んでいます。
// - ページを開くたびにランダムで1つ選びます（保存・復元はしません）。
// - 各ページのヘッダーにある #palette-slot へ、ミニバー
//   （パレット順に 41% / 26% / 18% / 15%）＋名前＋▽ の
//   カスタムドロップダウンを描画します。
// - 適用先のCSS変数は各ページ共通の語彙（--bg / --surface /
//   --surface-soft / --border / --accent / --accent-soft /
//   --accent-light / --text / --text-muted）に合わせています。
//   本文グラデーション用に --bg-grad-1〜3 も持ちます。

(() => {
  const PALETTES = [
  {
    "name": "Slate Cyan",
    "colors": [
      "#222831",
      "#393E46",
      "#00ADB5",
      "#EEEEEE"
    ],
    "vars": {
      "bg": "#161C24",
      "bgGrad1": "#0F1319",
      "bgGrad2": "#161C24",
      "bgGrad3": "#12171E",
      "surface": "rgba(29, 36, 46, 0.94)",
      "surfaceSoft": "rgba(35, 43, 55, 0.7)",
      "border": "rgba(255, 255, 255, 0.12)",
      "borderStrong": "rgba(255, 255, 255, 0.2)",
      "accent": "#00ADB5",
      "accent2": "#4DC9CF",
      "accentSoft": "rgba(0, 173, 181, 0.16)",
      "text": "#EEEEEE",
      "textMuted": "#A5A7A9"
    }
  },
  {
    "name": "Berry Sunset",
    "colors": [
      "#F9ED69",
      "#F08A5D",
      "#B83B5E",
      "#6A2C70"
    ],
    "vars": {
      "bg": "#2E1433",
      "bgGrad1": "#220F26",
      "bgGrad2": "#2E1433",
      "bgGrad3": "#27112C",
      "surface": "rgba(59, 27, 66, 0.94)",
      "surfaceSoft": "rgba(69, 31, 77, 0.7)",
      "border": "rgba(255, 255, 255, 0.12)",
      "borderStrong": "rgba(255, 255, 255, 0.2)",
      "accent": "#F08A5D",
      "accent2": "#E87A9C",
      "accentSoft": "rgba(240, 138, 93, 0.16)",
      "text": "#FBF1E6",
      "textMuted": "#B5A6A9"
    }
  },
  {
    "name": "Forest Night",
    "colors": [
      "#191A19",
      "#1E5128",
      "#4E9F3D",
      "#D8E9A3"
    ],
    "vars": {
      "bg": "#101A12",
      "bgGrad1": "#090F0A",
      "bgGrad2": "#101A12",
      "bgGrad3": "#0C140E",
      "surface": "rgba(24, 37, 27, 0.94)",
      "surfaceSoft": "rgba(30, 46, 34, 0.7)",
      "border": "rgba(255, 255, 255, 0.12)",
      "borderStrong": "rgba(255, 255, 255, 0.2)",
      "accent": "#4E9F3D",
      "accent2": "#C4D68D",
      "accentSoft": "rgba(78, 159, 61, 0.16)",
      "text": "#EDF5E2",
      "textMuted": "#A2AB9B"
    }
  },
  {
    "name": "Midnight Ocean",
    "colors": [
      "#0B2447",
      "#19376D",
      "#576CBC",
      "#A5D7E8"
    ],
    "vars": {
      "bg": "#0A1830",
      "bgGrad1": "#071121",
      "bgGrad2": "#0A1830",
      "bgGrad3": "#081428",
      "surface": "rgba(16, 32, 60, 0.94)",
      "surfaceSoft": "rgba(19, 38, 72, 0.7)",
      "border": "rgba(255, 255, 255, 0.12)",
      "borderStrong": "rgba(255, 255, 255, 0.2)",
      "accent": "#7486C8",
      "accent2": "#A5D7E8",
      "accentSoft": "rgba(116, 134, 200, 0.16)",
      "text": "#E9F2FB",
      "textMuted": "#9DA8B6"
    }
  },
  {
    "name": "Mocha Slate",
    "colors": [
      "#2C3639",
      "#3F4E4F",
      "#A27B5F",
      "#DCD7C9"
    ],
    "vars": {
      "bg": "#171D1E",
      "bgGrad1": "#0F1314",
      "bgGrad2": "#171D1E",
      "bgGrad3": "#131718",
      "surface": "rgba(34, 43, 44, 0.94)",
      "surfaceSoft": "rgba(41, 51, 53, 0.7)",
      "border": "rgba(255, 255, 255, 0.12)",
      "borderStrong": "rgba(255, 255, 255, 0.2)",
      "accent": "#AD8B72",
      "accent2": "#DCD7C9",
      "accentSoft": "rgba(173, 139, 114, 0.16)",
      "text": "#F2EDE1",
      "textMuted": "#A8A69F"
    }
  },
  {
    "name": "Indigo Dream",
    "colors": [
      "#242F9B",
      "#646FD4",
      "#9BA3EB",
      "#DBDFFD"
    ],
    "vars": {
      "bg": "#11142F",
      "bgGrad1": "#0C0E22",
      "bgGrad2": "#11142F",
      "bgGrad3": "#0E1128",
      "surface": "rgba(26, 30, 69, 0.94)",
      "surfaceSoft": "rgba(30, 35, 80, 0.7)",
      "border": "rgba(255, 255, 255, 0.12)",
      "borderStrong": "rgba(255, 255, 255, 0.2)",
      "accent": "#7882DA",
      "accent2": "#9BA3EB",
      "accentSoft": "rgba(120, 130, 218, 0.16)",
      "text": "#ECEEFE",
      "textMuted": "#A2A4B8"
    }
  },
  {
    "name": "Coral Reef",
    "colors": [
      "#364F6B",
      "#3FC1C9",
      "#FC5185",
      "#F5F5F5"
    ],
    "vars": {
      "bg": "#12202F",
      "bgGrad1": "#0D1722",
      "bgGrad2": "#12202F",
      "bgGrad3": "#0F1B28",
      "surface": "rgba(26, 44, 62, 0.94)",
      "surfaceSoft": "rgba(31, 52, 73, 0.7)",
      "border": "rgba(255, 255, 255, 0.12)",
      "borderStrong": "rgba(255, 255, 255, 0.2)",
      "accent": "#FC5689",
      "accent2": "#5FD3DB",
      "accentSoft": "rgba(252, 86, 137, 0.16)",
      "text": "#F2F6F9",
      "textMuted": "#A6ADB4"
    }
  },
  {
    "name": "Ember Gray",
    "colors": [
      "#303841",
      "#3A4750",
      "#D72323",
      "#EEEEEE"
    ],
    "vars": {
      "bg": "#171B20",
      "bgGrad1": "#101216",
      "bgGrad2": "#171B20",
      "bgGrad3": "#13161A",
      "surface": "rgba(33, 39, 46, 0.94)",
      "surfaceSoft": "rgba(39, 47, 55, 0.7)",
      "border": "rgba(255, 255, 255, 0.12)",
      "borderStrong": "rgba(255, 255, 255, 0.2)",
      "accent": "#E66666",
      "accent2": "#E8ECEE",
      "accentSoft": "rgba(230, 102, 102, 0.16)",
      "text": "#F0F2F3",
      "textMuted": "#A6A9AB"
    }
  },
  {
    "name": "Jade Mint",
    "colors": [
      "#1FAB89",
      "#62D2A2",
      "#9DF3C4",
      "#D7FBE8"
    ],
    "vars": {
      "bg": "#0B1D15",
      "bgGrad1": "#06100C",
      "bgGrad2": "#0B1D15",
      "bgGrad3": "#081610",
      "surface": "rgba(19, 42, 31, 0.94)",
      "surfaceSoft": "rgba(24, 53, 39, 0.7)",
      "border": "rgba(255, 255, 255, 0.12)",
      "borderStrong": "rgba(255, 255, 255, 0.2)",
      "accent": "#1FAB89",
      "accent2": "#62D2A2",
      "accentSoft": "rgba(31, 171, 137, 0.16)",
      "text": "#EAF7EF",
      "textMuted": "#9EADA5"
    }
  },
  {
    "name": "Solar Violet",
    "colors": [
      "#3D348B",
      "#7678ED",
      "#F7B801",
      "#F18701"
    ],
    "vars": {
      "bg": "#191435",
      "bgGrad1": "#130F28",
      "bgGrad2": "#191435",
      "bgGrad3": "#16112E",
      "surface": "rgba(35, 27, 77, 0.94)",
      "surfaceSoft": "rgba(40, 31, 88, 0.7)",
      "border": "rgba(255, 255, 255, 0.12)",
      "borderStrong": "rgba(255, 255, 255, 0.2)",
      "accent": "#F18701",
      "accent2": "#9A9BF2",
      "accentSoft": "rgba(241, 135, 1, 0.16)",
      "text": "#F3F0FF",
      "textMuted": "#A9A5BA"
    }
  }
];

  const PALETTE_VAR_KEYS = {
    bg: '--bg',
    bgGrad1: '--bg-grad-1',
    bgGrad2: '--bg-grad-2',
    bgGrad3: '--bg-grad-3',
    surface: '--surface',
    surfaceSoft: '--surface-soft',
    border: '--border',
    borderStrong: '--border-strong',
    accent: '--accent',
    accent2: '--accent-2',
    accentSoft: '--accent-soft',
    text: '--text',
    textMuted: '--text-muted'
  };

  function applyPalette(palette) {
    const root = document.documentElement;
    for (const [key, cssVar] of Object.entries(PALETTE_VAR_KEYS)) {
      if (palette.vars[key]) {
        root.style.setProperty(cssVar, palette.vars[key]);
      }
    }
    // index.css は --accent-light、他ページは --accent-soft を使うため両方へ適用
    if (palette.vars.accentSoft) {
      root.style.setProperty('--accent-light', palette.vars.accentSoft);
    }
  }

  // パレットの4色を 41/26/18/15 の比率で並べたバーを作ります
  function buildBar(palette, className) {
    const bar = document.createElement('span');
    bar.className = className;
    bar.setAttribute('aria-hidden', 'true');
    for (const color of palette.colors) {
      const seg = document.createElement('span');
      seg.style.background = color;
      bar.appendChild(seg);
    }
    return bar;
  }

  function initPalette() {
    const slot = document.getElementById('palette-slot');
    if (!slot) {
      return;
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'palette-dropdown';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-button';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'カラーパレット');

    const buttonSwatch = buildBar(PALETTES[0], 'palette-swatch');
    const buttonName = document.createElement('span');
    buttonName.className = 'palette-button-name';
    const caret = document.createElement('span');
    caret.className = 'palette-caret';
    caret.setAttribute('aria-hidden', 'true');
    caret.textContent = '▽';
    button.append(buttonSwatch, buttonName, caret);

    const menu = document.createElement('ul');
    menu.className = 'palette-menu';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', 'カラーパレット');
    menu.hidden = true;

    function closeMenu() {
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
    function openMenu() {
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
    }

    // 選択はその訪問中だけ有効（保存・復元はしない）
    function selectPalette(index) {
      const palette = PALETTES[index];
      applyPalette(palette);
      [...buttonSwatch.children].forEach((seg, i) => {
        if (palette.colors[i]) seg.style.background = palette.colors[i];
      });
      buttonName.textContent = palette.name;
      [...menu.children].forEach((item, i) => {
        const selected = i === index;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-selected', String(selected));
      });
    }

    PALETTES.forEach((palette, i) => {
      const item = document.createElement('li');
      item.className = 'palette-item';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      item.tabIndex = -1;

      const head = document.createElement('span');
      head.className = 'palette-item-head';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'palette-item-name';
      nameSpan.textContent = palette.name;
      const check = document.createElement('span');
      check.className = 'palette-check';
      check.textContent = '✓';
      head.append(nameSpan, check);

      item.append(head, buildBar(palette, 'palette-bar'));
      item.addEventListener('click', () => {
        selectPalette(i);
        closeMenu();
        button.focus();
      });
      menu.appendChild(item);
    });

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menu.hidden) openMenu();
      else closeMenu();
    });
    // メニュー内のクリックで外側クリック判定にならないようにする
    menu.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) {
        closeMenu();
        button.focus();
      }
    });

    dropdown.append(button, menu);
    slot.appendChild(dropdown);

    selectPalette(initialIndex);
  }

  // アクセスごとにランダムで1つ選ぶ（前回の選択は保存・復元しない）
  const initialIndex = Math.floor(Math.random() * PALETTES.length);
  // CSS変数の適用は描画前に行い、ドロップダウンの描画はDOM構築後に行う
  applyPalette(PALETTES[initialIndex]);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPalette);
  } else {
    initPalette();
  }
})();
