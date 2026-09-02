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

    const distToPlayer = Math.hypot(playerX - this.x, playerY - this.y);

    if (this.type === 'stinger' || this.type === 'scout') {
      // Dive-Bombers: Trigger quick diagonal dive directly toward player when within 250px!
      if (distToPlayer < 250 || this.isDiveBombing) {
        this.isDiveBombing = true;
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const angle = Math.atan2(dy, dx);
        this.x += Math.cos(angle) * 5.5 + Math.sin(this.animTimer * 4) * 1.5;
        this.y += Math.sin(angle) * 5.5;
      } else {
        // S-Curve Weaver approach
        this.y += this.speedY;
        this.x = this.startX + Math.sin(this.animTimer * 2.5) * 65;
      }
    } else if (this.type === 'cruiser' || this.type === 'shield_bearer') {
      // Flank & Strafe: Move to upper third of canvas, match player's horizontal X position, then swoop
      if (this.y < height * 0.35) {
        this.y += this.speedY;
        this.x += (playerX - this.x) * 0.06;
      } else {
        this.y += this.speedY * 1.2;
        this.x = this.startX + Math.cos(this.animTimer * 1.8) * 80;
      }
    } else if (this.type === 'acid_spitter' || this.type === 'drone') {
      // S-Curve Weavers: Oscillate horizontally across a sine-wave path
      this.y += this.speedY;
      this.x = this.startX + Math.sin(this.animTimer * 2.2) * 55;
    } else if (this.type === 'swarmer') {
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      this.x += (dx / dist) * this.speedY + Math.sin(this.animTimer * 3) * 2;
      this.y += (dy / dist) * this.speedY;
    } else if (this.type === 'anchor') {
      this.y += this.speedY;
      if (!this.tetherTarget || !this.tetherTarget.active) {
        this.tetherTarget = allEnemies.find(e => e !== this && e.active && e.type !== 'boss');
      }
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
      bullets.push(new Bullet(this.x, this.y + this.height / 2, 0, 4.5, true, 'cyan_needle'));
    } else if (this.type === 'acid_spitter' || this.type === 'stinger') {
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = 4.8 + Math.min(3.0, this.wave * 0.06);
      bullets.push(new Bullet(this.x, this.y + this.height / 2, (dx / dist) * speed, (dy / dist) * speed, true, 'acid'));
    } else if (this.type === 'scout') {
      bullets.push(new Bullet(this.x, this.y + this.height / 2, 0, 5.5, true, 'cyan_needle'));
    } else if (this.type === 'cruiser' || this.type === 'shield_bearer') {
      // Heavy Dreadnought 3-way spread shots
      bullets.push(new Bullet(this.x - 18, this.y + this.height / 2, -1.8, 4.8, true, 'spread'));
      bullets.push(new Bullet(this.x, this.y + this.height / 2, 0, 5.2, true, 'spread'));
      bullets.push(new Bullet(this.x + 18, this.y + this.height / 2, 1.8, 4.8, true, 'spread'));
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
    } else {
      ctx.fillStyle = this.color;
    }

    const halfW = this.width / 2;
    const halfH = this.height / 2;

    if (this.type === 'acid_spitter' || this.type === 'stinger') {
      // Acid Stinger: Dark green chitin body, sharp forward mandibles, glowing lime outline, pulsing venom sac
      ctx.fillStyle = '#0b260e';
      ctx.strokeStyle = '#39ff14';
      ctx.lineWidth = 2.2;

      ctx.beginPath();
      ctx.moveTo(0, halfH + 4); // Forward stinger tip
      ctx.lineTo(-halfW * 0.4, 4);
      ctx.lineTo(-halfW, -halfH * 0.2);
      ctx.lineTo(-halfW * 0.8, -halfH);
      ctx.lineTo(0, -halfH * 0.5);
      ctx.lineTo(halfW * 0.8, -halfH);
      ctx.lineTo(halfW, -halfH * 0.2);
      ctx.lineTo(halfW * 0.4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sharp forward mandibles
      ctx.strokeStyle = '#eaff00';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-6, halfH - 2);
      ctx.lineTo(-10, halfH + 8);
      ctx.moveTo(6, halfH - 2);
      ctx.lineTo(10, halfH + 8);
      ctx.stroke();

      // Pulsing Yellow-Green Venom Sac
      const pulse = Math.sin(Date.now() * 0.012) * 2;
      ctx.fillStyle = '#39ff14';
      ctx.beginPath();
      ctx.ellipse(0, -halfH * 0.3, Math.max(1, 5 + pulse), Math.max(1, 7 + pulse), 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'scout' || this.type === 'drone') {
      // Scout Drone: Fast, compact neon-cyan inverted diamond with flickering dual wing-thrusters
      ctx.fillStyle = '#031926';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.2;

      ctx.beginPath();
      ctx.moveTo(0, halfH + 4);
      ctx.lineTo(-halfW, 0);
      ctx.lineTo(0, -halfH);
      ctx.lineTo(halfW, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner cyan core
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Flickering dual wing-thrusters
      const flicker = Math.random() * 6;
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(-halfW + 2, -halfH * 0.4 - flicker, 3, 0, Math.PI * 2);
      ctx.arc(halfW - 2, -halfH * 0.4 - flicker, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'cruiser' || this.type === 'shield_bearer') {
      // Heavy Dreadnought: Hexagonal dark-grey armor plating with twin red gun pods & exposed power core
      ctx.fillStyle = '#1a1f29';
      ctx.strokeStyle = '#45536b';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(0, halfH);
      ctx.lineTo(-halfW, halfH * 0.4);
      ctx.lineTo(-halfW, -halfH * 0.6);
      ctx.lineTo(-halfW * 0.5, -halfH);
      ctx.lineTo(halfW * 0.5, -halfH);
      ctx.lineTo(halfW, -halfH * 0.6);
      ctx.lineTo(halfW, halfH * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Twin Red Gun Pods on sides
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(-halfW - 4, -halfH * 0.2, 6, 18);
      ctx.fillRect(halfW - 2, -halfH * 0.2, 6, 18);

      // Exposed Glowing Core in Center
      const corePulse = Math.sin(Date.now() * 0.008) * 3;
      ctx.fillStyle = '#ffea00';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, 8 + corePulse), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (this.type === 'anchor') {
      // Green Hexagonal Anchor Drone
      ctx.beginPath();
      ctx.arc(0, 0, halfW, 0, Math.PI * 2);
      ctx.fill();
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
          ctx.beginPath();
          ctx.arc(t.xOffset, t.yOffset, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.fillStyle = '#ff0055';
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
