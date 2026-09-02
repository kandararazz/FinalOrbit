// Environmental Hazards, Meteor Storms & Sweeping Laser Grids for FinalOrbit

export class Asteroid {
  constructor(x, y, radius = 28) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vy = Math.random() * 1.8 + 1.2;
    this.vx = (Math.random() - 0.5) * 0.8;
    this.rot = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.04;
    this.health = Math.floor(radius * 1.5);
    this.maxHealth = this.health;
    this.active = true;

    this.vertices = [];
    const count = 7;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const offset = (Math.random() * 0.4 + 0.8) * this.radius;
      this.vertices.push({
        x: Math.cos(angle) * offset,
        y: Math.sin(angle) * offset
      });
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rot += this.rotSpeed;
  }

  isOutOfBounds(height) {
    return this.y > height + 60;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    ctx.fillStyle = '#4a3b32';
    ctx.strokeStyle = '#8c6d58';
    ctx.lineWidth = 2;

    ctx.beginPath();
    this.vertices.forEach((v, idx) => {
      if (idx === 0) ctx.moveTo(v.x, v.y);
      else ctx.lineTo(v.x, v.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  getBounds() {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2
    };
  }
}

export class SweepingLaserGrid {
  constructor(canvasWidth, gapX = 400) {
    this.y = -20;
    this.vy = 2.5;
    this.width = canvasWidth;
    this.gapX = gapX;
    this.gapWidth = 140;
    this.active = true;
  }

  update() {
    this.y += this.vy;
  }

  isOutOfBounds(height) {
    return this.y > height + 40;
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 6;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0055';

    // Left beam segment
    ctx.beginPath();
    ctx.moveTo(0, this.y);
    ctx.lineTo(this.gapX - this.gapWidth / 2, this.y);
    ctx.stroke();

    // Right beam segment
    ctx.beginPath();
    ctx.moveTo(this.gapX + this.gapWidth / 2, this.y);
    ctx.lineTo(this.width, this.y);
    ctx.stroke();

    ctx.restore();
  }
}

export class BlackHole {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 35;
    this.pullRadius = 220;
    this.vy = 0.5;
    this.rot = 0;
    this.active = true;
  }

  update(player, enemies, bullets) {
    this.y += this.vy;
    this.rot += 0.08;

    const pdx = this.x - player.x;
    const pdy = this.y - player.y;
    const pdist = Math.hypot(pdx, pdy);
    if (pdist < this.pullRadius && pdist > 10) {
      player.x += (pdx / pdist) * 1.8;
      player.y += (pdy / pdist) * 1.8;
    }

    bullets.forEach(b => {
      const bdx = this.x - b.x;
      const bdy = this.y - b.y;
      const bdist = Math.hypot(bdx, bdy);
      if (bdist < this.pullRadius) {
        b.x += (bdx / bdist) * 3.5;
        b.y += (bdy / bdist) * 3.5;
      }
    });
  }

  isOutOfBounds(height) {
    return this.y > height + 80;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, this.pullRadius * 0.4);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.5, 'rgba(120, 0, 255, 0.4)');
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.pullRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#a000ff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#a000ff';

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

export class NebulaCloud {
  constructor(x, y, type = 'shield') {
    this.x = x;
    this.y = y;
    this.radius = 80;
    this.type = type;
    this.vy = 0.8;
    this.active = true;
  }

  update(player) {
    this.y += this.vy;
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    if (Math.hypot(dx, dy) < this.radius) {
      if (this.type === 'shield') {
        player.restoreShield(0.5);
      } else if (this.type === 'ion') {
        player.weapons.isOverheated = true;
      }
    }
  }

  isOutOfBounds(height) {
    return this.y > height + 100;
  }

  draw(ctx) {
    ctx.save();
    const color = this.type === 'shield' ? 'rgba(0, 136, 255, 0.18)' : 'rgba(255, 0, 85, 0.18)';
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
