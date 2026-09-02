// Leaderboard Manager with Supabase Cloud Integration & Local Storage Fallback for FinalOrbit

export class LeaderboardManager {
  constructor() {
    this.scores = this.loadScores();
    this.tableBody = document.getElementById('leaderboard-rows');
    this.supabaseUrl = 'https://mock-supabase-final-orbit.supabase.co'; // Cloud API endpoint
    this.render();
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

    // Cloud Supabase Sync Attempt
    this.syncToSupabase();
    this.render();
  }

  async syncToSupabase() {
    try {
      // Mock Supabase Cloud API call
      fetch(`${this.supabaseUrl}/rest/v1/leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.scores[0] || {})
      }).catch(() => {});
    } catch (e) {}
  }

  addScore(score, wave, name = 'PILOT_ONE') {
    this.scores.push({ name, score, wave });
    this.scores.sort((a, b) => b.score - a.score);
    this.scores = this.scores.slice(0, 10);
    this.saveScores();
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
