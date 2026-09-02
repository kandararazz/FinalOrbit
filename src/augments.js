// End-of-Wave Roguelike Perks & Endless Mode Augments Manager for FinalOrbit

export const ALL_PERKS = [
  { id: 'hyperDrive', title: 'Hyper Drive', desc: '+15% Ship Movement Speed.', icon: '⚡' },
  { id: 'overchargedCoils', title: 'Overcharged Coils', desc: 'Bullets pierce through 1 additional enemy.', icon: '🔮' },
  { id: 'reactiveShield', title: 'Reactive Shield', desc: 'Shield recharge delay reduced from 4s to 2s.', icon: '🛡️' },
  { id: 'giantLasers', title: 'Giant Lasers', desc: '+20% Bullet size & wider impact zone.', icon: '💥' },
  { id: 'explosiveBullets', title: 'Explosive Bullets', desc: 'Laser hits trigger explosive shrapnel bursts.', icon: '💣' },
  { id: 'extraLife', title: 'Emergency Revive', desc: 'Restore 50% Health upon fatal crash (1 Extra Life).', icon: '❤️' },
  { id: 'scrapMagnate', title: 'Scrap Magnate', desc: 'Doubles all dropped Golden Coins.', icon: '🪙' }
];

export class AugmentManager {
  constructor(onSelectCallback) {
    this.onSelectCallback = onSelectCallback;
    this.activePerks = {};
    this.perkScreenEl = document.getElementById('perk-screen');
    this.perkContainerEl = document.getElementById('perk-cards-container');
  }

  reset() {
    this.activePerks = {};
  }

  triggerPerkDraft() {
    const shuffled = [...ALL_PERKS].sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(0, 3);
    this.renderCards(choices);
    if (this.perkScreenEl) this.perkScreenEl.classList.remove('hidden');
  }

  renderCards(choices) {
    if (!this.perkContainerEl) return;
    this.perkContainerEl.innerHTML = '';

    choices.forEach(perk => {
      const card = document.createElement('div');
      card.className = 'perk-card';
      card.innerHTML = `
        <div class="perk-icon">${perk.icon}</div>
        <div class="perk-title">${perk.title}</div>
        <div class="perk-desc">${perk.desc}</div>
      `;

      card.addEventListener('click', () => {
        this.selectPerk(perk);
      });

      this.perkContainerEl.appendChild(card);
    });
  }

  selectPerk(perk) {
    this.activePerks[perk.id] = (this.activePerks[perk.id] || 0) + 1;
    if (this.perkScreenEl) this.perkScreenEl.classList.add('hidden');
    if (this.onSelectCallback) this.onSelectCallback(perk);
  }
}
