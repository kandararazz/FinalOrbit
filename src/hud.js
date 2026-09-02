// HUD, Holographic Radar, Boss Health Bar, Damage Vignette & CRT Shader for FinalOrbit

export class HUDManager {
  constructor() {
    this.scoreValEl = document.getElementById('score-val');
    this.scrapValEl = document.getElementById('scrap-val');
    this.highScoreValEl = document.getElementById('high-score-val');
    this.startHighScoreEl = document.getElementById('start-high-score');
    this.waveValEl = document.getElementById('wave-val');
    this.biomeBadgeEl = document.getElementById('biome-badge');

    this.healthBarInner = document.getElementById('health-bar-inner');
    this.healthText = document.getElementById('health-text');
    this.shieldBarInner = document.getElementById('shield-bar-inner');
    this.shieldText = document.getElementById('shield-text');
    this.heatBarInner = document.getElementById('heat-bar-inner');
    this.heatText = document.getElementById('heat-text');

    // Boss Top Health Bar
    this.bossBarContainer = document.getElementById('boss-bar-container');
    this.bossBarInner = document.getElementById('boss-bar-inner');

    this.comboBadge = document.getElementById('combo-badge');
    this.comboValEl = document.getElementById('combo-val');
    this.weaponBadge = document.getElementById('weapon-badge');
    this.bombCountEl = document.getElementById('bomb-count');

    this.chronoMeterFill = document.getElementById('chrono-meter-fill');
    this.dashBadge = document.getElementById('dash-badge');
    this.damageVignette = document.getElementById('damage-vignette');
    this.crtOverlay = document.getElementById('crt-overlay');

    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

    this.highScore = this.loadHighScore();
    this.winsValEl = document.getElementById('wins-val');
    this.waveBannerEl = document.getElementById('wave-banner');
    this.updateHighScoreDisplay();
  }

