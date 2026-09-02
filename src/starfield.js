// 3-Layer Parallax Starfield Engine for FinalOrbit
// Layers move at exact speeds: Layer 1 (0.5px/frame), Layer 2 (1.5px/frame), Layer 3 (3.0px/frame)

export const BIOMES = [
  { name: 'DEEP SPACE', color: '#00f0ff', nebula: 'rgba(0, 240, 255, 0.04)' },
  { name: 'CYBER CITY', color: '#ff0077', nebula: 'rgba(255, 0, 119, 0.05)' },
  { name: 'ASTEROID BELT', color: '#ffea00', nebula: 'rgba(255, 234, 0, 0.04)' },
  { name: 'HIVE CORE', color: '#00ff66', nebula: 'rgba(0, 255, 102, 0.05)' }
];

export class Starfield {
  constructor(canvas) {
    this.canvas = canvas;
    this.stars = [];
    this.nebulas = [];
    this.starCount = 120;
    this.warpBoost = 1.0;
    this.targetWarp = 1.0;
    this.biomeIndex = 0;

    this.layerSpeeds = [0.5, 1.5, 3.0]; // Exact layer speeds requested

    this.initStars();
    this.initNebulas();
  }

  setBiome(index) {
    this.biomeIndex = index % BIOMES.length;
  }

  getCurrentBiomeName() {
    return BIOMES[this.biomeIndex].name;
  }

  setWarp(boost = 3.0) {
    this.targetWarp = boost;
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < this.starCount; i++) {
      const layerIndex = Math.floor(Math.random() * 3); // 0, 1, or 2
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: (layerIndex + 1) * 0.8,
        layerIndex: layerIndex,
        baseSpeed: this.layerSpeeds[layerIndex],
        alpha: Math.random() * 0.6 + 0.4,
        color: this.getRandomStarColor()
      });
    }
  }

  initNebulas() {
    this.nebulas = [
      { x: this.canvas.width * 0.2, y: this.canvas.height * 0.2, radius: 240 },
      { x: this.canvas.width * 0.8, y: this.canvas.height * 0.6, radius: 300 }
    ];
  }

  getRandomStarColor() {
    const biome = BIOMES[this.biomeIndex];
    const colors = ['#ffffff', biome.color, '#a0c0ff', '#ffffff'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  resize(width, height) {
    this.initStars();
    this.initNebulas();
  }

  update(dt = 1) {
    this.warpBoost += (this.targetWarp - this.warpBoost) * 0.05;

    this.stars.forEach(star => {
      star.y += star.baseSpeed * this.warpBoost;
      if (star.y > this.canvas.height) {
        star.y = -10;
        star.x = Math.random() * this.canvas.width;
      }
    });

    this.nebulas.forEach(n => {
      n.y += 0.3 * this.warpBoost;
      if (n.y - n.radius > this.canvas.height) {
        n.y = -n.radius;
        n.x = Math.random() * this.canvas.width;
      }
    });
  }

  draw(ctx) {
    const biome = BIOMES[this.biomeIndex];

    this.nebulas.forEach(n => {
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
      grad.addColorStop(0, biome.nebula);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    this.stars.forEach(star => {
      ctx.save();
      ctx.strokeStyle = star.color;
      ctx.fillStyle = star.color;
      ctx.globalAlpha = star.alpha;

      if (this.warpBoost > 1.5) {
        const trailLength = star.baseSpeed * 6 * (this.warpBoost - 1);
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
