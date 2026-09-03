// Theme Data Engine & Persistence for FinalOrbit
export const THEME_STORAGE_KEY = 'void_visual_theme';

export const THEMES = {
  neon_cyber: {
    id: 'neon_cyber',
    name: 'NEON CYBER',
    tagline: 'Cyberpunk Neon Cyberstorm',
    bg: '#050814',
    bgRadial: '#0a1535',
    accent: '#00f0ff',
    alarm: '#ff0055',
    laser: '#00f0ff',
    panelBg: 'rgba(5, 8, 20, 0.92)',
    textMain: '#f0f4f8',
    textGlow: '0 0 12px #00f0ff',
    starTint: '#00f0ff',
    wireframe: false
  },
  synthwave_sunset: {
    id: 'synthwave_sunset',
    name: 'SYNTHWAVE SUNSET',
    tagline: '80s Retro Magenta & Violet',
    bg: '#100320',
    bgRadial: '#2d0654',
    accent: '#ff0077',
    alarm: '#8a2be2',
    laser: '#ffaa00',
    panelBg: 'rgba(16, 3, 32, 0.92)',
    textMain: '#ffe6ff',
    textGlow: '0 0 12px #ff0077',
    starTint: '#ffaa00',
    wireframe: false
  },
  toxic_biohazard: {
    id: 'toxic_biohazard',
    name: 'TOXIC BIO-HAZARD',
    tagline: 'Radioactive Acid Green & Slime',
    bg: '#040a06',
    bgRadial: '#0c2612',
    accent: '#39ff14',
    alarm: '#d4ff00',
    laser: '#39ff14',
    panelBg: 'rgba(4, 10, 6, 0.92)',
    textMain: '#e6ffe6',
    textGlow: '0 0 12px #39ff14',
    starTint: '#39ff14',
    wireframe: false
  },
  monochrome_arcade: {
    id: 'monochrome_arcade',
    name: 'MONOCHROME ARCADE',
    tagline: 'Game Boy Phosphor Wireframe',
    bg: '#0d1a0d',
    bgRadial: '#183318',
    accent: '#33ff33',
    alarm: '#66ff66',
    laser: '#33ff33',
    panelBg: 'rgba(13, 26, 13, 0.95)',
    textMain: '#33ff33',
    textGlow: '0 0 10px #33ff33',
    starTint: '#33ff33',
    wireframe: true
  }
};

class ThemeManager {
  constructor() {
    this.currentThemeId = this.loadSavedThemeId();
    this.theme = THEMES[this.currentThemeId] || THEMES.neon_cyber;
    this.applyTheme(this.currentThemeId, false);
  }

  loadSavedThemeId() {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && THEMES[saved]) return saved;
    } catch (e) {}
    return 'neon_cyber';
  }

  getTheme() {
    return this.theme;
  }

  setTheme(themeId) {
    if (!THEMES[themeId]) return;
    this.currentThemeId = themeId;
    this.theme = THEMES[themeId];
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch (e) {}
    this.applyCSSVariables();
    this.updateUI();
  }

  applyTheme(themeId, updateUI = true) {
    if (THEMES[themeId]) {
      this.currentThemeId = themeId;
      this.theme = THEMES[themeId];
    }
    this.applyCSSVariables();
    if (updateUI) this.updateUI();
  }

  applyCSSVariables() {
    const root = document.documentElement;
    const t = this.theme;

    root.style.setProperty('--bg-dark', t.bg);
    root.style.setProperty('--bg-color', t.bg);
    root.style.setProperty('--panel-bg', t.panelBg);
    root.style.setProperty('--accent-color', t.accent);
    root.style.setProperty('--neon-cyan', t.accent);
    root.style.setProperty('--neon-magenta', t.alarm);
    root.style.setProperty('--text-main', t.textMain);
    root.style.setProperty('--text-glow', t.textGlow);
    root.style.setProperty('--laser-color', t.laser);
    root.style.setProperty('--alarm-color', t.alarm);
    root.style.setProperty('--border-glow', `0 0 15px ${t.accent}`);
  }

  updateUI() {
    const cards = document.querySelectorAll('.theme-card');
    cards.forEach(card => {
      const tid = card.getAttribute('data-theme-id');
      if (tid === this.currentThemeId) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    const displayTag = document.getElementById('active-theme-display');
    if (displayTag) {
      displayTag.textContent = this.theme.name;
    }
  }
}

export const themeManager = new ThemeManager();
