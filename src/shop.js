// Hangar Shop, Coin Economy, & Ship Avatars for FinalOrbit

export class ShopManager {
  constructor() {
    this.scrap = this.loadCoins(); // Coin Balance
    this.wins = this.loadWins(); // Total Wins
    this.upgrades = this.loadUpgrades();
    this.equippedAvatar = this.loadEquippedAvatar();

    this.costs = {
      armor: [100, 250, 500],
      shieldRecovery: [150, 300, 600],
      magnet: [100, 200, 400]
    };

    this.avatarCosts = {
      viper: 0,
      apex_viper: 0,
      venom: 250,
      venom_dart: 250,
      venom_phantom: 250,
      crimson: 600,
      crimson_titan: 600,
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

  loadCoins() {
    try {
      const saved = localStorage.getItem('playerCoins') || localStorage.getItem('spaceShooter_coins') || localStorage.getItem('final_orbit_scrap');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  }

  saveCoins() {
    try {
      localStorage.setItem('playerCoins', this.scrap.toString());
      localStorage.setItem('spaceShooter_coins', this.scrap.toString());
      localStorage.setItem('final_orbit_scrap', this.scrap.toString());
    } catch (e) {}
    this.updateUI();
  }

  addScrap(amount) {
    this.scrap += amount;
  }

  loadUnlockedAvatars() {
    try {
      const saved = localStorage.getItem('unlockedAvatars');
      if (saved) return JSON.parse(saved);
      const legacy = localStorage.getItem('final_orbit_upgrades');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed.purchasedAvatars) return parsed.purchasedAvatars;
      }
      return ['viper', 'apex_viper'];
    } catch (e) {
      return ['viper', 'apex_viper'];
    }
  }

  saveUnlockedAvatars(unlocked) {
    try {
      localStorage.setItem('unlockedAvatars', JSON.stringify(unlocked));
    } catch (e) {}
  }

  loadEquippedAvatar() {
    try {
      const saved = localStorage.getItem('equippedAvatar') || localStorage.getItem('spaceShooter_avatar');
      return saved || 'viper';
    } catch (e) {
      return 'viper';
    }
  }

  saveEquippedAvatar(avatarId) {
    try {
      localStorage.setItem('equippedAvatar', avatarId);
      localStorage.setItem('spaceShooter_avatar', avatarId);
    } catch (e) {}
  }

  loadUpgrades() {
    try {
      const saved = localStorage.getItem('final_orbit_upgrades');
      return saved ? JSON.parse(saved) : { armor: 1, shieldRecovery: 1, magnet: 1, speed: 1, rate: 1, purchasedAvatars: ['viper', 'apex_viper'], avatar: 'viper' };
    } catch (e) {
      return { armor: 1, shieldRecovery: 1, magnet: 1, speed: 1, rate: 1, purchasedAvatars: ['viper', 'apex_viper'], avatar: 'viper' };
    }
  }

  saveUpgrades() {
    try {
      this.saveEquippedAvatar(this.equippedAvatar);
      localStorage.setItem('final_orbit_upgrades', JSON.stringify(this.upgrades));
    } catch (e) {}
    this.updateUI();
  }

  buyUpgrade(type) {
    const currentLvl = this.upgrades[type] || 1;
    if (currentLvl >= 3) return false;

    const costList = this.costs[type] || [100, 200, 300];
    const cost = costList[currentLvl - 1];
    if (this.scrap >= cost) {
      this.scrap -= cost;
      this.upgrades[type] = currentLvl + 1;
      this.saveCoins();
      this.saveUpgrades();
      return true;
    }
    return false;
  }

  buyOrEquipAvatar(avatarId) {
    let unlocked = this.loadUnlockedAvatars();

    const isUnlocked = unlocked.includes(avatarId) ||
      (avatarId.includes('viper') && unlocked.some(a => a.includes('viper'))) ||
      (avatarId.includes('venom') && unlocked.some(a => a.includes('venom'))) ||
      (avatarId.includes('crimson') && unlocked.some(a => a.includes('crimson')));

    if (isUnlocked) {
      this.equippedAvatar = avatarId;
      this.saveEquippedAvatar(avatarId);
      this.updateUI();
      return true;
    } else {
      const cost = this.avatarCosts[avatarId] || 250;
      if (this.scrap >= cost) {
        this.scrap -= cost;
        this.saveCoins();
        if (!unlocked.includes(avatarId)) unlocked.push(avatarId);
        this.saveUnlockedAvatars(unlocked);
        this.equippedAvatar = avatarId;
        this.saveEquippedAvatar(avatarId);
        this.updateUI();
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

    ['viper', 'apex_viper', 'venom', 'venom_dart', 'venom_phantom', 'crimson', 'crimson_titan', 'crimson_apex', 'void_phantom', 'aegis_titan'].forEach(avatarId => {
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

  renderHangarGrid() {
    const grid = document.getElementById('hangar-grid');
    if (!grid) return;

    const unlocked = this.loadUnlockedAvatars();
    const equipped = this.equippedAvatar || this.loadEquippedAvatar();

    const ships = [
      { id: 'viper', name: 'VIPER INTERCEPTOR', color: '#00f0ff', desc: 'Sleek cyan delta wings with twin plasma thrusters.', cost: 0, icon: '🛸' },
      { id: 'venom_dart', name: 'VENOM DART', color: '#39ff14', desc: 'Needle hull with rear wing fins & acid thrusters.', cost: 250, icon: '🚀' },
      { id: 'crimson_titan', name: 'CRIMSON TITAN', color: '#ff0055', desc: 'Heavy split-cockpit dreadnought & dual vents.', cost: 600, icon: '🛰️' },
      { id: 'void_phantom', name: 'VOID PHANTOM', color: '#a000ff', desc: 'Purple stealth fighter with high-energy core.', cost: 500, icon: '👾' },
      { id: 'aegis_titan', name: 'AEGIS TITAN', color: '#ff5500', desc: 'Heavy solar armor hull & reinforced shields.', cost: 1000, icon: '🛡️' }
    ];

    grid.innerHTML = ships.map(ship => {
      const isOwned = unlocked.includes(ship.id) ||
        (ship.id.includes('viper') && unlocked.some(a => a.includes('viper'))) ||
        (ship.id.includes('venom') && unlocked.some(a => a.includes('venom'))) ||
        (ship.id.includes('crimson') && unlocked.some(a => a.includes('crimson')));

      const isEquipped = (equipped === ship.id) ||
        (ship.id.includes('viper') && equipped.includes('viper')) ||
        (ship.id.includes('venom') && equipped.includes('venom')) ||
        (ship.id.includes('crimson') && equipped.includes('crimson'));

      let btnClass = 'btn-neon cyan';
      let btnText = 'EQUIP';
      let disabled = false;

      if (isEquipped) {
        btnClass = 'btn-neon gold active';
        btnText = 'EQUIPPED';
        disabled = true;
      } else if (!isOwned) {
        if (this.scrap < ship.cost) {
          btnClass = 'btn-neon disabled';
          btnText = `LOCKED (${ship.cost} 🪙)`;
          disabled = true;
        } else {
          btnClass = 'btn-neon gold';
          btnText = `BUY (${ship.cost} 🪙)`;
        }
      }

      return `
        <div class="hangar-card ${isEquipped ? 'active-card' : ''}" style="border-color: ${ship.color};">
          <div class="ship-icon-preview" style="text-shadow: 0 0 15px ${ship.color};">${ship.icon}</div>
          <h3 class="ship-title" style="color: ${ship.color};">${ship.name}</h3>
          <p class="ship-desc">${ship.desc}</p>
          <button data-avatar-id="${ship.id}" class="grid-equip-btn ${btnClass}" ${disabled ? 'disabled' : ''}>
            ${btnText}
          </button>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.grid-equip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const avatarId = e.currentTarget.getAttribute('data-avatar-id');
        if (avatarId) {
          this.buyOrEquipAvatar(avatarId);
          this.renderHangarGrid();
        }
      });
    });
  }

  updateUI() {
    const startScrapEl = document.getElementById('start-scrap');
    const shopScrapEl = document.getElementById('shop-scrap-balance');
    const hangarCoinsEl = document.getElementById('hangar-coins');
    const winsValEl = document.getElementById('wins-val');
    const startWinsEl = document.getElementById('start-wins');

    if (startScrapEl) startScrapEl.textContent = `🪙 ${this.scrap}`;
    if (shopScrapEl) shopScrapEl.textContent = `🪙 ${this.scrap}`;
    if (hangarCoinsEl) hangarCoinsEl.textContent = `${this.scrap}`;
    if (winsValEl) winsValEl.textContent = `🏆 ${this.wins}`;
    if (startWinsEl) startWinsEl.textContent = `🏆 ${this.wins}`;

    this.renderHangarGrid();

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

    // Avatars State Logic
    const unlocked = this.loadUnlockedAvatars();
    const equipped = this.equippedAvatar || this.loadEquippedAvatar();

    ['viper', 'apex_viper', 'venom', 'venom_dart', 'venom_phantom', 'crimson', 'crimson_titan', 'crimson_apex', 'void_phantom', 'aegis_titan'].forEach(avatarId => {
      const btn = document.getElementById(`select-avatar-${avatarId}`);
      if (btn) {
        const card = btn.closest('.avatar-card');
        const isOwned = unlocked.includes(avatarId) ||
          (avatarId.includes('viper') && unlocked.some(a => a.includes('viper'))) ||
          (avatarId.includes('venom') && unlocked.some(a => a.includes('venom'))) ||
          (avatarId.includes('crimson') && unlocked.some(a => a.includes('crimson')));

        const isEquipped = (equipped === avatarId) ||
          (avatarId.includes('viper') && equipped.includes('viper')) ||
          (avatarId.includes('venom') && equipped.includes('venom')) ||
          (avatarId.includes('crimson') && equipped.includes('crimson'));

        if (isEquipped) {
          btn.textContent = 'EQUIPPED';
          btn.disabled = true;
          btn.className = 'buy-btn equipped-btn active-avatar';
          if (card) card.classList.add('active-avatar-card');
        } else if (isOwned) {
          btn.textContent = 'EQUIP';
          btn.disabled = false;
          btn.className = 'buy-btn owned-btn';
          if (card) card.classList.remove('active-avatar-card');
        } else {
          const cost = this.avatarCosts[avatarId] || 250;
          if (this.scrap < cost) {
            btn.textContent = `LOCKED (${cost} COINS)`;
            btn.disabled = true;
            btn.className = 'buy-btn locked-btn';
          } else {
            btn.textContent = `BUY (${cost} COINS)`;
            btn.disabled = false;
            btn.className = 'buy-btn can-buy-btn';
          }
          if (card) card.classList.remove('active-avatar-card');
        }
      }
    });
  }
}
