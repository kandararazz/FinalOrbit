// 1v1 Duel Arena Realtime Broadcast Engine for FinalOrbit
import { createClient } from '@supabase/supabase-js';
import { getPilotCallsign } from './leaderboard.js';
import { soundManager } from './audio.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export class DuelManager {
  constructor(game) {
    this.game = game;
    this.supabase = (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-project-id')) 
      ? createClient(SUPABASE_URL, SUPABASE_KEY) 
      : null;

    this.channel = null;
    this.roomCode = null;
    this.isHost = false;
    this.inMatch = false;

    this.opponentData = {
      callsign: 'RIVAL PILOT',
      x: 0,
      y: 0,
      hp: 100,
      maxHp: 100,
      shield: 100,
      maxShield: 100,
      lastUpdate: 0
    };

    this.lastBroadcast = 0;
    this.setupUI();
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  setupUI() {
    this.lobbyModal = document.getElementById('duel-lobby-modal');
    this.roomInput = document.getElementById('duel-room-code-input');
    this.statusText = document.getElementById('duel-status-text');
    this.spinner = document.getElementById('duel-spinner');
    this.opponentHud = document.getElementById('opponent-hud');

    const btnQuick = document.getElementById('btn-duel-quick');
    const btnCreate = document.getElementById('btn-duel-create');
    const btnJoin = document.getElementById('btn-duel-join');
    const btnCancel = document.getElementById('btn-duel-cancel');
    const btnClose = document.getElementById('btn-duel-close');

    if (btnQuick) btnQuick.addEventListener('click', () => this.quickMatch());
    if (btnCreate) btnCreate.addEventListener('click', () => this.createPrivateRoom());
    if (btnJoin) btnJoin.addEventListener('click', () => this.joinRoomFromInput());
    if (btnCancel) btnCancel.addEventListener('click', () => this.leaveLobby());
    if (btnClose) btnClose.addEventListener('click', () => this.closeLobbyModal());

    window.addEventListener('beforeunload', () => this.cleanup());
  }

  openLobbyModal() {
    const callsign = getPilotCallsign();
    if (!callsign || callsign === 'RAZA' && !localStorage.getItem('void_pilot_callsign')) {
      const callsignModal = document.getElementById('callsign-modal');
      if (callsignModal) {
        callsignModal.classList.remove('hidden');
        return;
      }
    }

    const display = document.getElementById('duel-callsign-display');
    if (display) display.textContent = callsign;

    if (this.lobbyModal) this.lobbyModal.classList.remove('hidden');
    this.setStatus('SELECT MATCHMAKING OPTION', false);
  }

  closeLobbyModal() {
    this.leaveLobby();
    if (this.lobbyModal) this.lobbyModal.classList.add('hidden');
  }

  setStatus(text, showSpinner = true) {
    if (this.statusText) this.statusText.textContent = text;
    if (this.spinner) {
      if (showSpinner) this.spinner.classList.remove('hidden');
      else this.spinner.classList.add('hidden');
    }
  }

  async quickMatch() {
    const callsign = getPilotCallsign();
    this.setStatus('SEARCHING FOR OPEN DUEL ROOM...', true);

    if (!this.supabase) {
      // Local fallback mock session if Supabase creds not present
      this.startMockDuel('BOT_RIVAL');
      return;
    }

    try {
      // Find open room waiting for opponent
      const { data, error } = await this.supabase
        .from('duel_rooms')
        .select('*')
        .eq('status', 'WAITING')
        .neq('host_callsign', callsign)
        .order('created_at', { ascending: true })
        .limit(1);

      if (data && data.length > 0) {
        const room = data[0];
        // Join as Challenger
        const { error: updateErr } = await this.supabase
          .from('duel_rooms')
          .update({ challenger_callsign: callsign, status: 'IN_GAME' })
          .eq('id', room.id);

        if (!updateErr) {
          this.isHost = false;
          this.roomCode = room.room_code;
          this.opponentData.callsign = room.host_callsign;
          this.subscribeToChannel(room.room_code);
          return;
        }
      }

      // If no room found, create new room as Host
      await this.createPrivateRoom();
    } catch (e) {
      console.warn('Quick Match fallback:', e);
      this.startMockDuel('BOT_RIVAL');
    }
  }

  async createPrivateRoom() {
    const callsign = getPilotCallsign();
    const code = this.generateRoomCode();
    this.roomCode = code;
    this.isHost = true;
    this.setStatus(`ROOM CODE: ${code} - WAITING FOR CHALLENGER...`, true);

    if (!this.supabase) {
      this.subscribeToChannel(code);
      return;
    }

    try {
      const { error } = await this.supabase
        .from('duel_rooms')
        .insert([{ room_code: code, host_callsign: callsign, status: 'WAITING' }]);

      if (error) {
        console.error('Create room error:', error);
      }

      this.subscribeToChannel(code);
    } catch (e) {
      console.warn('Create room fallback:', e);
      this.subscribeToChannel(code);
    }
  }

  async joinRoomFromInput() {
    const code = this.roomInput ? this.roomInput.value.trim().toUpperCase() : '';
    if (!code || code.length !== 4) {
      this.setStatus('ENTER A VALID 4-LETTER ROOM CODE', false);
      return;
    }

    const callsign = getPilotCallsign();
    this.setStatus(`JOINING ROOM [${code}]...`, true);

    if (!this.supabase) {
      this.isHost = false;
      this.roomCode = code;
      this.opponentData.callsign = 'HOST_PILOT';
      this.subscribeToChannel(code);
      return;
    }

    try {
      const { data, error } = await this.supabase
        .from('duel_rooms')
        .select('*')
        .eq('room_code', code)
        .single();

      if (error || !data) {
        this.setStatus(`ROOM [${code}] NOT FOUND`, false);
        return;
      }

      const { error: updateErr } = await this.supabase
        .from('duel_rooms')
        .update({ challenger_callsign: callsign, status: 'IN_GAME' })
        .eq('id', data.id);

      if (updateErr) {
        this.setStatus('FAILED TO JOIN ROOM', false);
        return;
      }

      this.isHost = false;
      this.roomCode = code;
      this.opponentData.callsign = data.host_callsign;
      this.subscribeToChannel(code);
    } catch (e) {
      console.warn('Join room error:', e);
      this.subscribeToChannel(code);
    }
  }

  subscribeToChannel(code) {
    if (this.channel) {
      this.supabase ? this.supabase.removeChannel(this.channel) : null;
    }

    if (!this.supabase) {
      // Mock start if Supabase unavailable
      setTimeout(() => {
        this.startDuelMatch(code);
      }, 800);
      return;
    }

    this.channel = this.supabase.channel('duel_' + code, {
      config: { broadcast: { self: false } }
    });

    this.channel
      .on('broadcast', { event: 'pos' }, ({ payload }) => {
        this.opponentData.x = payload.x;
        this.opponentData.y = payload.y;
        this.opponentData.lastUpdate = Date.now();
      })
      .on('broadcast', { event: 'shoot' }, ({ payload }) => {
        this.game.spawnOpponentLaser(payload.x, payload.y);
      })
      .on('broadcast', { event: 'hit' }, ({ payload }) => {
        this.opponentData.hp = payload.hp;
        this.opponentData.shield = payload.shield;
        this.updateOpponentHUD();
      })
      .on('broadcast', { event: 'match_end' }, ({ payload }) => {
        this.handleOpponentDefeated(payload.winnerCallsign);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.startDuelMatch(code);
        }
      });
  }

  startDuelMatch(code) {
    this.inMatch = true;
    if (this.lobbyModal) this.lobbyModal.classList.add('hidden');
    
    // Position opponent in top arena area
    this.opponentData.x = this.game.canvas.width / 2;
    this.opponentData.y = 80;
    this.opponentData.hp = 100;
    this.opponentData.shield = 100;

    this.updateOpponentHUD();
    if (this.opponentHud) this.opponentHud.classList.remove('hidden');

    this.game.startDuelGame(this);
    soundManager.playSound('waveClear');
  }

  startMockDuel(rivalName) {
    this.roomCode = 'MOCK';
    this.isHost = true;
    this.opponentData.callsign = rivalName;
    this.startDuelMatch('MOCK');
  }

  broadcastPlayerState(player) {
    if (!this.inMatch) return;
    const now = performance.now();
    if (now - this.lastBroadcast > 33) { // 30Hz throttled
      this.lastBroadcast = now;
      if (this.channel) {
        this.channel.send({
          type: 'broadcast',
          event: 'pos',
          payload: { x: player.x, y: player.y }
        });
      }
    }
  }

  broadcastShoot(x, y) {
    if (!this.inMatch || !this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'shoot',
      payload: { x, y }
    });
  }

  broadcastDamage(hp, shield) {
    if (!this.inMatch || !this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'hit',
      payload: { hp, shield }
    });
  }

  broadcastMatchEnd(winnerCallsign) {
    if (!this.inMatch || !this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'match_end',
      payload: { winnerCallsign }
    });
  }

  updateOpponentHUD() {
    const nameEl = document.getElementById('opponent-callsign');
    const hpInner = document.getElementById('opponent-hp-inner');
    const shieldInner = document.getElementById('opponent-shield-inner');

    if (nameEl) nameEl.textContent = this.opponentData.callsign;
    if (hpInner) {
      const pct = Math.max(0, Math.min(100, (this.opponentData.hp / this.opponentData.maxHp) * 100));
      hpInner.style.width = `${pct}%`;
    }
    if (shieldInner) {
      const pct = Math.max(0, Math.min(100, (this.opponentData.shield / this.opponentData.maxShield) * 100));
      shieldInner.style.width = `${pct}%`;
    }
  }

  handleOpponentDefeated(winnerCallsign) {
    if (!this.inMatch) return;
    this.inMatch = false;

    const localCallsign = getPilotCallsign();
    const isWinner = (winnerCallsign === localCallsign);

    if (isWinner) {
      this.game.shop.addCoins(50);
      let wins = parseInt(localStorage.getItem('void_pilot_wins') || '0', 10) + 1;
      localStorage.setItem('void_pilot_wins', wins.toString());
      this.game.showWaveBanner(`🏆 ${localCallsign} WINS THE DUEL! +50 COINS`);
    } else {
      this.game.showWaveBanner(`💀 DEFEATED BY ${winnerCallsign}`);
    }

    setTimeout(() => {
      this.cleanup();
      this.game.returnToHome();
    }, 3500);
  }

  leaveLobby() {
    this.cleanup();
    this.setStatus('LOBBY CANCELLED', false);
  }

  cleanup() {
    this.inMatch = false;
    if (this.opponentHud) this.opponentHud.classList.add('hidden');
    if (this.channel && this.supabase) {
      this.supabase.removeChannel(this.channel);
    }
    this.channel = null;
  }
}
