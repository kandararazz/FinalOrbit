// Projectiles, Missiles, & Chain Lightning for FinalOrbit

export class Bullet {
  constructor(x, y, vx, vy, isEnemy = false, type = 'dual', damage = 10, perks = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.isEnemy = isEnemy;
    this.type = type;
    this.damage = damage;
    this.perks = perks;
    this.active = true;
    this.bounced = false;

    // Apply Perk Modifications
    if (perks.bigBullets && !isEnemy) {
      this.damage *= 1.25;
    }

    // Geometry based on type
    switch (this.type) {
      case 'railgun':
        this.width = 18;
        this.height = 42;
        this.color = '#00f0ff';
        this.piercing = true;
        break;
      case 'missile':
        this.width = 10;
        this.height = 16;
        this.color = '#ffea00';
        this.target = null;
        break;
      case 'flak':
        this.width = 12;
        this.height = 12;
        this.color = '#ff0077';
        this.life = 22; // Short range!
        break;
      case 'tesla':
        this.width = 14;
        this.height = 14;
        this.color = '#00ff66';
        break;
      case 'spread':
        this.width = 8;
        this.height = 16;
        this.color = '#ff0077';
        break;
      case 'boss_orb':
        this.width = 14;
        this.height = 14;
        this.color = '#ffea00';
        break;
      case 'acid':
        this.width = 10;
        this.height = 10;
        this.radius = 5;
        this.color = '#39ff14';
        this.wobblePhase = Math.random() * Math.PI * 2;
        break;
      default:
        this.width = perks.bigBullets ? 6 : 4;
        this.height = perks.bigBullets ? 20 : 16;
        this.color = isEnemy ? '#ff2a55' : '#00f0ff';
        break;
    }
  }

  update(width, height, enemies = []) {
    if (this.type === 'flak') {
      this.life--;
      if (this.life <= 0) this.active = false;
    }

    if (this.type === 'acid') {
      this.wobblePhase += 0.25;
      const perpX = -this.vy;
      const perpY = this.vx;
      const len = Math.hypot(perpX, perpY) || 1;
      const wobble = Math.sin(this.wobblePhase) * 1.5;
      this.x += (perpX / len) * wobble;
      this.y += (perpY / len) * wobble;
    }

    if (this.type === 'missile' && !this.isEnemy) {
      // Homing Missile steering logic towards nearest active enemy
      if (!this.target || !this.target.active) {
        let minDist = Infinity;
        enemies.forEach(e => {
          if (!e.active) return;
          const dist = Math.hypot(e.x - this.x, e.y - this.y);
          if (dist < minDist) {
            minDist = dist;
            this.target = e;
          }
        });
      }

      if (this.target && this.target.active) {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
        this.vx += (dx / dist) * 0.8;
        this.vy += (dy / dist) * 0.8;
        // Limit max velocity
        const speed = Math.hypot(this.vx, this.vy);
        if (speed > 12) {
          this.vx = (this.vx / speed) * 12;
          this.vy = (this.vy / speed) * 12;
        }
      }
    }

    this.x += this.vx;
    this.y += this.vy;

    // Wall Bounce Perk logic for Player Bullets
    if (this.perks.bounceWalls && !this.isEnemy && !this.bounced) {
      if (this.x < 10 || this.x > width - 10) {
        this.vx = -this.vx;
        this.bounced = true;
      }
    }
  }

  isOutOfBounds(width, height) {
    return (
      this.x < -30 ||
      this.x > width + 30 ||
      this.y < -30 ||
      this.y > height + 30
    );
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;

    if (this.type === 'acid') {
      ctx.fillStyle = '#10ff00';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#eaff00';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'missile') {
      ctx.translate(this.x, this.y);
      const angle = Math.atan2(this.vy, this.vx) + Math.PI / 2;
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.moveTo(0, -this.height / 2);
      ctx.lineTo(-this.width / 2, this.height / 2);
      ctx.lineTo(this.width / 2, this.height / 2);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'flak' || this.type === 'boss_orb' || this.type === 'tesla') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const halfW = this.width / 2;
      const halfH = this.height / 2;
      ctx.beginPath();
      ctx.roundRect(this.x - halfW, this.y - halfH, this.width, this.height, 3);
      ctx.fill();
    }

    ctx.restore();
  }

  getBounds() {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    return {
      x: this.x - halfW,
      y: this.y - halfH,
      width: this.width,
      height: this.height
    };
  }
}
