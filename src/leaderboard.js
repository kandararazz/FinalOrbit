// Leaderboard Manager with Supabase Cloud Integration & Local Storage Fallback for FinalOrbit

export class LeaderboardManager {
  constructor() {
    this.tableBody = document.getElementById('leaderboard-rows');
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
    this.supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    this.scores = this.loadScores();
    this.render();
    this.fetchFromSupabase();
  }

  loadScores() {
    try {
      const saved = localStorage.getItem('final_orbit_leaderboard');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    return [
      { name: 'PILOT_CYPHER', score: 124500, wave: 18 },
      { name: 'NOVA_STRIKER', score: 98200, wave: 15 },
      { name: 'ORBIT_ZERO', score: 76400, wave: 12 },
      { name: 'ACE_PHANTOM', score: 54100, wave: 9 },
      { name: 'VORTEX_99', score: 32000, wave: 6 }
    ];
  }

  saveScores() {
    try {
      localStorage.setItem('final_orbit_leaderboard', JSON.stringify(this.scores));
    } catch (e) {}
    this.render();
  }

  async fetchFromSupabase() {
    if (!this.supabaseUrl || !this.supabaseAnonKey) return;

    try {
      const res = await fetch(`${this.supabaseUrl}/rest/v1/leaderboard?select=name,score,wave&order=score.desc&limit=10`, {
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
          this.scores = data;
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
        body: JSON.stringify(entry)
      });
    } catch (e) {
      console.warn('Supabase sync error:', e);
    }
  }

  addScore(score, wave, name = 'PILOT_RAZA') {
    const entry = { name, score, wave };
    this.scores.push(entry);
    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, 10);

    this.saveScores();
    this.syncToSupabase(entry);
  }

  render() {
    if (!this.tableBody) return;
    this.tableBody.innerHTML = '';

    this.scores.forEach((entry, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>#${idx + 1}</td>
        <td>${entry.name}</td>
        <td class="gold-text">${entry.score.toLocaleString()}</td>
        <td>WAVE ${entry.wave}</td>
      `;
      this.tableBody.appendChild(tr);
    });
  }
}
