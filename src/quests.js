// Daily Quests, 24h Bounties & Pilot Badges for FinalOrbit

export const PILOT_BADGES = [
  { id: 'rookie', title: 'ROOKIE PILOT', desc: 'Clear Wave 1', icon: '🐣', condition: (stats) => stats.maxWave >= 1 },
  { id: 'stinger_hunter', title: 'STINGER HUNTER', desc: 'Defeat 25 Kamikaze Stingers', icon: '🐝', condition: (stats) => stats.stingerKills >= 25 },
  { id: 'asteroid_shatterer', title: 'ASTEROID CRUSHER', desc: 'Shatter 30 Magma Asteroids', icon: '☄️', condition: (stats) => stats.asteroidsShattered >= 30 },
  { id: 'dreadnought_slayer', title: 'DREADNOUGHT SLAYER', desc: 'Defeat 3 Dreadnought Bosses', icon: '💀', condition: (stats) => stats.bossKills >= 3 },
  { id: 'void_master', title: 'VOID MASTER', desc: 'Reach Wave 30 or Endless Mode', icon: '🌌', condition: (stats) => stats.maxWave >= 30 }
];

export const BOUNTY_POOL = [
  { id: 'shatter_asteroids', desc: 'Shatter 15 Magma Asteroids', target: 15, rewardType: 'coins', rewardAmount: 150, event: 'asteroid_shatter' },
  { id: 'survive_no_bomb', desc: 'Survive to Wave 15 without using a Bomb', target: 15, rewardType: 'coins', rewardAmount: 300, event: 'wave_no_bomb' },
  { id: 'defeat_stingers', desc: 'Defeat 50 Acid Stingers', target: 50, rewardType: 'wins', rewardAmount: 1, event: 'stinger_kill' },
  { id: 'slay_bosses', desc: 'Defeat 2 Dreadnought Bosses', target: 2, rewardType: 'coins', rewardAmount: 400, event: 'boss_kill' },
  { id: 'collect_coins', desc: 'Collect 100 Golden Coins', target: 100, rewardType: 'coins', rewardAmount: 200, event: 'coin_pickup' }
];

export class QuestManager {
  constructor(shopManager) {
    this.shop = shopManager;
    this.stats = this.loadStats();
    this.quests = this.loadQuests();
    this.usedBombThisRun = false;
  }

