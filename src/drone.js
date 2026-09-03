// Magnet Companion Drone for FinalOrbit

export class MagnetDrone {
  constructor(player) {
    this.player = player;
    this.x = player.x + 35;
    this.y = player.y + 10;
    this.orbitAngle = 0;
    this.pullRadius = 160; // Base magnet radius (upgradeable in Shop)
    this.pullForce = 6.5;
  }

  setPullRadius(radius) {
    this.pullRadius = radius;
  }

  update(player) {
    this.player = player;
    this.orbitAngle += 0.06;

    // Hover beside player ship in a small ellipse
    const targetX = player.x + Math.cos(this.orbitAngle) * 35;
    const targetY = player.y + Math.sin(this.orbitAngle) * 15;

    this.x += (targetX - this.x) * 0.2;
    this.y += (targetY - this.y) * 0.2;
  }

  attractItems(items) {
    items.forEach(item => {
      if (!item.active) return;
      const dx = this.x - item.x;
      const dy = this.y - item.y;
      const dist = Math.hypot(dx, dy);

      if (dist < this.pullRadius) {
        // Accelerate item towards drone/player
        item.x += (dx / dist) * this.pullForce;
        item.y += (dy / dist) * this.pullForce;
      }
    });
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Glowing Magnetic Field Aura
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();

    // Drone Hull
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // Inner Core Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class WingmanDrone {
  constructor(player, side = 'left') {
    this.player = player;
    this.side = side;
    this.offsetX = side === 'left' ? -38 : 38;
    this.offsetY = 12;
    this.x = player.x + this.offsetX;
    this.y = player.y + this.offsetY;
    this.shootTimer = Math.floor(Math.random() * 12);
    this.active = true;
  }

  update(player, enemies, bullets) {
    this.player = player;
    const targetX = player.x + this.offsetX;
    const targetY = player.y + this.offsetY;

    this.x += (targetX - this.x) * 0.25;
    this.y += (targetY - this.y) * 0.25;

    this.shootTimer++;
    if (this.shootTimer >= 24 && enemies && enemies.length > 0 && bullets) {
      this.shootTimer = 0;
      let closest = null;
      let minDist = 9999;
      enemies.forEach(e => {
        if (!e.active) return;
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < minDist) {
          minDist = d;
          closest = e;
        }
      });

      if (closest && minDist < 450) {
        const dx = closest.x - this.x;
        const dy = closest.y - this.y;
        const speed = 12;
        const vx = (dx / minDist) * speed;
        const vy = (dy / minDist) * speed;
        bullets.push(new Bullet(this.x, this.y, vx, vy, false, 'tesla', 12));
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.fillStyle = '#ffea00';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(-6, 5);
    ctx.lineTo(6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
