// 3-Layer Parallax Starfield Engine for FinalOrbit
// Layers move at exact speeds: Layer 1 (0.5px/frame), Layer 2 (1.5px/frame), Layer 3 (3.0px/frame)

export const SECTOR_THEMES = [
  {
    name: 'ACID NEBULA',
    bg: '#040a06',
    nebulaColor: 'rgba(57, 255, 20, 0.12)',
    starColor: '#a8ffb2'
  },
  {
    name: 'SOLAR FLARE',
    bg: '#0d0402',
    nebulaColor: 'rgba(255, 85, 0, 0.12)',
    starColor: '#ffd1a4'
  },
  {
    name: 'DEEP VOID',
    bg: '#030511',
    nebulaColor: 'rgba(0, 240, 255, 0.10)',
    starColor: '#d4f7ff'
  },
  {
    name: 'CYBER RIFT',
    bg: '#080214',
    nebulaColor: 'rgba(255, 0, 119, 0.11)',
    starColor: '#ffd4ec'
  },
  {
    name: 'TOXIC ABYSS',
    bg: '#020b0d',
    nebulaColor: 'rgba(0, 255, 204, 0.10)',
    starColor: '#c8fff6'
  }
];

export const backgroundState = {
  currentTheme: SECTOR_THEMES[2],
  nebulaX: 0.5,
  nebulaY: 0.3,
  nebulaRadius: 0.6
};

export function changeWaveBackground() {
  let nextTheme;
  do {
    nextTheme = SECTOR_THEMES[Math.floor(Math.random() * SECTOR_THEMES.length)];
  } while (nextTheme === backgroundState.currentTheme && SECTOR_THEMES.length > 1);

  backgroundState.currentTheme = nextTheme;
  backgroundState.nebulaX = 0.2 + Math.random() * 0.6;
  backgroundState.nebulaY = 0.2 + Math.random() * 0.4;
  backgroundState.nebulaRadius = 0.4 + Math.random() * 0.3;
}

export class Starfield {
  constructor(canvas) {
    this.canvas = canvas;
    this.stars = [];
    this.starCount = 140;
    this.warpBoost = 1.0;
    this.targetWarp = 1.0;

    this.layerSpeeds = [0.5, 1.5, 3.0];

    this.initStars();
  }

  getCurrentBiomeName() {
    return backgroundState.currentTheme.name;
  }

  setWarp(boost = 3.0) {
    this.targetWarp = boost;
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < this.starCount; i++) {
      const layerIndex = Math.floor(Math.random() * 3);
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: (layerIndex + 1) * 0.8,
        layerIndex: layerIndex,
        speed: this.layerSpeeds[layerIndex],
        alpha: Math.random() * 0.6 + 0.4
      });
    }
  }

  resize(width, height) {
    this.initStars();
  }

  update(dt = 1) {
    this.warpBoost += (this.targetWarp - this.warpBoost) * 0.05;

    this.stars.forEach(star => {
      star.y += star.speed * this.warpBoost;
      if (star.y > this.canvas.height) {
        star.y = -10;
        star.x = Math.random() * this.canvas.width;
      }
    });
  }

  draw(ctx) {
    const theme = backgroundState.currentTheme;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Base Space Void
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, w, h);

    // 2. Glowing Radial Nebula Cloud
    const nX = w * backgroundState.nebulaX;
    const nY = h * backgroundState.nebulaY;
    const nR = Math.max(w, h) * backgroundState.nebulaRadius;

    const grad = ctx.createRadialGradient(nX, nY, 10, nX, nY, nR);
    grad.addColorStop(0, theme.nebulaColor);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 3. Parallax Tinted Stars
    this.stars.forEach(star => {
      ctx.save();
      ctx.strokeStyle = theme.starColor;
      ctx.fillStyle = theme.starColor;
      ctx.globalAlpha = star.alpha;

      if (this.warpBoost > 1.5) {
        const trailLength = star.speed * 6 * (this.warpBoost - 1);
        ctx.lineWidth = star.size;
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x, star.y - trailLength);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }
}

