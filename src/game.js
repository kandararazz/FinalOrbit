// Master Game Engine with 0.5s Death Slow-Mo, Ship Polygon Debris, & Coin Magnetization for FinalOrbit
import { Starfield } from './starfield.js';
import { Player, SHIP_AVATARS } from './player.js';
import { Enemy } from './enemy.js';
import { Bullet } from './bullet.js';
import { ParticleSystem } from './particles.js';
import { PowerUp } from './powerup.js';
import { Asteroid, EnergySpikeMine, BlackHole, NebulaCloud, SweepingLaserGrid } from './hazards.js';
import { soundManager } from './audio.js';
import { HUDManager } from './hud.js';
import { ShopManager } from './shop.js';
import { AugmentManager } from './augments.js';
import { LeaderboardManager } from './leaderboard.js';

export const GAME_STATES = {
  START: 'START',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  PERK_DRAFT: 'PERK_DRAFT',
  GAME_OVER: 'GAME_OVER',
  VICTORY: 'VICTORY'
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.state = GAME_STATES.START;
    this.endlessMode = false;
    this.shop = new ShopManager();
    this.hud = new HUDManager();
    this.leaderboard = new LeaderboardManager();
    this.augments = new AugmentManager(this.onPerkSelected.bind(this));

    this.starfield = new Starfield(canvas);
    this.particleSystem = new ParticleSystem();
    this.player = new Player(canvas.width, canvas.height);

    this.enemies = [];
    this.bullets = [];
    this.powerups = [];
    this.hazards = [];

    this.score = 0;
    this.wave = 1;
    this.combo = 1;
    this.comboTimer = 0;
    this.scrapCollected = 0;

    this.recentKillsCount = 0;
    this.recentKillWindowTimer = 0;
    this.rampageActive = false;
    this.rampageTimer = 0;

    this.chronoMeter = 100;
    this.maxChronoMeter = 100;
    this.isChronoActive = false;
    this.chronoTimer = 0;

    this.timeScale = 1.0; // Slow-mo scale (0.2 on player death)
    this.hitStopTimer = 0;

    this.waveEnemiesToSpawn = [];
    this.spawnTimer = 0;
    this.waveInProgress = false;

    this.shakeIntensity = 0;
    this.lastKeyDownS = 0;

    this.mouseAimEnabled = false;
    this.crosshairEl = document.getElementById('custom-crosshair');
    this.rampageBannerEl = document.getElementById('rampage-banner');

    this.keys = {};
    this.touchActive = false;
    this.lastTime = 0;

    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (this.state === GAME_STATES.PLAYING) {
        if (e.code === 'KeyB') this.triggerSmartBomb();
        if (e.code === 'KeyC') this.triggerChronoShift();

        if (e.code === 'KeyT') {
          this.player.autoFirePermanent = !this.player.autoFirePermanent;
          const autoBtn = document.getElementById('autofire-toggle');
          if (autoBtn) autoBtn.classList.toggle('active', this.player.autoFirePermanent);
        }

        if (e.code === 'KeyS' || e.code === 'ArrowDown') {
          const now = Date.now();
          if (now - this.lastKeyDownS < 300) {
            if (this.player.triggerEMP()) {
              this.triggerEmpDischargeRing();
            }
          }
          this.lastKeyDownS = now;
        }
      }

      if (e.code === 'KeyM') this.toggleAudio();
      if (e.code === 'KeyF') this.hud.toggleCRT();

      if ((e.code === 'KeyP' || e.code === 'Escape') && (this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.PAUSED)) {
        this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (this.crosshairEl && this.mouseAimEnabled) {
        this.crosshairEl.style.left = `${e.clientX}px`;
        this.crosshairEl.style.top = `${e.clientY}px`;
      }

      if (this.mouseAimEnabled) {
        this.player.mouseControlActive = true;
        this.player.targetMouseX = mouseX;
        this.player.targetMouseY = mouseY;
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.state !== GAME_STATES.PLAYING) return;
      if (e.button === 0) {
        this.keys['Space'] = true;
      } else if (e.button === 2) {
        e.preventDefault();
        this.triggerSmartBomb();
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.keys['Space'] = false;
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('touchstart', (e) => {
      if (this.state !== GAME_STATES.PLAYING) return;
      this.touchActive = true;
      this.player.touchControlActive = true;

      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.player.targetTouchX = touch.clientX - rect.left;
      this.player.targetTouchY = touch.clientY - rect.top;

      const now = Date.now();
      if (now - this.player.lastTapTouch < 300) {
        this.player.triggerDash();
      }
      this.player.lastTapTouch = now;
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (this.state !== GAME_STATES.PLAYING) return;
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.player.targetTouchX = touch.clientX - rect.left;
      this.player.targetTouchY = touch.clientY - rect.top;
    });

    this.canvas.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        this.touchActive = false;
        this.player.touchControlActive = false;
      }
    });

    const mobileBombBtn = document.getElementById('mobile-bomb-btn');
    if (mobileBombBtn) {
      mobileBombBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.state === GAME_STATES.PLAYING) this.triggerSmartBomb();
      });
    }

    const mouseBtn = document.getElementById('mouse-toggle');
    if (mouseBtn) {
      mouseBtn.addEventListener('click', () => {
        this.mouseAimEnabled = !this.mouseAimEnabled;
        mouseBtn.classList.toggle('active', this.mouseAimEnabled);
        if (this.crosshairEl) {
          if (this.mouseAimEnabled) this.crosshairEl.classList.remove('hidden');
          else this.crosshairEl.classList.add('hidden');
        }
        this.player.mouseControlActive = this.mouseAimEnabled;
      });
    }

    const autoBtn = document.getElementById('autofire-toggle');
    if (autoBtn) {
      autoBtn.addEventListener('click', () => {
        this.player.autoFirePermanent = !this.player.autoFirePermanent;
        autoBtn.classList.toggle('active', this.player.autoFirePermanent);
      });
    }

    const bombBtn = document.getElementById('bomb-btn');
    if (bombBtn) {
      bombBtn.addEventListener('click', () => {
        if (this.state === GAME_STATES.PLAYING) this.triggerSmartBomb();
      });
    }

    const chronoBtn = document.getElementById('chrono-btn');
    if (chronoBtn) {
      chronoBtn.addEventListener('click', () => {
        if (this.state === GAME_STATES.PLAYING) this.triggerChronoShift();
      });
    }

    const crtBtn = document.getElementById('crt-toggle');
    if (crtBtn) {
      crtBtn.addEventListener('click', () => this.hud.toggleCRT());
    }

    const audioBtn = document.getElementById('audio-toggle');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => this.toggleAudio());
    }
  }

  toggleAudio() {
    const muted = soundManager.toggleMute();
    const icon = document.getElementById('audio-icon');
    if (icon) icon.textContent = muted ? '🔇' : '🔊';
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.starfield.resize(width, height);
  }

  triggerEmpDischargeRing() {
    this.particleSystem.triggerSmartBomb(this.player.x, this.player.y, 150, 150);
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.isEnemy && Math.hypot(b.x - this.player.x, b.y - this.player.y) < 150) {
        b.active = false;
        this.particleSystem.createSparks(b.x, b.y, '#00f0ff', 6);
      }
    }
  }

  rectIntersect(r1, r2) {
    return !(
      r2.x > r1.x + r1.width ||
      r2.x + r2.width < r1.x ||
      r2.y > r1.y + r1.height ||
      r2.y + r2.height < r1.y
    );
  }

  startNewGame(endless = false) {
    this.endlessMode = endless;
    this.score = 0;
    this.wave = 1;
    this.combo = 1;
    this.comboTimer = 0;
    this.scrapCollected = 0;
    this.chronoMeter = 100;
    this.isChronoActive = false;
    this.recentKillsCount = 0;
    this.rampageActive = false;
    this.timeScale = 1.0;

    this.enemies = [];
    this.bullets = [];
    this.powerups = [];
    this.hazards = [];
    this.particleSystem.clear();
    this.augments.reset();

    this.player.reset(this.canvas.width, this.canvas.height, this.shop.upgrades);
    this.startWave(this.wave);

    this.state = GAME_STATES.PLAYING;
    soundManager.startAdaptiveMusic();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('shop-screen').classList.add('hidden');
    document.getElementById('editor-screen').classList.add('hidden');
    document.getElementById('leaderboard-screen').classList.add('hidden');

    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('radar-container').classList.remove('hidden');

    const mobileBombBtn = document.getElementById('mobile-bomb-btn');
    if (mobileBombBtn && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      mobileBombBtn.classList.remove('hidden');
      mobileBombBtn.classList.add('active');
    }
  }

  playCustomWave(jsonConfig) {
    this.startNewGame();
    this.waveEnemiesToSpawn = [];

    if (jsonConfig.entities && Array.isArray(jsonConfig.entities)) {
      jsonConfig.entities.forEach(item => {
        const x = item.gridX * (this.canvas.width / 10) + 20;
        const y = item.gridY * (this.canvas.height / 10) + 20;

        if (item.type === 'asteroid') {
          this.hazards.push(new Asteroid(x, y));
        } else {
          this.enemies.push(new Enemy(x, y, item.type, this.wave));
        }
      });
    }
  }

  togglePause() {
    if (this.state === GAME_STATES.PLAYING) {
      this.state = GAME_STATES.PAUSED;
      soundManager.stopAdaptiveMusic();
      document.getElementById('pause-screen').classList.remove('hidden');
    } else if (this.state === GAME_STATES.PAUSED) {
      this.state = GAME_STATES.PLAYING;
      soundManager.startAdaptiveMusic();
      document.getElementById('pause-screen').classList.add('hidden');
    }
  }

  triggerChronoShift() {
    if (this.chronoMeter < 30 || this.isChronoActive) return;

    this.isChronoActive = true;
    const duration = this.augments.activePerks.chronoBoost ? 270 : 180;
    this.chronoTimer = duration;
    soundManager.playChrono();
  }

  onPerkSelected(perk) {
    this.player.applyPerks(this.augments.activePerks);
    this.state = GAME_STATES.PLAYING;
    soundManager.startAdaptiveMusic();
    this.startWave(this.wave + 1);
  }

  startWave(waveNum) {
    this.wave = waveNum;
    this.waveInProgress = true;
    this.spawnTimer = 0;
    this.waveEnemiesToSpawn = [];

    const biomeIndex = Math.floor((waveNum - 1) / 4) % 5;
    this.starfield.setBiome(biomeIndex);
    soundManager.setIntensity(waveNum);

    this.starfield.setWarp(3.0);
    setTimeout(() => this.starfield.setWarp(1.0), 1200);

    this.particleSystem.addFloatingText(
      this.canvas.width / 2,
      this.canvas.height / 2 - 50,
      `WAVE ${waveNum}`,
      '#00f0ff',
      30
    );

    if (waveNum >= 3 && Math.random() < 0.35) {
      this.hazards.push(new SweepingLaserGrid(this.canvas.width, Math.random() * (this.canvas.width - 200) + 100));
    }

    if (Math.random() < 0.65) {
      for (let i = 0; i < Math.min(6, 2 + Math.floor(waveNum / 6)); i++) {
        const hx = Math.random() * (this.canvas.width - 80) + 40;
        const hy = -40 - i * 55;
        if (Math.random() < 0.5) {
          this.hazards.push(new Asteroid(hx, hy));
        } else {
          this.hazards.push(new EnergySpikeMine(hx, hy));
        }
      }
    }

    if (waveNum % 5 === 0) {
      this.waveEnemiesToSpawn.push({ type: 'boss', delay: 60 });
    } else {
      const droneCount = Math.min(25, 4 + Math.floor(waveNum * 1.2));
      const scoutCount = Math.min(18, Math.floor(waveNum * 1.0));
      const stingerCount = Math.min(15, Math.floor(waveNum * 0.9));
      const anchorCount = Math.min(8, Math.floor(waveNum / 2.5));
      const acidSpitterCount = Math.min(12, Math.floor(waveNum / 2.0));

      for (let i = 0; i < droneCount; i++) {
        this.waveEnemiesToSpawn.push({ type: 'drone', delay: i * 25 });
      }
      for (let i = 0; i < scoutCount; i++) {
        this.waveEnemiesToSpawn.push({ type: 'scout', delay: 40 + i * 35 });
      }
      for (let i = 0; i < stingerCount; i++) {
        this.waveEnemiesToSpawn.push({ type: 'stinger', delay: 70 + i * 30 });
      }
      for (let i = 0; i < anchorCount; i++) {
        this.waveEnemiesToSpawn.push({ type: 'anchor', delay: 120 + i * 60 });
      }
      for (let i = 0; i < acidSpitterCount; i++) {
        this.waveEnemiesToSpawn.push({ type: 'acid_spitter', delay: 150 + i * 45 });
      }
    }
  }

  triggerSmartBomb() {
    if (this.player.bombs <= 0) return;

    this.player.bombs--;
    soundManager.playBomb();
    this.addScreenShake(22);
    if ('vibrate' in navigator) navigator.vibrate([20]);

    this.particleSystem.triggerSmartBomb(
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.canvas.width,
      this.canvas.height
    );

    this.bullets = this.bullets.filter(b => !b.isEnemy);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const killed = enemy.takeDamage(220);
      if (killed) this.handleEnemyKilled(enemy);
    }
  }

  addScreenShake(intensity) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  triggerHitStop(durationFrames = 2) {
    this.hitStopTimer = durationFrames;
  }

  handleEnemyKilled(enemy) {
    soundManager.playExplosion(enemy.type);
    this.addScreenShake(enemy.type === 'boss' ? 26 : 8);
    this.triggerHitStop(enemy.type === 'boss' ? 5 : 2);

    this.particleSystem.createExplosion(
      enemy.x,
      enemy.y,
      enemy.type === 'boss' ? 80 : 25,
      enemy.color,
      enemy.type === 'boss' ? 2.5 : 1
    );

    if (enemy.isGlitch && enemy.type !== 'drone') {
      this.enemies.push(new Enemy(enemy.x - 15, enemy.y, 'drone', this.wave));
      this.enemies.push(new Enemy(enemy.x + 15, enemy.y, 'drone', this.wave));
    }

    this.recentKillsCount++;
    this.recentKillWindowTimer = 120;
    if (this.recentKillsCount >= 5 && !this.rampageActive) {
      this.rampageActive = true;
      this.rampageTimer = 300;
      if (this.rampageBannerEl) this.rampageBannerEl.classList.remove('hidden');
      this.particleSystem.addFloatingText(this.player.x, this.player.y, 'RAMPAGE! (1.5x SCORE)', '#ffea00', 22);
    }

    this.comboTimer = 180;
    const scoreMultiplier = (this.rampageActive ? 1.5 : 1.0) * this.combo;
    const pts = Math.round(enemy.scoreValue * scoreMultiplier);
    this.score += pts;

    this.particleSystem.addFloatingText(enemy.x, enemy.y, `+${pts}`, '#ffea00');
    this.combo++;

    // Defeated enemies drop glowing yellow/gold circular coin particles!
    const scrapCount = (enemy.type === 'boss' ? 12 : 2) * (this.augments.activePerks.scrapMagnate ? 2 : 1);
    for (let s = 0; s < scrapCount; s++) {
      const sx = enemy.x + (Math.random() - 0.5) * 30;
      const sy = enemy.y + (Math.random() - 0.5) * 30;
      this.powerups.push(new PowerUp(sx, sy, 'scrap'));
    }

    if (Math.random() < 0.10) {
      const weaponType = Math.random() > 0.5 ? 'triple' : 'railgun';
      this.powerups.push(new PowerUp(enemy.x, enemy.y, weaponType));
    }

    const roll = Math.random();
    if (roll < 0.03) {
      this.powerups.push(new PowerUp(enemy.x, enemy.y, 'smart_restock'));
    } else if (roll < 0.08) {
      this.powerups.push(new PowerUp(enemy.x, enemy.y, 'nano'));
    } else if (roll < 0.12) {
      this.powerups.push(new PowerUp(enemy.x, enemy.y, 'booster'));
    } else if (roll < 0.16) {
      this.powerups.push(new PowerUp(enemy.x, enemy.y, 'magnet_sphere'));
    }
  }

  checkCollisions() {
    const playerBounds = this.player.getBounds();

    for (let bIdx = this.bullets.length - 1; bIdx >= 0; bIdx--) {
      const bullet = this.bullets[bIdx];
      if (!bullet.active) continue;

      if (!bullet.isEnemy) {
        for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
          const enemy = this.enemies[eIdx];
          if (!enemy.active) continue;

          if (enemy.tetherTarget && enemy.tetherTarget.active && enemy.tetherTarget.type === 'anchor') {
            this.particleSystem.createSparks(bullet.x, bullet.y, '#00ff66', 4);
            bullet.active = false;
            continue;
          }

          if (enemy.type === 'boss') {
            enemy.turrets.forEach((t, tIdx) => {
              if (t.active) {
                const tBounds = { x: enemy.x + t.xOffset - 12, y: enemy.y + t.yOffset - 12, width: 24, height: 24 };
                if (this.rectIntersect(bullet.getBounds(), tBounds)) {
                  if (!bullet.piercing && !this.augments.activePerks.overchargedCoils) bullet.active = false;
                  const destroyed = enemy.takeTurretDamage(tIdx, bullet.damage);
                  if (destroyed) {
                    this.particleSystem.createExplosion(enemy.x + t.xOffset, enemy.y + t.yOffset, 20, '#ffea00');
                    this.particleSystem.addFloatingText(enemy.x + t.xOffset, enemy.y, 'TURRET DESTROYED!', '#ffea00');
                  }
                }
              }
            });
          }

          if (this.rectIntersect(bullet.getBounds(), enemy.getBounds())) {
            // Overcharged Coils perk: Bullets pierce through 1 additional enemy!
            if (!bullet.piercing && !this.augments.activePerks.overchargedCoils) bullet.active = false;
            this.particleSystem.createSparks(bullet.x, bullet.y, bullet.color, 6);

            const killed = enemy.takeDamage(bullet.damage, bullet.y);
            if (killed) this.handleEnemyKilled(enemy);
            break;
          }
        }

        for (let hIdx = this.hazards.length - 1; hIdx >= 0; hIdx--) {
          const hz = this.hazards[hIdx];
          if ((hz instanceof Asteroid || hz instanceof EnergySpikeMine) && hz.active) {
            if (this.rectIntersect(bullet.getBounds(), hz.getBounds())) {
              if (!bullet.piercing) bullet.active = false;
              const destroyed = hz.takeDamage(bullet.damage);
              if (destroyed) {
                const points = hz.scoreValue || 25;
                this.score += points;
                this.hud.updateScore(this.score);
                const explColor = hz instanceof EnergySpikeMine ? '#ff3300' : '#8c6d58';
                this.particleSystem.createExplosion(hz.x, hz.y, 25, explColor, 1.2);
                this.particleSystem.addFloatingText(hz.x, hz.y, `+${points}`, '#ffea00');
                soundManager.playExplosion();
              } else {
                this.particleSystem.createSparks(bullet.x, bullet.y, '#ffea00', 4);
              }
            }
          }
        }
      } else {
        if (this.rectIntersect(bullet.getBounds(), playerBounds)) {
          bullet.active = false;
          this.particleSystem.createSparks(bullet.x, bullet.y, '#ff0055', 8);

          const result = this.player.takeDamage(bullet.damage);
          if (result === 'HULL_DAMAGED' || result === 'DESTROYED') {
            this.addScreenShake(8);
          }

          if (result === 'SHIELD_OVERCHARGE_PULSE') {
            this.triggerEmpDischargeRing();
            this.addScreenShake(16);
            this.particleSystem.addFloatingText(this.player.x, this.player.y, 'SHIELD OVERCHARGE PULSE!', '#00ff66');
          } else if (result === 'EMP_SHATTER') {
            this.triggerSmartBomb();
          } else if (result === 'DESTROYED') {
            this.handlePlayerGameOver();
          }
        }
      }
    }

    // Player vs Sharp Hazard Obstacles (Jagged Asteroids & Energy Spike Mines)
    for (let hIdx = this.hazards.length - 1; hIdx >= 0; hIdx--) {
      const hz = this.hazards[hIdx];
      if ((hz instanceof Asteroid || hz instanceof EnergySpikeMine) && hz.active) {
        if (this.rectIntersect(playerBounds, hz.getBounds())) {
          const result = this.player.takeObstacleImpact();
          if (result === 'OBSTACLE_SHIELD_SHATTER' || result === 'OBSTACLE_HULL_HIT') {
            hz.active = false;
            const explColor = hz instanceof EnergySpikeMine ? '#ff3300' : '#8c6d58';
            this.particleSystem.createExplosion(hz.x, hz.y, 25, explColor, 1.3);
            this.particleSystem.createSparks(this.player.x, this.player.y, '#ffea00', 15);
            this.addScreenShake(12); // Quick 0.2s screen shake
            soundManager.playHit();

            const textLabel = result === 'OBSTACLE_SHIELD_SHATTER' ? '-30% SHIELD' : '-35% HULL';
            const textColor = result === 'OBSTACLE_SHIELD_SHATTER' ? '#00f0ff' : '#ff0055';
            this.particleSystem.addFloatingText(this.player.x, this.player.y, textLabel, textColor);
          } else if (result === 'DESTROYED') {
            hz.active = false;
            this.handlePlayerGameOver();
          }
        }
      } else if (hz instanceof SweepingLaserGrid && hz.active) {
        if (Math.abs(this.player.y - hz.y) < 12) {
          const leftBound = hz.gapX - hz.gapWidth / 2;
          const rightBound = hz.gapX + hz.gapWidth / 2;
          if (this.player.x < leftBound || this.player.x > rightBound) {
            const result = this.player.takeDamage(40);
            this.addScreenShake(12);
            if (result === 'DESTROYED') this.handlePlayerGameOver();
          }
        }
      }
    }

    for (let eIdx = this.enemies.length - 1; eIdx >= 0; eIdx--) {
      const enemy = this.enemies[eIdx];
      if (!enemy.active) continue;

      if (this.rectIntersect(enemy.getBounds(), playerBounds)) {
        this.particleSystem.createExplosion(enemy.x, enemy.y, 20, '#ff2a55');
        this.addScreenShake(14);
        enemy.active = false;

        const result = this.player.takeDamage(35);
        if (result === 'DESTROYED') this.handlePlayerGameOver();
      }
    }

    // Magnetize coins smoothly when player ship comes within 100px!
    this.powerups.forEach(p => {
      if (!p.active) return;
      const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
      if (dist < 100) {
        p.x += ((this.player.x - p.x) / dist) * 7.5;
        p.y += ((this.player.y - p.y) / dist) * 7.5;
      }
    });

    this.player.drone.attractItems(this.powerups);

    for (let pIdx = this.powerups.length - 1; pIdx >= 0; pIdx--) {
      const p = this.powerups[pIdx];
      if (!p.active) continue;

      if (this.rectIntersect(p.getBounds(), playerBounds)) {
        p.active = false;

        if (p.type === 'scrap') {
          this.scrapCollected += 10;
          this.shop.addScrap(10);
        } else if (p.type === 'nano') {
          this.player.heal(this.player.maxHealth * 0.25);
          soundManager.playPowerup();
          this.particleSystem.addFloatingText(p.x, p.y, '+25% NANO HULL', '#00ff66');
        } else if (p.type === 'booster') {
          this.player.restoreShield(this.player.maxShield * 0.5);
          soundManager.playPowerup();
          this.particleSystem.addFloatingText(p.x, p.y, 'SHIELD BATTERY BOOST!', '#0088ff');
        } else if (p.type === 'smart_restock') {
          this.player.bombs = Math.min(this.player.maxBombs, this.player.bombs + 1);
          soundManager.playPowerup();
          this.particleSystem.addFloatingText(p.x, p.y, '+1 SMART BOMB RESTOCK!', '#ff5500');
        } else if (p.type === 'magnet_sphere') {
          this.player.globalMagnetTimer = 600;
          soundManager.playPowerup();
          this.particleSystem.addFloatingText(p.x, p.y, 'MAGNET SPHERE ACTIVE (10s)!', '#ff0077');
        } else if (p.type === 'coolant') {
          this.player.weapons.coolantVent();
          soundManager.playPowerup();
          this.particleSystem.addFloatingText(p.x, p.y, 'COOLANT VENTED!', '#00ffff');
        } else if (p.type === 'health') {
          this.player.heal(30);
          soundManager.playPowerup();
          this.particleSystem.addFloatingText(p.x, p.y, '+30 HULL', '#00ff66');
        } else if (p.type === 'shield') {
          this.player.restoreShield(40);
          soundManager.playPowerup();
          this.particleSystem.addFloatingText(p.x, p.y, '+40 SHIELD', '#0088ff');
        } else if (p.type === 'triple' || p.type === 'spread') {
          this.player.weapons.setWeaponMode('triple', 1200);
          this.particleSystem.addFloatingText(p.x, p.y, 'SPREAD SHOT (20s)!', '#ff0077');
        } else if (p.type === 'railgun' || p.type === 'rail') {
          this.player.weapons.setWeaponMode('railgun', 1200);
          this.particleSystem.addFloatingText(p.x, p.y, 'PLASMA RAIL (20s)!', '#00f0ff');
        } else {
          this.player.weapons.setWeaponMode(p.type, 1200);
          this.particleSystem.addFloatingText(p.x, p.y, `${p.label} UNLOCKED!`, '#ff0077');
        }
      }
    }
  }

  handlePlayerGameOver() {
    soundManager.playGameOver();
    const avatarInfo = SHIP_AVATARS[this.player.equippedAvatar] || SHIP_AVATARS.apex_viper;

    // Trigger 0.5s slow-motion effect (timeScale = 0.2)
    this.timeScale = 0.2;

    // Break player ship into 5-8 spinning polygon fragments with smoke trails & 35+ glowing neon particles!
    this.particleSystem.createShipDebris(this.player.x, this.player.y, avatarInfo.color);
    this.addScreenShake(30);
    this.triggerHitStop(4); // 50ms freeze frame

    setTimeout(() => {
      this.state = GAME_STATES.GAME_OVER;
      this.hud.showGameOver(this.score, this.wave, this.scrapCollected);
      this.leaderboard.addScore(this.score, this.wave);
      document.getElementById('game-over-screen').classList.remove('hidden');
    }, 1000); // 1-second delay before showing Game Over overlay!
  }

  update(dt) {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer--;
      return;
    }

    // Apply timeScale for slow-motion effect!
    const speedMult = (this.isChronoActive ? 0.25 : 1.0) * this.timeScale;
    this.starfield.update(dt * speedMult);

    if (this.state !== GAME_STATES.PLAYING) return;

    const hpPercent = (this.player.health / this.player.maxHealth) * 100;
    soundManager.setLowHealth(hpPercent < 25 && hpPercent > 0);

    if (this.recentKillWindowTimer > 0) {
      this.recentKillWindowTimer--;
      if (this.recentKillWindowTimer <= 0) this.recentKillsCount = 0;
    }
    if (this.rampageActive) {
      this.rampageTimer--;
      if (this.rampageTimer <= 0) {
        this.rampageActive = false;
        if (this.rampageBannerEl) this.rampageBannerEl.classList.add('hidden');
      }
    }

    if (this.isChronoActive) {
      this.chronoTimer--;
      if (this.chronoTimer <= 0) this.isChronoActive = false;
    } else if (this.chronoMeter < this.maxChronoMeter) {
      this.chronoMeter = Math.min(this.maxChronoMeter, this.chronoMeter + 0.15);
    }

    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= 0.92;
      if (this.shakeIntensity < 0.2) this.shakeIntensity = 0;
    }

    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) this.combo = 1;
    }

    this.player.handleInput(this.keys);
    this.player.update(this.canvas.width, this.canvas.height);

    if (this.keys['Space'] || this.touchActive || this.player.autoFirePermanent) {
      const newBullets = this.player.weapons.shoot(
        this.player.x,
        this.player.y,
        this.enemies,
        this.augments.activePerks
      );
      if (newBullets.length > 0) {
        this.bullets.push(...newBullets);
      }
    }

    if (this.waveInProgress) {
      this.spawnTimer += speedMult;
      for (let i = this.waveEnemiesToSpawn.length - 1; i >= 0; i--) {
        const item = this.waveEnemiesToSpawn[i];
        if (this.spawnTimer >= item.delay) {
          const spawnX = Math.random() * (this.canvas.width - 100) + 50;
          const isGlitch = Math.random() < 0.15;
          this.enemies.push(new Enemy(spawnX, -40, item.type, this.wave, isGlitch));
          this.waveEnemiesToSpawn.splice(i, 1);
        }
      }

      // Wave Clear Check -> Award +1 Win immediately & update HUD!
      if (this.waveEnemiesToSpawn.length === 0 && this.enemies.length === 0 && this.hazards.length === 0) {
        this.waveInProgress = false;

        this.shop.addWin(1);
        this.hud.showWaveBanner(`WAVE ${this.wave} CLEARED! +1 WIN`);

        if (this.wave === 50 && !this.endlessMode) {
          // Final Victory! (Wave 50 Complete)
          setTimeout(() => {
            this.shop.addScrap(500); // +500 Coins Bonus!
            this.shop.addWin(5); // +5 Wins Bonus!
            this.state = GAME_STATES.VICTORY;
            soundManager.stopAdaptiveMusic();
            this.hud.showVictory(this.score, this.shop.wins, this.scrapCollected);
          }, 1800);
        } else {
          // Transition to next wave after 2 seconds!
          setTimeout(() => {
            if (this.wave % 3 === 0) {
              this.state = GAME_STATES.PERK_DRAFT;
              soundManager.stopAdaptiveMusic();
              this.augments.triggerPerkDraft();
            } else {
              this.startWave(this.wave + 1);
            }
          }, 2000);
        }
      }
    }

    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const hz = this.hazards[i];
      if (hz instanceof BlackHole) {
        hz.update(this.player, this.enemies, this.bullets);
      } else {
        hz.update(this.player);
      }
      if (hz.isOutOfBounds(this.canvas.height) || !hz.active) {
        this.hazards.splice(i, 1);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(this.canvas.width, this.canvas.height, this.player.x, this.player.y, this.enemies);

      if (enemy.shouldShoot()) {
        const eBullets = enemy.shoot(this.player.x, this.player.y);
        this.bullets.push(...eBullets);
      }

      if (enemy.isOutOfBounds(this.canvas.height) || !enemy.active) {
        this.enemies.splice(i, 1);
      }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(this.canvas.width, this.canvas.height, this.enemies);
      if (b.isOutOfBounds(this.canvas.width, this.canvas.height) || !b.active) {
        this.bullets.splice(i, 1);
      }
    }

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.update();
      if (p.isOutOfBounds(this.canvas.height) || !p.active) {
        this.powerups.splice(i, 1);
      }
    }

    this.checkCollisions();
    this.particleSystem.update();
    this.hud.update(this);
  }

  render() {
    this.ctx.save();

    if (this.shakeIntensity > 0) {
      const dx = (Math.random() - 0.5) * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(dx, dy);
    }

    this.ctx.fillStyle = '#03050c';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.starfield.draw(this.ctx);
    this.hazards.forEach(hz => hz.draw(this.ctx));
    this.powerups.forEach(p => p.draw(this.ctx));
    this.bullets.forEach(b => b.draw(this.ctx));
    this.enemies.forEach(e => e.draw(this.ctx));

    if (this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.PAUSED) {
      this.player.draw(this.ctx, this.particleSystem);
    }

    this.particleSystem.draw(this.ctx);

    this.ctx.restore();
  }

  loop(timestamp) {
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  run() {
    requestAnimationFrame((ts) => {
      this.lastTime = ts;
      requestAnimationFrame(this.loop.bind(this));
    });
  }
}