  loadHighScore() {
    try {
      const saved = localStorage.getItem('final_orbit_high_score');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  saveHighScore(score) {
    if (score > this.highScore) {
      this.highScore = score;
      try {
        localStorage.setItem('final_orbit_high_score', this.highScore.toString());
      } catch (e) {}
      this.updateHighScoreDisplay();
      return true;
    }
    return false;
  }

  updateHighScoreDisplay() {
    const formatted = this.padScore(this.highScore);
    if (this.highScoreValEl) this.highScoreValEl.textContent = formatted;
    if (this.startHighScoreEl) this.startHighScoreEl.textContent = formatted;
  }

  padScore(score) {
    return score.toString().padStart(6, '0');
  }

  toggleCRT() {
    if (this.crtOverlay) {
      this.crtOverlay.classList.toggle('disabled');
    }
  }

  showWaveBanner(text = 'WAVE CLEARED! +1 WIN') {
    if (this.waveBannerEl) {
      this.waveBannerEl.textContent = text;
      this.waveBannerEl.classList.remove('hidden');
      setTimeout(() => {
        this.waveBannerEl.classList.add('hidden');
      }, 1900);
    }
  }

  showVictory(score, wins, coins) {
    this.saveHighScore(score);
    const vicWinsEl = document.getElementById('victory-wins');
    const vicScoreEl = document.getElementById('victory-score');
    const vicCoinsEl = document.getElementById('victory-coins');

    if (vicWinsEl) vicWinsEl.textContent = wins.toString();
    if (vicScoreEl) vicScoreEl.textContent = score.toString();
    if (vicCoinsEl) vicCoinsEl.textContent = `🪙 ${coins}`;

    const vicScreen = document.getElementById('victory-screen');
    if (vicScreen) vicScreen.classList.remove('hidden');
  }

  update(game) {
    const { score, wave, combo, scrapCollected } = game;
    const player = game.player;

    if (this.scoreValEl) this.scoreValEl.textContent = this.padScore(score);
    if (this.scrapValEl) this.scrapValEl.textContent = `🪙 ${scrapCollected}`;
    if (this.waveValEl) this.waveValEl.textContent = wave.toString();
    if (this.winsValEl) this.winsValEl.textContent = `🏆 ${game.shop.wins}`;
    if (this.biomeBadgeEl) this.biomeBadgeEl.textContent = game.starfield.getCurrentBiomeName();

    // Bars
    const healthPercent = Math.max(0, Math.min(100, Math.round((player.health / player.maxHealth) * 100)));
    if (this.healthBarInner) this.healthBarInner.style.width = `${healthPercent}%`;
    if (this.healthText) this.healthText.textContent = `${healthPercent}%`;

    const shieldPercent = Math.max(0, Math.min(100, Math.round((player.shield / player.maxShield) * 100)));
    if (this.shieldBarInner) this.shieldBarInner.style.width = `${shieldPercent}%`;
    if (this.shieldText) this.shieldText.textContent = `${shieldPercent}%`;

    const heatPercent = Math.max(0, Math.min(100, Math.round((player.weapons.heat / player.weapons.maxHeat) * 100)));
    if (this.heatBarInner) {
      this.heatBarInner.style.width = `${heatPercent}%`;
      if (player.weapons.isOverheated) {
        this.heatBarInner.style.background = '#ff0055';
      } else {
        this.heatBarInner.style.background = 'linear-gradient(90deg, #ffea00, #ff0055)';
      }
    }
    if (this.heatText) this.heatText.textContent = player.weapons.isOverheated ? 'JAMMED!' : `${heatPercent}%`;

    // Boss Top Health Bar Overlay
    const boss = game.enemies.find(e => e.type === 'boss' && e.active);
    if (boss && this.bossBarContainer && this.bossBarInner) {
      this.bossBarContainer.classList.remove('hidden');
      const bossHpPercent = Math.max(0, Math.min(100, Math.round((boss.health / boss.maxHealth) * 100)));
      this.bossBarInner.style.width = `${bossHpPercent}%`;
    } else if (this.bossBarContainer) {
      this.bossBarContainer.classList.add('hidden');
    }

    // Damage Vignette (<25% HP)
    if (this.damageVignette) {
      if (healthPercent < 25 && healthPercent > 0) {
        this.damageVignette.classList.remove('hidden');
      } else {
        this.damageVignette.classList.add('hidden');
      }
    }

    // Combo Badge
    if (combo > 1) {
      if (this.comboBadge) this.comboBadge.classList.remove('hidden');
      if (this.comboValEl) this.comboValEl.textContent = combo.toString();
    } else {
      if (this.comboBadge) this.comboBadge.classList.add('hidden');
    }

    if (this.dashBadge) {
      if (player.dashCooldown === 0) {
        this.dashBadge.classList.add('ready');
        this.dashBadge.textContent = 'DASH [SHIFT]';
      } else {
        this.dashBadge.classList.remove('ready');
        this.dashBadge.textContent = 'DASH COOLDOWN';
      }
    }

    if (this.chronoMeterFill) {
      const chronoPercent = Math.round((game.chronoMeter / game.maxChronoMeter) * 100);
      this.chronoMeterFill.style.width = `${chronoPercent}%`;
    }

    // Bottom-Right Weapon Badge Display
    if (this.weaponBadge) {
      let modeText = 'DUAL LASER';
      if (player.weapons.mode === 'triple' || player.weapons.mode === 'spread') {
        modeText = 'SPREAD SHOT';
      } else if (player.weapons.mode === 'railgun' || player.weapons.mode === 'rail') {
        modeText = 'PLASMA RAIL';
      } else {
        modeText = player.weapons.mode.toUpperCase();
      }
      this.weaponBadge.textContent = modeText;
    }

    if (this.bombCountEl) this.bombCountEl.textContent = player.bombs.toString();

    this.renderRadar(game);
  }

  renderRadar(game) {
    if (!this.radarCtx || !this.radarCanvas) return;

    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const scaleX = w / game.canvas.width;
    const scaleY = h / game.canvas.height;

    this.radarCtx.fillStyle = 'rgba(2, 6, 18, 0.9)';
    this.radarCtx.fillRect(0, 0, w, h);

    this.radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    this.radarCtx.lineWidth = 1;
    this.radarCtx.beginPath();
    this.radarCtx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    this.radarCtx.stroke();

    this.radarCtx.fillStyle = '#00ff66';
    this.radarCtx.beginPath();
    this.radarCtx.arc(game.player.x * scaleX, game.player.y * scaleY, 3, 0, Math.PI * 2);
    this.radarCtx.fill();

    game.enemies.forEach(e => {
      if (!e.active) return;
      this.radarCtx.fillStyle = e.type === 'boss' ? '#ff0055' : (e.type === 'shield_bearer' ? '#ffea00' : '#ff0077');
      const size = e.type === 'boss' ? 5 : 2.5;
      this.radarCtx.beginPath();
      this.radarCtx.arc(e.x * scaleX, e.y * scaleY, size, 0, Math.PI * 2);
      this.radarCtx.fill();
    });

    game.hazards.forEach(hz => {
      if (!hz.active) return;
      this.radarCtx.fillStyle = '#8c6d58';
      this.radarCtx.beginPath();
      this.radarCtx.arc(hz.x * scaleX, hz.y * scaleY, 2, 0, Math.PI * 2);
      this.radarCtx.fill();
    });
  }

  showGameOver(score, wave, scrapCollected) {
    const isNewHigh = this.saveHighScore(score);

    const finalScoreEl = document.getElementById('final-score');
    const finalWaveEl = document.getElementById('final-wave');
    const finalScrapEl = document.getElementById('final-scrap');
    const newHighBanner = document.getElementById('new-high-score-banner');

    if (finalScoreEl) finalScoreEl.textContent = score.toString();
    if (finalWaveEl) finalWaveEl.textContent = wave.toString();
    if (finalScrapEl) finalScrapEl.textContent = `🪙 ${scrapCollected}`;

    if (newHighBanner) {
      if (isNewHigh) newHighBanner.classList.remove('hidden');
      else newHighBanner.classList.add('hidden');
    }
  }
}
