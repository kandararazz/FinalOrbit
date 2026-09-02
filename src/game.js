// Master Game Engine with 0.5s Death Slow-Mo, Ship Polygon Debris, & Coin Magnetization for FinalOrbit
import { Starfield, changeWaveBackground } from './starfield.js';
import { Player, SHIP_AVATARS } from './player.js';
import { Enemy } from './enemy.js';
import { Bullet } from './bullet.js';
import { ParticleSystem } from './particles.js';
import { PowerUp } from './powerup.js';
import { Asteroid, EnergySpikeMine, BlackHole, NebulaCloud, SweepingLaserGrid, SolarFlareFog } from './hazards.js';
import { soundManager } from './audio.js';
import { HUDManager } from './hud.js';
import { ShopManager } from './shop.js';
import { AugmentManager } from './augments.js';
import { LeaderboardManager } from './leaderboard.js';
import { QuestManager } from './quests.js';

export const GAME_STATES = {
  START: 'START',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  PERK_DRAFT: 'PERK_DRAFT',
  GAME_OVER: 'GAME_OVER',
  VICTORY: 'VICTORY'
};

let isGameLoopRunning = false;

export function getWaveData(waveNum) {
  const isBossWave = (waveNum % 10 === 0);
  const isSwarmWave = (!isBossWave && waveNum % 5 === 0);

  const enemyCount = isBossWave 
    ? 1 + Math.floor(waveNum / 10) * 2
    : Math.min(60, 8 + Math.floor(waveNum * 1.4));

  const spawnRate = isSwarmWave 
    ? 25 
    : Math.max(30, 85 - Math.floor(waveNum * 1.1));

  const obstacleInterval = Math.max(50, 140 - Math.floor(waveNum * 1.5));

  let enemyTypes = ['stinger'];
  if (waveNum >= 5) enemyTypes.push('scout');
  if (waveNum >= 12) enemyTypes.push('dreadnought');

  return {
    wave: waveNum,
    isBossWave,
    isSwarmWave,
    totalEnemies: enemyCount,
    spawnRate,
    obstacleInterval,
    types: enemyTypes,
    hpMultiplier: 1 + (waveNum * 0.08),
    speedMultiplier: Math.min(2.0, 1 + (waveNum * 0.015))
  };
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.state = GAME_STATES.START;
    this.endlessMode = false;
    this.shop = new ShopManager();
    this.hud = new HUDManager();
    this.leaderboard = new LeaderboardManager();
    this.quests = new QuestManager(this.shop);
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

    this.timeScale = 1.0;
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
    this.movementTouchId = null;
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
      e.preventDefault();
      if (this.state !== GAME_STATES.PLAYING) return;
      
      const touch = e.changedTouches[0];
      this.movementTouchId = touch.identifier;
      this.touchActive = true;
      this.player.touchControlActive = true;

      const rect = this.canvas.getBoundingClientRect();
      this.player.targetTouchX = touch.clientX - rect.left;
      this.player.targetTouchY = touch.clientY - rect.top;

      const now = Date.now();
      if (now - this.player.lastTapTouch < 300) {
        this.player.triggerDash();
      }
      this.player.lastTapTouch = now;
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.state !== GAME_STATES.PLAYING) return;

      let touch = null;
      if (this.movementTouchId !== null) {
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === this.movementTouchId) {
            touch = e.touches[i];
            break;
          }
        }
      }
      if (!touch) touch = e.touches[0];
      if (!touch) return;

      const rect = this.canvas.getBoundingClientRect();
      this.player.targetTouchX = touch.clientX - rect.left;
      this.player.targetTouchY = touch.clientY - rect.top;
    }, { passive: false });

    const stopTouchFlight = (e) => {
      e.preventDefault();
      let touchStillActive = false;
      if (this.movementTouchId !== null) {
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === this.movementTouchId) {
            touchStillActive = true;
            break;
          }
        }
      }
      if (!touchStillActive || e.touches.length === 0) {
        this.touchActive = false;
        this.player.touchControlActive = false;
        this.movementTouchId = null;
      }
    };

    this.canvas.addEventListener('touchend', stopTouchFlight, { passive: false });
    this.canvas.addEventListener('touchcancel', stopTouchFlight, { passive: false });

    const bindVirtualBtn = (btnId, action) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;

      const handleTouchStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.add('touch-active');
        action();
      };
      const handleTouchEnd = (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.remove('touch-active');
      };

      btn.addEventListener('touchstart', handleTouchStart, { passive: false });
      btn.addEventListener('touchend', handleTouchEnd, { passive: false });
      btn.addEventListener('touchcancel', handleTouchEnd, { passive: false });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        action();
      });
    };

    bindVirtualBtn('mobile-bomb-btn', () => {
      if (this.state === GAME_STATES.PLAYING) this.triggerSmartBomb();
    });

    bindVirtualBtn('mobile-dash-btn', () => {
      if (this.state === GAME_STATES.PLAYING) this.player.triggerDash();
    });

    bindVirtualBtn('mobile-pause-btn', () => {
      if (this.state === GAME_STATES.PLAYING || this.state === GAME_STATES.PAUSED) this.togglePause();
    });

    bindVirtualBtn('mobile-fullscreen-btn', () => {
      if (window.toggleFullscreenApp) {
        window.toggleFullscreenApp();
      }
    });

    bindVirtualBtn('mouse-toggle', () => {
      this.mouseAimEnabled = !this.mouseAimEnabled;
      const mouseBtn = document.getElementById('mouse-toggle');
      if (mouseBtn) mouseBtn.classList.toggle('active', this.mouseAimEnabled);
      if (this.crosshairEl) {
        if (this.mouseAimEnabled) this.crosshairEl.classList.remove('hidden');
        else this.crosshairEl.classList.add('hidden');
      }
      this.player.mouseControlActive = this.mouseAimEnabled;
    });

    bindVirtualBtn('autofire-toggle', () => {
      this.player.autoFirePermanent = !this.player.autoFirePermanent;
      const autoBtn = document.getElementById('autofire-toggle');
      if (autoBtn) autoBtn.classList.toggle('active', this.player.autoFirePermanent);
    });

    bindVirtualBtn('bomb-btn', () => {
      if (this.state === GAME_STATES.PLAYING) this.triggerSmartBomb();
    });

    bindVirtualBtn('chrono-btn', () => {
      if (this.state === GAME_STATES.PLAYING) this.triggerChronoShift();
    });

    bindVirtualBtn('crt-toggle', () => {
      this.hud.toggleCRT();
    });

    bindVirtualBtn('audio-toggle', () => {
      this.toggleAudio();
    });
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

  distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    return Math.hypot(px - projX, py - projY);
  }

  rectIntersect(r1, r2) {
    return !(
      r2.x > r1.x + r1.width ||
      r2.x + r2.width < r1.x ||
      r2.y > r1.y + r1.height ||
      r2.y + r2.height < r1.y
    );
  }

  returnToHome() {
    this.state = GAME_STATES.START;
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
    soundManager.stopAdaptiveMusic();

    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('shop-screen').classList.add('hidden');
    document.getElementById('editor-screen').classList.add('hidden');
    document.getElementById('leaderboard-screen').classList.add('hidden');

    document.getElementById('hud').classList.add('hidden');
    document.getElementById('radar-container').classList.add('hidden');

    const mBomb = document.getElementById('mobile-bomb-btn');
    const mDash = document.getElementById('mobile-dash-btn');
    const mHeader = document.getElementById('mobile-header-controls');

    if (mBomb) { mBomb.classList.add('hidden'); mBomb.classList.remove('active'); }
    if (mDash) { mDash.classList.add('hidden'); mDash.classList.remove('active'); }
    if (mHeader) { mHeader.classList.add('hidden'); }

    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.classList.remove('hidden');

    this.shop.updateUI();
    this.hud.updateHighScoreDisplay();
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
    this.quests.resetRunTracker();

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

    const isTouchDev = ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 1024);
    const mBomb = document.getElementById('mobile-bomb-btn');
    const mDash = document.getElementById('mobile-dash-btn');
    const mHeader = document.getElementById('mobile-header-controls');

    if (mBomb && isTouchDev) { mBomb.classList.remove('hidden'); mBomb.classList.add('active'); }
    if (mDash && isTouchDev) { mDash.classList.remove('hidden'); mDash.classList.add('active'); }
    if (mHeader && isTouchDev) { mHeader.classList.remove('hidden'); }
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

    changeWaveBackground();

    // Clear lingering enemy bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (this.bullets[i].isEnemy) this.bullets.splice(i, 1);
    }
    this.shop.saveCoins();
    this.shop.saveWins();

    soundManager.setIntensity(waveNum);
    this.starfield.setWarp(3.0);
    setTimeout(() => this.starfield.setWarp(1.0), 1200);

    const waveInfo = getWaveData(waveNum);
    const titleText = waveInfo.isBossWave 
      ? `⚠️ BOSS WAVE ${waveNum} ⚠️` 
      : waveInfo.isSwarmWave 
        ? `🔥 SWARM WAVE ${waveNum} 🔥` 
        : `WAVE ${waveNum}`;

    this.particleSystem.addFloatingText(
      this.canvas.width / 2,
      this.canvas.height / 2 - 50,
      titleText,
      waveInfo.isBossWave ? '#ff0055' : waveInfo.isSwarmWave ? '#ffea00' : '#00f0ff',
      30
    );

    // Random Sector Environmental Hazards
    if (Math.random() < 0.40) {
      const hazardType = Math.random();
      if (hazardType < 0.35) {
        // Solar Flare / Acid Fog
        this.hazards.push(new SolarFlareFog(this.canvas.width * (0.2 + Math.random() * 0.6), -80, true));
        this.particleSystem.addFloatingText(this.canvas.width / 2, 120, '⚠️ ACID FOG DETECTED ⚠️', '#39ff14', 20);
      } else if (hazardType < 0.70) {
        // Black Hole Singularity
        this.hazards.push(new BlackHole(this.canvas.width * (0.3 + Math.random() * 0.4), -60));
        this.particleSystem.addFloatingText(this.canvas.width / 2, 120, '⚠️ BLACK HOLE SINGULARITY ⚠️', '#a000ff', 20);
      } else {
        // Asteroid Storm barrage
        this.particleSystem.addFloatingText(this.canvas.width / 2, 120, '⚠️ ASTEROID STORM INCOMING ⚠️', '#ff6600', 22);
        for (let i = 0; i < 8; i++) {
          this.hazards.push(new Asteroid(Math.random() * (this.canvas.width - 60) + 30, -50 - i * 45));
        }
      }
    }

    if (waveNum >= 3 && Math.random() < 0.30) {
      this.hazards.push(new SweepingLaserGrid(this.canvas.width, Math.random() * (this.canvas.width - 200) + 100));
    }

    if (waveInfo.isBossWave) {
      this.waveEnemiesToSpawn.push({ type: 'boss', delay: 40 });
      for (let b = 0; b < Math.floor(waveNum / 10); b++) {
        this.waveEnemiesToSpawn.push({ type: 'scout', delay: 100 + b * 60 });
      }
    } else {
      const count = waveInfo.totalEnemies;
      for (let i = 0; i < count; i++) {
        const typeIndex = Math.floor(Math.random() * waveInfo.types.length);
        const enemyType = waveInfo.types[typeIndex];
        this.waveEnemiesToSpawn.push({ type: enemyType, delay: i * waveInfo.spawnRate });
      }
    }
  }

  triggerSmartBomb() {
    if (this.player.bombs <= 0) return;

    this.player.bombs--;
    this.quests.trackEvent('bomb_used', 1, this.wave);
    soundManager.playBomb();
    this.addScreenShake(22);
    if ('vibrate' in navigator) navigator.vibrate(15);

    this.particleSystem.triggerSmartBomb(
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.canvas.width,
      this.canvas.height
    );

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (this.bullets[i].isEnemy) this.bullets.splice(i, 1);
    }

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

    this.quests.trackEvent(enemy.type === 'boss' ? 'boss_kill' : enemy.type === 'stinger' ? 'stinger_kill' : 'enemy_kill', 1, this.wave);

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
                if (hz instanceof Asteroid) {
                  this.quests.trackEvent('asteroid_shatter', 1, this.wave);
                }
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
        const bRadius = Math.max(bullet.width, bullet.height) / 2;
        const pRadius = this.player.width * 0.35;
        const dist = Math.hypot(bullet.x - this.player.x, bullet.y - this.player.y);

        if (dist < bRadius + pRadius || this.rectIntersect(bullet.getBounds(), playerBounds)) {
          bullet.active = false;
          this.particleSystem.createSparks(bullet.x, bullet.y, '#ff0055', 8);

          const result = this.player.takeDamage(bullet.damage || 15);
          this.hud.update(this);

          if (result === 'HEALTH_DAMAGED' || result === 'DESTROYED') {
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

    for (let hIdx = this.hazards.length - 1; hIdx >= 0; hIdx--) {
      const hz = this.hazards[hIdx];
      if (!hz.active) continue;

      if (hz instanceof SweepingLaserGrid) {
        const pX = this.player.x;
        const pY = this.player.y;
        const pRad = this.player.width * 0.35;
        const laserRad = 6;

        const leftEnd = hz.gapX - hz.gapWidth / 2;
        const rightStart = hz.gapX + hz.gapWidth / 2;

        const dLeft = this.distToSegment(pX, pY, 0, hz.y, leftEnd, hz.y);
        const dRight = this.distToSegment(pX, pY, rightStart, hz.y, this.canvas.width, hz.y);

        if (dLeft <= pRad + laserRad || dRight <= pRad + laserRad) {
          const result = this.player.takeDamage(20);
          this.particleSystem.createSparks(pX, hz.y, '#ff0055', 6);
          this.addScreenShake(10);
          this.hud.update(this);

          if (result === 'DESTROYED') {
            this.handlePlayerGameOver();
          }
        }
      } else if (hz instanceof Asteroid || hz instanceof EnergySpikeMine) {
        const dist = Math.hypot(hz.x - this.player.x, hz.y - this.player.y);
        const pRad = this.player.radius || 20;
        const hzRad = hz.radius || 24;

        if (dist < pRad + hzRad) {
          const result = this.player.takeObstacleImpact();
          if (result) {
            hz.active = false;
            const explColor = hz instanceof EnergySpikeMine ? '#ff0033' : '#ff6600';
            this.particleSystem.createExplosion(hz.x, hz.y, 12, explColor, 1.2);
            this.particleSystem.createSparks(this.player.x, this.player.y, '#ffea00', 10);
            this.addScreenShake(12);
            soundManager.playHit();
            this.hud.update(this, true);

            const textLabel = result === 'OBSTACLE_SHIELD_SHATTER' ? '-25 SHIELD' : '-30 HEALTH';
            const textColor = result === 'OBSTACLE_SHIELD_SHATTER' ? '#00f0ff' : '#ff0055';
            this.particleSystem.addFloatingText(this.player.x, this.player.y, textLabel, textColor);

            if (result === 'DESTROYED') {
              this.handlePlayerGameOver();
            }
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
          this.quests.trackEvent('coin_pickup', 10, this.wave);
          if ('vibrate' in navigator) navigator.vibrate(15);
        } else if (p.type === 'nano') {
          this.player.heal(this.player.maxHealth * 0.25);
          soundManager.playPowerup();
          this.particleSystem.addFloatingText(p.x, p.y, '+25% HEALTH', '#00ff66');
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
          this.particleSystem.addFloatingText(p.x, p.y, '+30 HEALTH', '#00ff66');
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

    this.timeScale = 0.2;
    this.particleSystem.createShipDebris(this.player.x, this.player.y, avatarInfo.color);
    this.addScreenShake(30);
    this.triggerHitStop(4);

    setTimeout(() => {
      this.state = GAME_STATES.GAME_OVER;
      this.shop.saveCoins();
      this.shop.saveWins();
      this.hud.showGameOver(this.score, this.wave, this.scrapCollected);
      this.leaderboard.addScore(this.score, this.wave);
      document.getElementById('game-over-screen').classList.remove('hidden');
    }, 1000);
  }

  update(dt) {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer--;
      return;
    }

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

      if (this.waveEnemiesToSpawn.length === 0 && this.enemies.length === 0 && this.hazards.length === 0) {
        this.waveInProgress = false;

        this.shop.addWin(1);
        this.quests.trackEvent('wave_clear', 1, this.wave);
        this.hud.showWaveBanner(`WAVE ${this.wave} CLEARED! +1 WIN`);

        if (this.wave === 50 && !this.endlessMode) {
          setTimeout(() => {
            this.shop.addScrap(500);
            this.shop.addWin(5);
            this.state = GAME_STATES.VICTORY;
            soundManager.stopAdaptiveMusic();
            this.hud.showVictory(this.score, this.shop.wins, this.scrapCollected);
          }, 1800);
        } else {
          setTimeout(() => {
            if (this.wave % 3 === 0 || (this.endlessMode && this.wave % 5 === 0)) {
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
      } else if (hz instanceof SolarFlareFog) {
        hz.update(this.player);
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
    if (!isGameLoopRunning) {
      isGameLoopRunning = true;
      requestAnimationFrame((ts) => {
        this.lastTime = ts;
        requestAnimationFrame(this.loop.bind(this));
      });
    }
  }
}