  loadStats() {
    try {
      const saved = localStorage.getItem('final_orbit_pilot_stats');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return {
      maxWave: 1,
      stingerKills: 0,
      asteroidsShattered: 0,
      bossKills: 0,
      coinsCollected: 0
    };
  }

  saveStats() {
    try {
      localStorage.setItem('final_orbit_pilot_stats', JSON.stringify(this.stats));
    } catch (e) {}
  }

  loadQuests() {
    try {
      const resetTime = localStorage.getItem('final_orbit_quest_reset');
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;

      if (!resetTime || now - parseInt(resetTime, 10) > ONE_DAY) {
        return this.generateNewDailyQuests();
      }

      const saved = localStorage.getItem('final_orbit_daily_quests');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return this.generateNewDailyQuests();
  }

  generateNewDailyQuests() {
    const shuffled = [...BOUNTY_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3).map(b => ({
      ...b,
      progress: 0,
      claimed: false
    }));

    try {
      localStorage.setItem('final_orbit_quest_reset', Date.now().toString());
      localStorage.setItem('final_orbit_daily_quests', JSON.stringify(selected));
    } catch (e) {}

    return selected;
  }

  saveQuests() {
    try {
      localStorage.setItem('final_orbit_daily_quests', JSON.stringify(this.quests));
    } catch (e) {}
  }

  resetRunTracker() {
    this.usedBombThisRun = false;
  }

  trackEvent(event, amount = 1, currentWave = 1) {
    let changed = false;

    if (event === 'bomb_used') {
      this.usedBombThisRun = true;
    }

    if (event === 'asteroid_shatter') {
      this.stats.asteroidsShattered += amount;
      changed = true;
    } else if (event === 'stinger_kill') {
      this.stats.stingerKills += amount;
      changed = true;
    } else if (event === 'boss_kill') {
      this.stats.bossKills += amount;
      changed = true;
    } else if (event === 'coin_pickup') {
      this.stats.coinsCollected += amount;
      changed = true;
    }

    if (currentWave > this.stats.maxWave) {
      this.stats.maxWave = currentWave;
      changed = true;
    }

    if (changed) this.saveStats();

    // Progress active daily bounties
    this.quests.forEach(q => {
      if (q.claimed) return;

      if (q.event === 'wave_no_bomb' && event === 'wave_clear') {
        if (!this.usedBombThisRun && currentWave <= 15) {
          q.progress = Math.min(q.target, currentWave);
          this.saveQuests();
        }
      } else if (q.event === event) {
        q.progress = Math.min(q.target, q.progress + amount);
        this.saveQuests();
      }
    });
  }

  claimReward(questId) {
    const q = this.quests.find(item => item.id === questId);
    if (!q || q.claimed || q.progress < q.target) return false;

    q.claimed = true;
    this.saveQuests();

    if (q.rewardType === 'coins') {
      this.shop.addScrap(q.rewardAmount);
      this.shop.saveCoins();
    } else if (q.rewardType === 'wins') {
      this.shop.addWin(q.rewardAmount);
    }

    return true;
  }

  getUnlockedBadges() {
    return PILOT_BADGES.map(badge => ({
      ...badge,
      unlocked: badge.condition(this.stats)
    }));
  }

  renderUI() {
    const container = document.getElementById('quests-list-container');
    if (!container) return;

    container.innerHTML = '';

    this.quests.forEach(q => {
      const isComplete = q.progress >= q.target;
      const div = document.createElement('div');
      div.className = `quest-card ${q.claimed ? 'claimed' : isComplete ? 'ready' : ''}`;
      
      div.innerHTML = `
        <div class="quest-info">
          <h4>${q.desc}</h4>
          <div class="quest-progress-bar">
            <div class="quest-progress-fill" style="width: ${Math.min(100, Math.round((q.progress / q.target) * 100))}%;"></div>
          </div>
          <span class="quest-progress-text">${q.progress} / ${q.target}</span>
        </div>
        <div class="quest-reward">
          <span class="reward-pill">${q.rewardType === 'coins' ? `🪙 ${q.rewardAmount}` : `🏆 +${q.rewardAmount} WIN`}</span>
          ${q.claimed 
            ? '<button class="claim-btn disabled">CLAIMED</button>' 
            : isComplete 
              ? `<button class="claim-btn active" data-id="${q.id}">CLAIM</button>` 
              : '<button class="claim-btn disabled">IN PROGRESS</button>'
          }
        </div>
      `;
      container.appendChild(div);
    });

    // Bind claim buttons
    container.querySelectorAll('.claim-btn.active').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const questId = e.target.getAttribute('data-id');
        if (this.claimReward(questId)) {
          this.renderUI();
        }
      });
    });

    // Render Badges
    const badgeContainer = document.getElementById('badges-list-container');
    if (badgeContainer) {
      badgeContainer.innerHTML = '';
      const badges = this.getUnlockedBadges();
      badges.forEach(b => {
        const card = document.createElement('div');
        card.className = `badge-card ${b.unlocked ? 'unlocked' : 'locked'}`;
        card.innerHTML = `
          <div class="badge-icon">${b.icon}</div>
          <div class="badge-details">
            <div class="badge-title">${b.title}</div>
            <div class="badge-desc">${b.desc}</div>
          </div>
          <span class="badge-status">${b.unlocked ? 'UNLOCKED' : 'LOCKED'}</span>
        `;
        badgeContainer.appendChild(card);
      });
    }
  }
}
