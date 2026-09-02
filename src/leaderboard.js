// Leaderboard Manager with Supabase Cloud Integration & Local Storage Fallback for FinalOrbit

const LEADERBOARD_KEY = 'space_shooter_leaderboard';
const MAX_ENTRIES = 10;

const DEFAULT_SCORES = [
  { name: 'VIPER_01', score: 25000, wave: 18 },
  { name: 'CYBER_ACE', score: 18400, wave: 14 },
  { name: 'STAR_LORD', score: 12000, wave: 10 },
  { name: 'NOVA_X', score: 8500, wave: 7 },
  { name: 'ROOKIE', score: 3200, wave: 3 }
];

export class LeaderboardManager {
  constructor() {
    this.tableBody = document.getElementById('leaderboard-rows');
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    this.scores = this.loadScores();
    this.render();
    this.fetchFromSupabase();
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
      const res = await fetch(`${this.supabaseUrl}/rest/v1/leaderboard?select=pilot_name,score,wave&order=score.desc&limit=${MAX_ENTRIES}`, {
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
            name: (item.pilot_name || item.name || 'PILOT').toUpperCase().slice(0, 10),
            score: Number(item.score) || 0,
            wave: Number(item.wave) || 1
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
      await fetch(`${this.supabaseUrl}/rest/v1/leaderboard`, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseAnonKey,
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          pilot_name: entry.name,
          score: entry.score,
          wave: entry.wave
        })
      });
    } catch (e) {
      console.warn('Supabase sync error:', e);
    }
  }

  addScore(score, wave, pilotName = 'PILOT_RAZA') {
    const newEntry = {
      name: (pilotName || 'PILOT').toUpperCase().slice(0, 10),
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
