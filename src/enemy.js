// Enemy Entities, Kamikaze Stingers, Shield Anchors, & Glitch Splits for FinalOrbit
import { Bullet } from './bullet.js';

export class Enemy {
  constructor(x, y, type = 'drone', wave = 1, isGlitch = false) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.wave = wave;
    this.isGlitch = isGlitch;
    this.active = true;
    this.shootTimer = 0;
    this.animTimer = Math.random() * 100;
    this.flashTimer = 0;
    this.bossAngle = 0;

    // Shield Anchor tether target
    this.tetherTarget = null;

    switch (this.type) {
      case 'stinger':
        // Kamikaze Stinger: Dark red, triangular drone, triple speed!
        this.width = 22;
        this.height = 26;
        this.maxHealth = 10 + wave * 2;
        this.scoreValue = 100;
        this.speedY = 8.5; // Triple speed!
        this.color = '#aa0022';
        this.shootInterval = 9999;
        this.aligned = false;
        break;

      case 'anchor':
        // Shield Drone Anchor: Tethers invulnerability beam to nearby enemies!
        this.width = 30;
        this.height = 30;
        this.maxHealth = 35 + wave * 6;
        this.scoreValue = 200;
        this.speedY = 1.2;
        this.color = '#00ff66';
        this.shootInterval = 9999;
        break;

      case 'scout':
        this.width = 36;
        this.height = 36;
        this.maxHealth = 24 + wave * 5;
        this.scoreValue = 120;
        this.speedY = 3.0;
        this.color = '#00f0ff';
        this.shootInterval = Math.max(50, 100 - wave * 4);
        this.isDiveBombing = false;
        break;

      case 'swarmer':
        this.width = 24;
        this.height = 24;
        this.maxHealth = 12 + wave * 3;
        this.scoreValue = 90;
        this.speedY = 4.2;
        this.color = '#ff0055';
        this.shootInterval = 9999;
        break;

      case 'shield_bearer':
        this.width = 54;
        this.height = 48;
        this.maxHealth = 90 + wave * 18;
        this.scoreValue = 400;
        this.speedY = 1.2;
        this.color = '#0088ff';
        this.shootInterval = Math.max(70, 130 - wave * 4);
        this.hasFrontShield = true;
        break;

      case 'cruiser':
        this.width = 64;
        this.height = 54;
        this.maxHealth = 85 + wave * 15;
        this.scoreValue = 350;
        this.speedY = 1.0;
        this.color = '#ffea00';
        this.shootInterval = Math.max(75, 140 - wave * 5);
        break;

      case 'boss':
        this.width = 160;
        this.height = 100;
        this.maxHealth = 500 + wave * 50;
        this.scoreValue = 3000;
        this.speedY = 0.6;
        this.color = '#ff0055';
        this.shootInterval = Math.max(15, 30 - Math.floor(wave / 5));
        this.bossTargetY = 110;

        this.turrets = [
          { xOffset: -55, yOffset: 12, health: 100 + wave * 10, active: true },
          { xOffset: 55, yOffset: 12, health: 100 + wave * 10, active: true }
        ];
        break;

      case 'acid_spitter':
        this.width = 38;
        this.height = 38;
        this.maxHealth = 30 + wave * 6;
        this.scoreValue = 180;
        this.speedY = 1.5;
        this.color = '#39ff14';
        this.shootInterval = Math.max(50, 100 - wave * 3);
        break;

      case 'drone':
      default:
        this.width = 32;
        this.height = 32;
        this.maxHealth = 18 + wave * 3;
        this.scoreValue = 60;
        this.speedY = 1.8;
        this.color = '#00ff66';
        this.shootInterval = Math.max(65, 140 - wave * 4);
        break;
    }

    if (this.isGlitch) {
      this.maxHealth *= 1.4;
      this.scoreValue *= 2;
      this.color = '#00ff66';
    }

