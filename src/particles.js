// Dynamic Particle System, Debris Fragments, & Smoke Trails for FinalOrbit

export class PolygonDebris {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rot = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.2;
    this.size = Math.random() * 10 + 6;
    this.life = 45;
    this.maxLife = 45;
  }

  update(particleSystem) {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.rot += this.rotSpeed;
    this.life--;

    // Emit smoke trail particle
    if (Math.random() < 0.4) {
      particleSystem.spawnParticle(this.x, this.y, 'rgba(255, 255, 255, 0.4)', (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, 3, 20, false);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.moveTo(0, -this.size / 2);
    ctx.lineTo(this.size / 2, this.size / 2);
    ctx.lineTo(-this.size / 2, this.size / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

export class Particle {
  constructor(x = 0, y = 0, color = '#ffffff', vx = 0, vy = 0, size = 2, life = 20, glow = false) {
    this.init(x, y, color, vx, vy, size, life, glow);
  }

  init(x, y, color, vx, vy, size, life, glow = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.glow = glow;
    this.alpha = 1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.life--;
    this.alpha = Math.max(0, this.life / this.maxLife);
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.size * this.alpha), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class FloatingText {
  constructor(x, y, text, color = '#ffea00', fontSize = 16) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.fontSize = fontSize;
    this.life = 45;
    this.maxLife = 45;
    this.vy = -1.2;
  }

  update() {
    this.y += this.vy;
    this.life--;
  }

  draw(ctx) {
    ctx.save();
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.font = `800 ${this.fontSize}px 'Orbitron', sans-serif`;
    ctx.fillStyle = this.color;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

export class Shockwave {
  constructor(x, y, maxRadius = 150, color = '#00f0ff') {
    this.x = x;
    this.y = y;
    this.radius = 5;
    this.maxRadius = maxRadius;
    this.color = color;
    this.lineWidth = 6;
    this.life = 30;
    this.maxLife = 30;
  }

  update() {
    this.radius += (this.maxRadius - this.radius) * 0.15;
    this.lineWidth *= 0.92;
    this.life--;
  }

  draw(ctx) {
    ctx.save();
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1, this.lineWidth);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.particlePool = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.debris = [];
    this.maxParticles = 80;
  }

  spawnParticle(x, y, color, vx, vy, size, life, glow = false) {
    if (this.particles.length >= this.maxParticles) {
      // Hard cap at 80: drop oldest particle immediately
      const oldest = this.particles.shift();
      if (oldest) this.particlePool.push(oldest);
    }

    let p = this.particlePool.pop();
    if (p) {
      p.init(x, y, color, vx, vy, size, life, glow);
    } else {
      p = new Particle(x, y, color, vx, vy, size, life, glow);
    }
    this.particles.push(p);
    return p;
  }

  createShipDebris(x, y, color = '#00f0ff') {
    // 5 to 8 spinning polygon fragments drifting outward with smoke trails
    const count = Math.floor(Math.random() * 4) + 5;
    for (let i = 0; i < count; i++) {
      this.debris.push(new PolygonDebris(x, y, color));
    }
    this.createExplosion(x, y, 30, color, 1.5);
  }

  createExplosion(x, y, count = 20, color = '#ff5500', sizeScale = 1) {
    const palette = [color, '#ff0077', '#ffea00', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 5 + 1.5) * sizeScale;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = (Math.random() * 3 + 2) * sizeScale;
      const life = Math.floor(Math.random() * 25 + 15);
      const particleColor = palette[Math.floor(Math.random() * palette.length)];

      this.spawnParticle(x, y, particleColor, vx, vy, size, life);
    }
    this.shockwaves.push(new Shockwave(x, y, 50 * sizeScale, color));
  }

  createSparks(x, y, color = '#00f0ff', count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = Math.random() * 2 + 1;
      const life = Math.floor(Math.random() * 12 + 8);
      this.spawnParticle(x, y, color, vx, vy, size, life, false);
    }
  }

  createThrusterParticle(x, y, angle = Math.PI / 2) {
    const spreadAngle = angle + (Math.random() - 0.5) * 0.4;
    const speed = Math.random() * 3 + 2;
    const vx = Math.cos(spreadAngle) * speed;
    const vy = Math.sin(spreadAngle) * speed;
    const colors = ['#00f0ff', '#0088ff', '#ffffff'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 2.5 + 1.5;
    const life = Math.floor(Math.random() * 10 + 5);
    this.spawnParticle(x, y, color, vx, vy, size, life, false);
  }

  addFloatingText(x, y, text, color = '#ffea00', fontSize = 16) {
    this.floatingTexts.push(new FloatingText(x, y, text, color, fontSize));
  }

  triggerSmartBomb(centerX, centerY, width, height) {
    this.shockwaves.push(new Shockwave(centerX, centerY, Math.max(width, height) * 0.8, '#ff0055'));
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 3;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const colors = ['#ff0055', '#ffea00', '#00f0ff', '#ffffff'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.spawnParticle(centerX, centerY, color, vx, vy, Math.random() * 4 + 2, 30);
    }
  }

  update() {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      this.debris[i].update(this);
      if (this.debris[i].life <= 0) {
        this.debris.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        this.particlePool.push(p);
      }
    }

    // Hard-cap active particle count strictly at max 150
    if (this.particles.length > this.maxParticles) {
      const overflow = this.particles.splice(0, this.particles.length - this.maxParticles);
      overflow.forEach(p => this.particlePool.push(p));
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].update();
      if (this.floatingTexts[i].life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      this.shockwaves[i].update();
      if (this.shockwaves[i].life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
    this.shockwaves.forEach(sw => sw.draw(ctx));
    this.debris.forEach(d => d.draw(ctx));
    this.floatingTexts.forEach(ft => ft.draw(ctx));
  }

  clear() {
    this.particles.forEach(p => this.particlePool.push(p));
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.debris = [];
  }
}

