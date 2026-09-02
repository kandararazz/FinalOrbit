// Player Fighter Ship, Avatars, & Perk Application for FinalOrbit
import { WeaponSystem } from './weapons.js';
import { MagnetDrone } from './drone.js';
import { soundManager } from './audio.js';

export const SHIP_AVATARS = {
  apex_viper: { name: 'Viper', color: '#00f0ff', accent: '#ffffff', shape: 'viper' },
  venom_phantom: { name: 'Venom Phantom', color: '#39ff14', accent: '#eaff00', shape: 'venom' },
  crimson_apex: { name: 'Crimson Apex', color: '#ff0033', accent: '#ffea00', shape: 'crimson' },
  void_phantom: { name: 'Void Phantom', color: '#a000ff', accent: '#ff0077', shape: 'phantom' },
  aegis_titan: { name: 'Aegis Titan', color: '#ff5500', accent: '#ffea00', shape: 'titan' }
};

export class Player {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.width = 44;
    this.height = 48;
    this.x = canvasWidth / 2;
    this.y = canvasHeight - 100;

    this.vx = 0;
    this.vy = 0;
    this.baseSpeed = 6.5;
    this.speed = 6.5;
    this.friction = 0.88;

    this.bankAngle = 0;
    this.targetBankAngle = 0;

    this.maxHealth = 100;
    this.health = 100;
    this.maxShield = 100;
    this.shield = 100;
    this.shieldRechargeDelay = 0;
    this.baseRechargeDelayMax = 240; // 4 seconds base

    this.overchargeInvulnerableTimer = 0;

    this.dashCooldown = 0;
    this.dashTimer = 0;
    this.dashGhostTrail = [];

    this.empCooldown = 0;
    this.lastTapS = 0;

    this.mouseControlActive = false;
    this.targetMouseX = this.x;
    this.targetMouseY = this.y;

    this.touchControlActive = false;
    this.targetTouchX = this.x;
    this.targetTouchY = this.y;
    this.touchOffsetY = -40;
    this.lastTapTouch = 0;

    this.weapons = new WeaponSystem();
    this.drone = new MagnetDrone(this);

    this.globalMagnetTimer = 0;
    this.barrierHits = 3;
    this.barrierAngle = 0;

    this.bombs = 1;
    this.maxBombs = 3;
    this.invertedTimer = 0;
    this.autoFirePermanent = false;

