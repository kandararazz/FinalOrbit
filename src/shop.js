// Hangar Shop, Coin Economy, & Ship Avatars for FinalOrbit

export class ShopManager {
  constructor() {
    this.scrap = this.loadScrap(); // Coin Balance
    this.wins = this.loadWins(); // Total Wins
    this.upgrades = this.loadUpgrades();
    this.equippedAvatar = this.loadAvatar();

    this.costs = {
      armor: [100, 250, 500],
      shieldRecovery: [150, 300, 600],
      magnet: [100, 200, 400]
    };

    this.avatarCosts = {
      apex_viper: 0,
      venom_phantom: 250,
      crimson_apex: 600,
      void_phantom: 500,
      aegis_titan: 1000
    };

    this.setupUI();
    this.updateUI();
  }

  loadWins() {
    try {
      const saved = localStorage.getItem('spaceShooter_wins') || localStorage.getItem('final_orbit_wins');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  saveWins() {
    try {
      localStorage.setItem('spaceShooter_wins', this.wins.toString());
      localStorage.setItem('final_orbit_wins', this.wins.toString());
    } catch (e) {}
    this.updateUI();
  }

  addWin(count = 1) {
    this.wins += count;
    this.saveWins();
  }

  loadScrap() {
    try {
      const saved = localStorage.getItem('spaceShooter_coins') || localStorage.getItem('final_orbit_scrap');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  saveScrap() {
    try {
      localStorage.setItem('spaceShooter_coins', this.scrap.toString());
      localStorage.setItem('final_orbit_scrap', this.scrap.toString());
    } catch (e) {}
    this.updateUI();
  }

  addScrap(amount) {
    this.scrap += amount;
    this.saveScrap();
  }

  loadUpgrades() {
    try {
      const saved = localStorage.getItem('final_orbit_upgrades');
      return saved ? JSON.parse(saved) : { armor: 1, shieldRecovery: 1, magnet: 1, speed: 1, rate: 1, purchasedAvatars: ['apex_viper'], avatar: 'apex_viper' };
    } catch (e) {
      return { armor: 1, shieldRecovery: 1, magnet: 1, speed: 1, rate: 1, purchasedAvatars: ['apex_viper'], avatar: 'apex_viper' };
    }
  }

  saveUpgrades() {
    try {
      localStorage.setItem('spaceShooter_avatar', this.equippedAvatar);
      localStorage.setItem('final_orbit_upgrades', JSON.stringify(this.upgrades));
    } catch (e) {}
    this.updateUI();
  }

  loadAvatar() {
    const saved = localStorage.getItem('spaceShooter_avatar');
    if (saved) return saved;
    return this.upgrades.avatar || 'apex_viper';
  }

  buyUpgrade(type) {
    const currentLvl = this.upgrades[type] || 1;
    if (currentLvl >= 3) return false; // Max tier for statutory upgrades

    const costList = this.costs[type] || [100, 200, 300];
    const cost = costList[currentLvl - 1];
    if (this.scrap >= cost) {
      this.scrap -= cost;
      this.upgrades[type] = currentLvl + 1;
      this.saveScrap();
      this.saveUpgrades();
      return true;
    }
    return false;
  }

  buyOrEquipAvatar(avatarId) {
    if (!this.upgrades.purchasedAvatars) {
      this.upgrades.purchasedAvatars = ['apex_viper'];
    }

    if (this.upgrades.purchasedAvatars.includes(avatarId)) {
      // Already owned -> Equip avatar!
      this.upgrades.avatar = avatarId;
      this.equippedAvatar = avatarId;
      this.saveUpgrades();
      return true;
    } else {
      // Purchase avatar
      const cost = this.avatarCosts[avatarId] || 250;
      if (this.scrap >= cost) {
        this.scrap -= cost;
        this.upgrades.purchasedAvatars.push(avatarId);
        this.upgrades.avatar = avatarId;
        this.equippedAvatar = avatarId;
        this.saveScrap();
        this.saveUpgrades();
        return true;
      }
    }
    return false;
  }

  setupUI() {
    ['armor', 'shieldRecovery', 'magnet'].forEach(type => {
      const btn = document.getElementById(`buy-${type}-btn`);
      if (btn) {
        btn.addEventListener('click', () => this.buyUpgrade(type));
      }
    });

    ['apex_viper', 'venom_phantom', 'crimson_apex', 'void_phantom', 'aegis_titan'].forEach(avatarId => {
      const btn = document.getElementById(`select-avatar-${avatarId}`);
      if (btn) {
        btn.addEventListener('click', () => this.buyOrEquipAvatar(avatarId));
      }
    });

    // Tab Switchers
    const tab1Btn = document.getElementById('shop-tab-1');
    const tab2Btn = document.getElementById('shop-tab-2');
    const panel1 = document.getElementById('shop-panel-1');
    const panel2 = document.getElementById('shop-panel-2');

    if (tab1Btn && tab2Btn && panel1 && panel2) {
      tab1Btn.addEventListener('click', () => {
        tab1Btn.classList.add('active');
        tab2Btn.classList.remove('active');
        panel1.classList.remove('hidden');
        panel2.classList.add('hidden');
      });
      tab2Btn.addEventListener('click', () => {
        tab2Btn.classList.add('active');
        tab1Btn.classList.remove('active');
        panel2.classList.remove('hidden');
        panel1.classList.add('hidden');
      });
    }
  }

  updateUI() {
    const startScrapEl = document.getElementById('start-scrap');
    const shopScrapEl = document.getElementById('shop-scrap-balance');
    const winsValEl = document.getElementById('wins-val');
    const startWinsEl = document.getElementById('start-wins');

    if (startScrapEl) startScrapEl.textContent = `🪙 ${this.scrap}`;
    if (shopScrapEl) shopScrapEl.textContent = `🪙 ${this.scrap}`;
    if (winsValEl) winsValEl.textContent = `🏆 ${this.wins}`;
    if (startWinsEl) startWinsEl.textContent = `🏆 ${this.wins}`;

    // Stat Upgrades
    ['armor', 'shieldRecovery', 'magnet'].forEach(type => {
      const lvl = this.upgrades[type] || 1;
      const lvlEl = document.getElementById(`lvl-${type}`);
      const costEl = document.getElementById(`cost-${type}`);
      const btn = document.getElementById(`buy-${type}-btn`);

      if (lvlEl) lvlEl.textContent = lvl.toString();

      if (lvl >= 3) {
        if (costEl) costEl.textContent = 'MAX';
        if (btn) btn.disabled = true;
      } else {
        const costList = this.costs[type] || [100, 200, 300];
        const cost = costList[lvl - 1];
        if (costEl) costEl.textContent = cost.toString();
        if (btn) btn.disabled = this.scrap < cost;
      }
    });

    // Avatars
    if (!this.upgrades.purchasedAvatars) this.upgrades.purchasedAvatars = ['apex_viper'];
    const equipped = this.equippedAvatar || this.upgrades.avatar || 'apex_viper';

    ['apex_viper', 'venom_phantom', 'crimson_apex', 'void_phantom', 'aegis_titan'].forEach(avatarId => {
      const btn = document.getElementById(`select-avatar-${avatarId}`);
      if (btn) {
        if (equipped === avatarId) {
          btn.textContent = 'EQUIPPED';
          btn.disabled = true;
          btn.className = 'buy-btn equipped-btn';
        } else if (this.upgrades.purchasedAvatars.includes(avatarId)) {
          btn.textContent = 'EQUIP';
          btn.disabled = false;
          btn.className = 'buy-btn';
        } else {
          const cost = this.avatarCosts[avatarId] || 250;
          btn.textContent = `UNLOCK (${cost} COINS)`;
          btn.disabled = this.scrap < cost;
          btn.className = 'buy-btn';
        }
      }
    });
  }
}