    this.health = this.maxHealth;
    this.startX = x;
  }

  takeDamage(amount, bulletY = 0) {
    if (this.hasFrontShield && bulletY > this.y + 5) {
      this.flashTimer = 3;
      return false;
    }

    this.health -= amount;
    this.flashTimer = 5; // 40ms critical white flash!
    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  takeTurretDamage(index, amount) {
    if (this.type === 'boss' && this.turrets[index] && this.turrets[index].active) {
      this.turrets[index].health -= amount;
      if (this.turrets[index].health <= 0) {
        this.turrets[index].active = false;
        return true;
      }
    }
    return false;
  }

  update(width, height, playerX, playerY, allEnemies = []) {
    this.animTimer += 0.05;
    if (this.flashTimer > 0) this.flashTimer--;

    if (this.type === 'stinger') {
      // Align horizontally with player, then thrust downward at triple speed!
      if (!this.aligned) {
        this.x += (playerX - this.x) * 0.15;
        this.y += 1.5;
        if (Math.abs(playerX - this.x) < 15) this.aligned = true;
      } else {
        this.y += this.speedY; // Triple speed thrust!
      }
    } else if (this.type === 'anchor') {
      this.y += this.speedY;
      // Tether invulnerability beam to nearest enemy
      if (!this.tetherTarget || !this.tetherTarget.active) {
        this.tetherTarget = allEnemies.find(e => e !== this && e.active && e.type !== 'boss');
      }
    } else if (this.type === 'scout') {
      const distToPlayer = Math.hypot(playerX - this.x, playerY - this.y);
      if (distToPlayer < 250 || this.isDiveBombing) {
        this.isDiveBombing = true;
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const angle = Math.atan2(dy, dx);
        this.x += Math.cos(angle) * 3.8 + Math.sin(this.animTimer * 4) * 2;
        this.y += Math.sin(angle) * 3.8;
      } else {
        this.y += this.speedY;
        this.x = this.startX + Math.sin(this.animTimer * 2) * 85;
      }
    } else if (this.type === 'swarmer') {
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      this.x += (dx / dist) * this.speedY;
      this.y += (dy / dist) * this.speedY;
    } else if (this.type === 'cruiser' || this.type === 'shield_bearer') {
      this.y += this.speedY;
      this.x = this.startX + Math.cos(this.animTimer) * 35;
    } else if (this.type === 'boss') {
      if (this.y < this.bossTargetY) {
        this.y += this.speedY;
      } else {
        this.x = width / 2 + Math.sin(this.animTimer) * (width * 0.35);
      }
      this.bossAngle += 0.15;
    } else {
      this.y += this.speedY;
    }

    const halfW = this.width / 2;
    if (this.type !== 'boss') {
      this.x = Math.max(halfW, Math.min(width - halfW, this.x));
    }
  }

  shouldShoot() {
    this.shootTimer++;
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      return true;
    }
    return false;
  }

  shoot(playerX, playerY) {
    const bullets = [];

    if (this.type === 'drone') {
      bullets.push(new Bullet(this.x, this.y + this.height / 2, 0, 4.5, true));
    } else if (this.type === 'acid_spitter') {
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 4.8 + Math.min(3.0, this.wave * 0.06);
      bullets.push(new Bullet(this.x, this.y + this.height / 2, (dx / dist) * speed, (dy / dist) * speed, true, 'acid'));
    } else if (this.type === 'scout') {
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      bullets.push(new Bullet(this.x, this.y + this.height / 2, (dx / dist) * 5, (dy / dist) * 5, true));
    } else if (this.type === 'cruiser' || this.type === 'shield_bearer') {
      bullets.push(new Bullet(this.x - 16, this.y + this.height / 2, 0, 4.8, true));
      bullets.push(new Bullet(this.x + 16, this.y + this.height / 2, 0, 4.8, true));
    } else if (this.type === 'boss') {
      const count = 8;
      const speed = 4.5;
      for (let i = 0; i < count; i++) {
        const angle = this.bossAngle + (i / count) * Math.PI * 2;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        bullets.push(new Bullet(this.x, this.y + 20, vx, vy, true, 'boss_orb'));
      }
    }

    return bullets;
  }

  isOutOfBounds(height) {
    return this.y > height + 60;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Draw Shield Anchor Tether Invulnerability Beam!
    if (this.type === 'anchor' && this.tetherTarget && this.tetherTarget.active) {
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00ff66';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.tetherTarget.x, this.tetherTarget.y);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(this.x, this.y);
    }

    if (this.flashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ffffff';
    } else {
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
    }

    const halfW = this.width / 2;
    const halfH = this.height / 2;

    if (this.type === 'acid_spitter') {
      // Bio-Carapace Beetle Hull with Toxic Slime Core
      ctx.fillStyle = '#051808';
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 2.2;
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#00ff66';

      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.lineTo(-12, 6);
      ctx.lineTo(-18, -4);
      ctx.lineTo(-14, -14);
      ctx.lineTo(-4, -8);
      ctx.lineTo(0, -12);
      ctx.lineTo(4, -8);
      ctx.lineTo(14, -14);
      ctx.lineTo(18, -4);
      ctx.lineTo(12, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Pulsing Acid Sac in center
      const pulse = Math.sin(Date.now() * 0.009) * 2;
      ctx.fillStyle = '#39ff14';
      ctx.shadowColor = '#eaff00';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(1, 4 + pulse), Math.max(1, 6 + pulse), 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'stinger') {
      // Dark red triangular drone
      ctx.beginPath();
      ctx.moveTo(0, halfH);
      ctx.lineTo(-halfW, -halfH);
      ctx.lineTo(halfW, -halfH);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'anchor') {
      // Green Hexagonal Anchor Drone
      ctx.beginPath();
      ctx.arc(0, 0, halfW, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'scout') {
      ctx.beginPath();
      ctx.moveTo(0, halfH);
      ctx.lineTo(-halfW, -halfH);
      ctx.lineTo(0, -halfH / 2);
      ctx.lineTo(halfW, -halfH);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'shield_bearer') {
      ctx.beginPath();
      ctx.moveTo(0, halfH * 0.5);
      ctx.lineTo(-halfW, -halfH);
      ctx.lineTo(halfW, -halfH);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 4;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, halfH + 4, halfW * 0.9, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else if (this.type === 'boss') {
      ctx.beginPath();
      ctx.moveTo(0, halfH);
      ctx.lineTo(-halfW, -halfH / 3);
      ctx.lineTo(-halfW * 0.7, -halfH);
      ctx.lineTo(halfW * 0.7, -halfH);
      ctx.lineTo(halfW, -halfH / 3);
      ctx.closePath();
      ctx.fill();

      this.turrets.forEach(t => {
        if (t.active) {
          ctx.fillStyle = '#ffea00';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ffea00';
          ctx.beginPath();
          ctx.arc(t.xOffset, t.yOffset, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.fillStyle = '#ff0055';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ff0055';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, halfH);
      ctx.lineTo(-halfW, -halfH / 2);
      ctx.lineTo(0, -halfH);
      ctx.lineTo(halfW, -halfH / 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height
    };
  }
}