    this.equippedAvatar = 'apex_viper'; // Default skin
  }

  setAvatar(avatarId) {
    if (SHIP_AVATARS[avatarId]) {
      this.equippedAvatar = avatarId;
    }
  }

  reset(canvasWidth, canvasHeight, shopUpgrades = {}) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.x = canvasWidth / 2;
    this.y = canvasHeight - 100;
    this.vx = 0;
    this.vy = 0;
    this.bankAngle = 0;

    const speedLvl = shopUpgrades.speed || 1;
    const armorLvl = shopUpgrades.armor || 1;
    const magnetLvl = shopUpgrades.magnet || 1;
    const shieldLvl = shopUpgrades.shieldRecovery || 1;

    // Apply permanent Shop upgrades: Max Hull +10% per tier, Shield Recovery -0.5s per tier
    this.maxHealth = 100 * (1 + (armorLvl - 1) * 0.1);
    this.maxShield = 100 * (1 + (armorLvl - 1) * 0.1);
    this.health = this.maxHealth;
    this.shield = this.maxShield;

    this.speed = (this.baseSpeed + (speedLvl - 1) * 0.8);
    this.baseRechargeDelayMax = Math.max(60, 240 - (shieldLvl - 1) * 30);
    this.shieldRechargeDelay = 0;

    // Coin Magnet +50px attraction radius per tier
    const baseMagnetRadius = 100 + (magnetLvl - 1) * 50;
    this.drone.setPullRadius(baseMagnetRadius);

    this.equippedAvatar = shopUpgrades.avatar || 'apex_viper';

    this.weapons = new WeaponSystem();
    this.barrierHits = 3;
    this.bombs = 1;
    this.dashCooldown = 0;
    this.dashTimer = 0;
    this.empCooldown = 0;
    this.invertedTimer = 0;
    this.globalMagnetTimer = 0;
    this.overchargeInvulnerableTimer = 0;
  }

  applyPerks(perks = {}) {
    // Hyper Drive: +15% Movement Speed
    if (perks.hyperDrive) {
      this.speed *= 1.15;
    }
    // Reactive Shield: Shield recharge delay reduced from 4s to 2s (120 frames)
    if (perks.reactiveShield) {
      this.baseRechargeDelayMax = 120;
    }
  }

  triggerDash() {
    if (this.dashCooldown > 0) return false;

    this.dashCooldown = 90;
    this.dashTimer = 24;
    soundManager.playDash();

    let dirX = this.vx !== 0 ? Math.sign(this.vx) : 0;
    let dirY = this.vy !== 0 ? Math.sign(this.vy) : -1;

    if (dirX === 0 && dirY === 0) dirY = -1;

    this.x += dirX * 120;
    this.y += dirY * 120;
    return true;
  }

  triggerEMP() {
    if (this.empCooldown > 0) return false;
    this.empCooldown = 180;
    soundManager.playEmp();
    return true;
  }

  takeDamage(amount) {
    if (this.dashTimer > 0 || this.overchargeInvulnerableTimer > 0) return false;

    this.shieldRechargeDelay = this.baseRechargeDelayMax;

    if (this.barrierHits > 0) {
      this.barrierHits--;
      soundManager.playHit();
      if (this.barrierHits <= 0) return 'EMP_SHATTER';
      return false;
    }

    if (this.shield > 0) {
      this.shield -= amount;
      if (this.shield <= 0) {
        this.shield = 0;
        this.overchargeInvulnerableTimer = 60; // 1.0s i-frames
        soundManager.playEmp();
        return 'SHIELD_OVERCHARGE_PULSE';
      }
    } else {
      this.health -= amount;
      this.overchargeInvulnerableTimer = 60; // 1.0s i-frames on hull hit
    }

    soundManager.playHit();
    if ('vibrate' in navigator) navigator.vibrate([20]);

    if (this.health <= 0) {
      this.health = 0;
      return 'DESTROYED';
    }

    return 'HULL_DAMAGED';
  }

  takeObstacleImpact() {
    if (this.dashTimer > 0 || this.overchargeInvulnerableTimer > 0) return false;

    this.shieldRechargeDelay = this.baseRechargeDelayMax;

    if (this.shield > 0) {
      // Direct Collision with Shield > 0 -> Shatter shield to 0%, grant 1.5s i-frames, blue shockwave!
      this.shield = 0;
      this.overchargeInvulnerableTimer = 90; // 1.5s i-frames
      soundManager.playEmp();
      return 'OBSTACLE_SHIELD_SHATTER';
    } else {
      // Direct Collision with Shield = 0 -> Hull immediately drops to 0% and ship destroyed!
      this.health = 0;
      soundManager.playHit();
      return 'DESTROYED';
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  restoreShield(amount) {
    this.shield = Math.min(this.maxShield * 1.2, this.shield + amount);
  }

  handleInput(keys) {
    let moveX = 0;
    let moveY = 0;
    const mult = this.invertedTimer > 0 ? -1 : 1;

    if (keys['KeyW'] || keys['ArrowUp']) moveY -= mult;
    if (keys['KeyS'] || keys['ArrowDown']) moveY += mult;
    if (keys['KeyA'] || keys['ArrowLeft']) moveX -= mult;
    if (keys['KeyD'] || keys['ArrowRight']) moveX += mult;

    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.7071;
      moveY *= 0.7071;
    }

    this.vx += moveX * this.speed * 0.25;
    this.vy += moveY * this.speed * 0.25;

    this.targetBankAngle = moveX * 0.26;

    if (keys['ShiftLeft'] || keys['ShiftRight']) {
      this.triggerDash();
    }
  }

  update(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;

    if (this.mouseControlActive) {
      this.x += (this.targetMouseX - this.x) * 0.15;
      this.y += (this.targetMouseY - this.y) * 0.15;
    } else if (this.touchControlActive) {
      this.x += (this.targetTouchX - this.x) * 0.2;
      this.y += (this.targetTouchY + this.touchOffsetY - this.y) * 0.2;
    } else {
      this.x += this.vx;
      this.y += this.vy;
      this.vx *= this.friction;
      this.vy *= this.friction;
    }

    this.bankAngle += (this.targetBankAngle - this.bankAngle) * 0.2;

    const halfW = this.width / 2;
    const halfH = this.height / 2;
    this.x = Math.max(halfW, Math.min(width - halfW, this.x));
    this.y = Math.max(halfH, Math.min(height - halfH, this.y));

    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.empCooldown > 0) this.empCooldown--;
    if (this.overchargeInvulnerableTimer > 0) this.overchargeInvulnerableTimer--;

    if (this.dashTimer > 0) {
      this.dashTimer--;
      this.dashGhostTrail.push({ x: this.x, y: this.y, alpha: 0.8 });
    }
    if (this.invertedTimer > 0) this.invertedTimer--;
    if (this.globalMagnetTimer > 0) this.globalMagnetTimer--;

    for (let i = this.dashGhostTrail.length - 1; i >= 0; i--) {
      this.dashGhostTrail[i].alpha -= 0.1;
      if (this.dashGhostTrail[i].alpha <= 0) {
        this.dashGhostTrail.splice(i, 1);
      }
    }

    if (this.shieldRechargeDelay > 0) {
      this.shieldRechargeDelay--;
    } else if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 0.3);
    }

    this.weapons.update();

    if (this.globalMagnetTimer > 0) {
      this.drone.setPullRadius(800);
    }

    this.drone.update(this);
    this.barrierAngle += 0.08;
  }

  draw(ctx, particleSystem) {
    const avatar = SHIP_AVATARS[this.equippedAvatar] || SHIP_AVATARS.apex_viper;

    this.dashGhostTrail.forEach(ghost => {
      ctx.save();
      ctx.globalAlpha = ghost.alpha * 0.5;
      ctx.fillStyle = avatar.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = avatar.color;
      ctx.beginPath();
      ctx.arc(ghost.x, ghost.y, this.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    this.drone.draw(ctx);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.bankAngle);

    // Flashing translucent effect during i-frames!
    if (this.overchargeInvulnerableTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    const noseY = this.height / 2;
    const exhaustX = this.bankAngle * 15;
    particleSystem.createThrusterParticle(this.x - 8 + exhaustX, this.y + noseY);
    particleSystem.createThrusterParticle(this.x + 8 + exhaustX, this.y + noseY);

    if (this.dashTimer > 0 || this.overchargeInvulnerableTimer > 0) {
      ctx.shadowBlur = 25;
      ctx.shadowColor = avatar.color;
      ctx.fillStyle = avatar.color;
    } else {
      ctx.shadowBlur = 18;
      ctx.shadowColor = avatar.color;
      ctx.fillStyle = avatar.color;
    }

    if (avatar.shape === 'venom') {
      // Venom Phantom (Acid Green, sleek delta wings & stingers)
      ctx.beginPath();
      ctx.moveTo(0, -this.height / 2);
      ctx.lineTo(-14, -this.height / 4);
      ctx.lineTo(-this.width / 2 - 6, this.height / 2);
      ctx.lineTo(-this.width / 3, 4);
      ctx.lineTo(0, this.height / 3);
      ctx.lineTo(this.width / 3, 4);
      ctx.lineTo(this.width / 2 + 6, this.height / 2);
      ctx.lineTo(14, -this.height / 4);
      ctx.closePath();
      ctx.fill();
    } else if (avatar.shape === 'crimson') {
      // Crimson Apex (Red/Gold, twin split hull)
      ctx.beginPath();
      ctx.moveTo(-10, -this.height / 2);
      ctx.lineTo(-this.width / 2, this.height / 2);
      ctx.lineTo(-this.width / 4, 0);
      ctx.lineTo(0, this.height / 4);
      ctx.lineTo(this.width / 4, 0);
      ctx.lineTo(this.width / 2, this.height / 2);
      ctx.lineTo(10, -this.height / 2);
      ctx.lineTo(0, -this.height / 4);
      ctx.closePath();
      ctx.fill();
    } else if (avatar.shape === 'phantom') {
      // Void Phantom (Purple Sharper Delta Wings)
      ctx.beginPath();
      ctx.moveTo(0, -this.height / 2);
      ctx.lineTo(-this.width / 2 - 4, this.height / 2);
      ctx.lineTo(-this.width / 3, 0);
      ctx.lineTo(0, this.height / 3);
      ctx.lineTo(this.width / 3, 0);
      ctx.lineTo(this.width / 2 + 4, this.height / 2);
      ctx.closePath();
      ctx.fill();
    } else if (avatar.shape === 'titan') {
      // Aegis Titan (Orange Heavy Armor Hull)
      ctx.beginPath();
      ctx.moveTo(0, -this.height / 2);
      ctx.lineTo(-this.width / 2, -this.height / 6);
      ctx.lineTo(-this.width / 2, this.height / 2);
      ctx.lineTo(0, this.height / 2.5);
      ctx.lineTo(this.width / 2, this.height / 2);
      ctx.lineTo(this.width / 2, -this.height / 6);
      ctx.closePath();
      ctx.fill();
    } else {
      // Viper (Default Cyan Fighter)
      ctx.beginPath();
      ctx.moveTo(0, -this.height / 2);
      ctx.lineTo(-this.width / 2, this.height / 2);
      ctx.lineTo(-this.width / 4, this.height / 4);
      ctx.lineTo(0, this.height / 3);
      ctx.lineTo(this.width / 4, this.height / 4);
      ctx.lineTo(this.width / 2, this.height / 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = avatar.accent;
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 4);
    ctx.lineTo(-this.width / 6, this.height / 4);
    ctx.lineTo(this.width / 6, this.height / 4);
    ctx.closePath();
    ctx.fill();

    if (this.barrierHits > 0) {
      ctx.restore();
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.barrierAngle);

      for (let i = 0; i < this.barrierHits; i++) {
        const angle = (i / this.barrierHits) * Math.PI * 2;
        const bx = Math.cos(angle) * (this.width * 0.85);
        const by = Math.sin(angle) * (this.width * 0.85);

        ctx.fillStyle = '#00ff66';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00ff66';
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // Forgiving Hitbox: Use 70% of player visual sprite size for collision checks
  getBounds() {
    const hitW = this.width * 0.7;
    const hitH = this.height * 0.7;
    return {
      x: this.x - hitW / 2,
      y: this.y - hitH / 2,
      width: hitW,
      height: hitH
    };
  }

  getCollisionCircle() {
    return {
      x: this.x,
      y: this.y,
      radius: (this.width * 0.7) / 2
    };
  }
}
