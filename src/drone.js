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
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();

    // Drone Hull
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00f0ff';
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
