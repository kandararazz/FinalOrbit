// Leaderboard Manager with Supabase Cloud Integration & Local Storage Fallback for FinalOrbit

const LEADERBOARD_KEY = 'space_shooter_leaderboard';
const CALLSIGN_KEY = 'void_pilot_callsign';
const MAX_ENTRIES = 10;

const DEFAULT_SCORES = [
  { name: 'VIPER_01', score: 25000, wave: 18 },
  { name: 'CYBER_ACE', score: 18400, wave: 14 },
  { name: 'STAR_LORD', score: 12000, wave: 10 },
  { name: 'NOVA_X', score: 8500, wave: 7 },
  { name: 'ROOKIE', score: 3200, wave: 3 }
];

export function sanitizeCallsign(name) {
  if (!name || typeof name !== 'string') return 'RAZA';
  const clean = name.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase().slice(0, 10);
  return clean || 'RAZA';
}

export function getPilotCallsign() {
  try {
    const saved = localStorage.getItem(CALLSIGN_KEY);
    if (saved && saved.trim()) return sanitizeCallsign(saved);
  } catch (e) {}
  return 'RAZA';
}

export function setPilotCallsign(name) {
  const clean = sanitizeCallsign(name);
  try {
    localStorage.setItem(CALLSIGN_KEY, clean);
  } catch (e) {}
  return clean;
}

export class LeaderboardManager {
  constructor() {
    this.tableBody = document.getElementById('leaderboard-rows');
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    this.pilotName = getPilotCallsign();
    this.scores = this.loadScores();
    this.setupInputListeners();
    this.render();
    this.fetchFromSupabase();
  }

  loadPilotName() {
    return getPilotCallsign();
  }

  setPilotName(name, activeElement = null) {
    const clean = setPilotCallsign(name);
    this.pilotName = clean;
    this.syncInputFields(activeElement);
    return clean;
  }

  syncInputFields(activeElement = null) {
    const currentName = getPilotCallsign();
    ['pilot-callsign-input', 'gameover-callsign-input', 'leaderboard-callsign-input', 'input-pilot-name'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el !== activeElement && el !== document.activeElement) {
        if (el.value !== currentName) {
          el.value = currentName;
        }
      }
    });

    ['callsign-display-start', 'callsign-display-pause'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = currentName;
    });
  }

  setupInputListeners() {
    const bindInput = (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = getPilotCallsign();
      el.addEventListener('focus', () => {
        el.select();
      });
      el.addEventListener('input', (e) => {
        const sanitized = sanitizeCallsign(e.target.value);
        this.setPilotName(sanitized, e.target);
      });
      el.addEventListener('change', (e) => {
        const sanitized = sanitizeCallsign(e.target.value);
        this.setPilotName(sanitized, e.target);
      });
    };

    bindInput('pilot-callsign-input');
    bindInput('gameover-callsign-input');
    bindInput('leaderboard-callsign-input');

    const saveBtn = document.getElementById('save-callsign-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const el = document.getElementById('leaderboard-callsign-input');
        if (el) {
          this.setPilotName(el.value);
          saveBtn.textContent = 'SAVED!';
          setTimeout(() => { saveBtn.textContent = 'SAVE'; }, 1500);
        }
      });
    }

    this.syncInputFields();
  }

  loadScores() {
    try {
      const data = localStorage.getItem(LEADERBOARD_KEY) || localStorage.getItem('final_orbit_leaderboard');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    return [...DEFAULT_SCORES];
  }

  saveScores() {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(this.scores));
      localStorage.setItem('final_orbit_leaderboard', JSON.stringify(this.scores));
    } catch (e) {}
    this.render();
  }

  async fetchFromSupabase() {
    if (!this.supabaseUrl || !this.supabaseAnonKey) return;

    try {
      const res = await fetch(`${this.supabaseUrl}/rest/v1/leaderboard?select=*&order=score.desc&limit=${MAX_ENTRIES}`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseAnonKey,
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.scores = data.map(item => ({
            name: sanitizeCallsign(item.callsign || item.pilot_name || item.name || 'RAZA'),
            score: Number(item.score) || 0,
            wave: Number(item.wave_reached || item.wave) || 1
          }));
          this.saveScores();
        }
      }
    } catch (e) {
      console.warn('Supabase fetch fallback:', e);
    }
  }

  async syncToSupabase(entry) {
    if (!this.supabaseUrl || !this.supabaseAnonKey) return;

    try {
      const wins = parseInt(localStorage.getItem('void_pilot_wins') || '0', 10);
      await fetch(`${this.supabaseUrl}/rest/v1/leaderboard`, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseAnonKey,
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          callsign: entry.name,
          score: entry.score,
          wave_reached: entry.wave,
          wins: wins
        })
      });
    } catch (e) {
      console.warn('Supabase sync error:', e);
    }
  }

  addScore(score, wave, pilotName) {
    const cleanName = sanitizeCallsign(pilotName || getPilotCallsign());
    const newEntry = {
      name: cleanName,
      score: Number(score) || 0,
      wave: Number(wave) || 1
    };

    this.scores.push(newEntry);
    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, MAX_ENTRIES);

    this.saveScores();
    this.syncToSupabase(newEntry);
  }

  clearScores() {
    this.scores = [...DEFAULT_SCORES];
    localStorage.removeItem(LEADERBOARD_KEY);
    localStorage.removeItem('final_orbit_leaderboard');
    this.render();
  }

  render() {
    if (!this.tableBody) return;
    this.tableBody.innerHTML = '';

    this.scores.forEach((entry, index) => {
      const tr = document.createElement('tr');
      if (index === 0) tr.className = 'rank-1';
      else if (index === 1) tr.className = 'rank-2';
      else if (index === 2) tr.className = 'rank-3';

      tr.innerHTML = `
        <td>#${index + 1}</td>
        <td>${entry.name}</td>
        <td class="gold-text">${entry.score.toLocaleString()}</td>
        <td>W${entry.wave}</td>
      `;
      this.tableBody.appendChild(tr);
    });
  }
}

export function getPilotProgress() {
  let xp = 0;
  try {
    const saved = localStorage.getItem('void_pilot_xp');
    if (saved) xp = parseInt(saved, 10) || 0;
  } catch (e) {}

  const level = Math.max(1, 1 + Math.floor(Math.sqrt(xp / 100)));

  let rankTitle = 'Space Cadet';
  let thrusterColor = '#00f0ff';

  if (level >= 50) {
    rankTitle = 'Galaxy Vanguard';
    thrusterColor = '#39ff14';
  } else if (level >= 25) {
    rankTitle = 'Void Stalker';
    thrusterColor = '#ffea00';
  } else if (level >= 10) {
    rankTitle = 'Sector Enforcer';
    thrusterColor = '#a000ff';
  }

  return { xp, level, rankTitle, thrusterColor };
}

export function addPilotXP(amount) {
  try {
    const current = getPilotProgress().xp;
    const updated = current + amount;
    localStorage.setItem('void_pilot_xp', updated.toString());
    return getPilotProgress();
  } catch (e) {}
  return getPilotProgress();
}
