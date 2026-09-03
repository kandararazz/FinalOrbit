// Weapon Systems & 20-Second Upgrade Duration for FinalOrbit
import { Bullet } from './bullet.js';
import { soundManager } from './audio.js';

export class WeaponSystem {
  constructor() {
    this.mode = 'dual'; // 'dual', 'triple' (Spread Shot), 'railgun' (Plasma Rail)
    this.heat = 0;
    this.maxHeat = 100;
    this.isOverheated = false;
    this.heatBuildRate = 3.5;
    this.coolRate = 1.2;
    this.fireCooldown = 0;

    // Active weapon upgrade timer: 20 seconds = 1200 frames at 60fps
    this.upgradeTimer = 0;
  }

  setWeaponMode(mode, durationFrames = 1200) {
    this.mode = mode;
    this.upgradeTimer = durationFrames; // 20 Seconds duration requirement!
    soundManager.playPowerup();
  }

  update() {
    if (this.fireCooldown > 0) this.fireCooldown--;

    if (this.heat > 0) {
      this.heat = Math.max(0, this.heat - this.coolRate);
      if (this.heat === 0 && this.isOverheated) {
        this.isOverheated = false;
      }
    }

    // Revert to 'dual' after 20 seconds
    if (this.mode !== 'dual') {
      this.upgradeTimer--;
      if (this.upgradeTimer <= 0) {
        this.mode = 'dual';
      }
    }
  }

  coolantVent() {
    this.heat = 0;
    this.isOverheated = false;
  }

  shoot(x, y, enemies = [], perks = {}, isOverdrive = false) {
    if ((this.isOverheated && !isOverdrive) || this.fireCooldown > 0) return [];

    if (isOverdrive) {
      this.heat = 0;
      this.isOverheated = false;
    } else {
      this.heat += this.heatBuildRate * (perks.heatReduction ? 0.7 : 1.0);
      if (this.heat >= this.maxHeat) {
        this.heat = this.maxHeat;
        this.isOverheated = true;
      }
    }

    const bullets = [];
    const noseY = y - 24;

    if (isOverdrive) {
      this.fireCooldown = 3;
      soundManager.playLaser('dual');
      bullets.push(new Bullet(x - 22, noseY, 0, -18, false, 'railgun', 15, perks));
      bullets.push(new Bullet(x - 7, noseY, 0, -18, false, 'railgun', 15, perks));
      bullets.push(new Bullet(x + 7, noseY, 0, -18, false, 'railgun', 15, perks));
      bullets.push(new Bullet(x + 22, noseY, 0, -18, false, 'railgun', 15, perks));
      return bullets;
    }

    switch (this.mode) {
      case 'railgun':
      case 'rail':
        // Plasma Rail (piercing beam)
        this.fireCooldown = 4;
        soundManager.playLaser('railgun');
        bullets.push(new Bullet(x, noseY - 15, 0, -18, false, 'railgun', 25, perks));
        break;

      case 'missile':
        this.fireCooldown = 12;
        soundManager.playLaser('missile');
        bullets.push(new Bullet(x - 16, noseY, -4, -8, false, 'missile', 35, perks));
        bullets.push(new Bullet(x + 16, noseY, 4, -8, false, 'missile', 35, perks));
        break;

      case 'flak':
        this.fireCooldown = 14;
        soundManager.playLaser('flak');
        for (let i = -2; i <= 2; i++) {
          bullets.push(new Bullet(x, noseY, i * 3.5, -12, false, 'flak', 18, perks));
        }
        break;

      case 'tesla':
        this.fireCooldown = 10;
        soundManager.playTesla();
        bullets.push(new Bullet(x, noseY, 0, -15, false, 'tesla', 20, perks));
        break;

      case 'triple':
      case 'spread':
        // Spread Shot (3-way spread)
        this.fireCooldown = 8;
        soundManager.playLaser('triple');
        bullets.push(new Bullet(x, noseY, 0, -14, false, 'spread', 12, perks));
        bullets.push(new Bullet(x - 14, noseY + 4, -3, -13, false, 'spread', 12, perks));
        bullets.push(new Bullet(x + 14, noseY + 4, 3, -13, false, 'spread', 12, perks));
        break;

      case 'dual':
      default:
        // Dual Laser
        this.fireCooldown = 8;
        soundManager.playLaser('dual');
        bullets.push(new Bullet(x - 10, noseY, 0, -14, false, 'dual', 10, perks));
        bullets.push(new Bullet(x + 10, noseY, 0, -14, false, 'dual', 10, perks));
        break;
    }

    return bullets;
  }
}
