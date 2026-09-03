// 1v1 Duel Arena Realtime Engine, Bot AI Duelist, 3-Tier Podium System & In-Game Chat System for FinalOrbit
import { createClient } from '@supabase/supabase-js';
import { getPilotCallsign } from './leaderboard.js';
import { soundManager } from './audio.js';
import { themeManager } from './theme.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export class DuelManager {
  constructor(game) {
    this.game = game;
    this.supabase = (window.supabase && window.supabase.createClient)
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
      : (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-project-id'))
        ? createClient(SUPABASE_URL, SUPABASE_KEY)
        : null;

    this.channel = null;
    this.roomCode = null;
    this.isHost = false;
    this.inMatch = false;
    this.isBotMatch = false;
    this.botDifficulty = 'medium';

    this.opponentData = {
      callsign: 'RIVAL PILOT',
      x: 0,
      y: 80,
      hp: 100,
      maxHp: 100,
      shield: 100,
      maxShield: 100,
      vx: 0,
      lastUpdate: 0
    };

    this.botState = {
      x: 200,
      y: 80,
      targetX: 200,
      shootTimer: 0,
      chatCooldown: 0,
      dodgeCooldown: 0,
      lastHp: 100
    };

    this.lastBroadcast = 0;
    this.lastChatSendTime = 0;
    this.floatingBubbles = []; // Floating Overhead Canvas Speech Bubbles

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
    this.podiumModal = document.getElementById('duel-podium-modal');
    this.roomInput = document.getElementById('duel-room-code-input');
    this.statusText = document.getElementById('duel-status-text');
    this.spinner = document.getElementById('duel-spinner');
    this.opponentHud = document.getElementById('opponent-hud');
    this.chatContainer = document.getElementById('duel-chat-container');
    this.chatLog = document.getElementById('duel-chat-log');
    this.quickChatMenu = document.getElementById('quick-chat-menu');
    this.chatTextInput = document.getElementById('duel-chat-text-input');
    this.botDiffContainer = document.getElementById('bot-difficulty-container');

    const btnQuick = document.getElementById('btn-duel-quick');
    const btnCreate = document.getElementById('btn-duel-create');
    const btnJoin = document.getElementById('btn-duel-join');
    const btnBot = document.getElementById('btn-duel-bot');
    const btnCancel = document.getElementById('btn-duel-cancel');
    const btnClose = document.getElementById('btn-duel-close');
    const btnChatToggle = document.getElementById('btn-quick-chat-toggle');

    const btnRematch = document.getElementById('btn-podium-rematch');
    const btnPodiumHome = document.getElementById('btn-podium-home');

    if (btnQuick) btnQuick.addEventListener('click', () => this.quickMatch());
    if (btnCreate) btnCreate.addEventListener('click', () => this.createPrivateRoom());
    if (btnJoin) btnJoin.addEventListener('click', () => this.joinRoomFromInput());
    if (btnBot) {
      btnBot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startBotMatch(this.botDifficulty || 'medium');
      });
    }
    if (btnCancel) btnCancel.addEventListener('click', () => this.leaveLobby());
    if (btnClose) btnClose.addEventListener('click', () => this.closeLobbyModal());

    if (btnRematch) {
      btnRematch.addEventListener('click', () => {
        if (this.podiumModal) this.podiumModal.classList.add('hidden');
        if (this.isBotMatch) {
          this.startBotMatch(this.botDifficulty || 'medium');
        } else {
          this.openLobbyModal();
          this.quickMatch();
        }
      });
    }

    if (btnPodiumHome) {
      btnPodiumHome.addEventListener('click', () => {
        if (this.podiumModal) this.podiumModal.classList.add('hidden');
        this.game.returnToHome();
      });
    }

    if (btnChatToggle) {
      btnChatToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleQuickChatMenu();
      });
    }

    // Quick Chat Action Buttons
    document.querySelectorAll('.qc-btn[data-qc]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const msg = btn.getAttribute('data-qc');
        if (msg) this.sendChatMessage(msg, true);
        if (this.quickChatMenu) this.quickChatMenu.style.display = 'none';
      });
    });

    // Custom Chat Text Input
    if (this.chatTextInput) {
      this.chatTextInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          const text = this.chatTextInput.value.trim();
          if (text) {
            this.sendChatMessage(text, false);
            this.chatTextInput.value = '';
          }
          this.chatTextInput.blur();
        } else if (e.key === 'Escape') {
          this.chatTextInput.blur();
        }
      });

      this.chatTextInput.addEventListener('touchstart', (e) => e.stopPropagation());
      this.chatTextInput.addEventListener('mousedown', (e) => e.stopPropagation());
    }

    // Bot Difficulty Selection Buttons
    document.querySelectorAll('.bot-diff-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.bot-diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const diff = btn.getAttribute('data-diff') || 'medium';
        this.startBotMatch(diff);
      });
    });

    // Touch Event Isolation so chat tapping never fires lasers or drags ship
    if (this.chatContainer) {
      ['touchstart', 'touchend', 'mousedown', 'mouseup'].forEach(evt => {
        this.chatContainer.addEventListener(evt, (e) => {
          if (e.target.closest('#duel-chat-controls')) {
            e.stopPropagation();
          }
        }, { passive: false });
      });
    }

    window.addEventListener('beforeunload', () => this.cleanup());
  }

  getDuelStats() {
    const mmr = parseInt(localStorage.getItem('void_pilot_mmr') || '1000', 10);
    const wins = parseInt(localStorage.getItem('void_pilot_duel_wins') || '0', 10);
    const losses = parseInt(localStorage.getItem('void_pilot_duel_losses') || '0', 10);
    const streak = parseInt(localStorage.getItem('void_pilot_win_streak') || '0', 10);
    return { mmr, wins, losses, streak };
  }

  getPodiumRank(mmr) {
    if (mmr >= 1400) {
      return { rankNum: 1, rankTitle: 'GOLD VANGUARD', icon: '👑', color: '#ffd700', coinBonusMult: 1.2 };
    } else if (mmr >= 1150) {
      return { rankNum: 2, rankTitle: 'SILVER STRIKER', icon: '⭐', color: '#e0e6ed', coinBonusMult: 1.0 };
    } else {
      return { rankNum: 3, rankTitle: 'BRONZE ENFORCER', icon: '🔰', color: '#cd7f32', coinBonusMult: 1.0 };
    }
  }

  async updateDuelStats(isWin, isOnlineMatch) {
    const stats = this.getDuelStats();
    let mmrChange = 0;
    let baseCoins = isOnlineMatch ? 50 : 25;

    if (isWin) {
      mmrChange = isOnlineMatch ? 25 : 15;
      stats.wins += 1;
      stats.streak += 1;
    } else {
      mmrChange = -15;
      stats.losses += 1;
      stats.streak = 0;
    }

    stats.mmr = Math.max(0, stats.mmr + mmrChange);

    const rankInfo = this.getPodiumRank(stats.mmr);
    let finalCoins = isWin ? Math.round(baseCoins * (rankInfo.coinBonusMult || 1.0)) : 0;

    localStorage.setItem('void_pilot_mmr', stats.mmr.toString());
    localStorage.setItem('void_pilot_duel_wins', stats.wins.toString());
    localStorage.setItem('void_pilot_duel_losses', stats.losses.toString());
    localStorage.setItem('void_pilot_win_streak', stats.streak.toString());

    if (isWin && finalCoins > 0) {
      this.game.shop.addScrap(finalCoins);
      this.game.shop.saveCoins();
    }

    // Sync to Supabase duel_leaderboard
    this.syncToSupabaseLeaderboard(stats);

    return { stats, mmrChange, finalCoins, rankInfo };
  }

  async syncToSupabaseLeaderboard(stats) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    const callsign = getPilotCallsign();

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/duel_leaderboard`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          callsign,
          mmr_rating: stats.mmr,
          duel_wins: stats.wins,
          duel_losses: stats.losses,
          win_streak: stats.streak
        })
      });
    } catch (e) {
      console.warn('Supabase duel leaderboard sync error:', e);
    }
  }

  openLobbyModal() {
    const callsign = getPilotCallsign();
    if (!callsign || (callsign === 'RAZA' && !localStorage.getItem('void_pilot_callsign'))) {
      const callsignModal = document.getElementById('callsign-modal');
      if (callsignModal) {
        callsignModal.classList.remove('hidden');
        return;
      }
    }

    const display = document.getElementById('duel-callsign-display');
    if (display) display.textContent = callsign;

    if (this.botDiffContainer) this.botDiffContainer.classList.add('hidden');
    if (this.lobbyModal) this.lobbyModal.classList.remove('hidden');
    this.setStatus('SELECT MATCHMAKING OPTION', false);
  }

  closeLobbyModal() {
    this.leaveLobby();
    if (this.lobbyModal) this.lobbyModal.classList.add('hidden');
  }

  toggleBotDifficultyMenu() {
    if (this.botDiffContainer) {
      this.botDiffContainer.classList.toggle('hidden');
    }
  }

  toggleQuickChatMenu() {
    if (!this.quickChatMenu) return;
    const isHidden = (this.quickChatMenu.style.display === 'none' || !this.quickChatMenu.style.display);
    this.quickChatMenu.style.display = isHidden ? 'flex' : 'none';
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
    this.isBotMatch = false;
    this.setStatus('SEARCHING FOR OPEN DUEL ROOM...', true);

    if (!this.supabase) {
      this.startBotMatch('medium');
      return;
    }

    try {
      // Find open room waiting for challenger
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

      // If no open room exists, create a new room as Host
      await this.createPrivateRoom();
    } catch (e) {
      console.warn('Quick Match fallback:', e);
      this.startBotMatch('medium');
    }
  }

  async createPrivateRoom() {
    const callsign = getPilotCallsign();
    const code = this.generateRoomCode();
    this.isBotMatch = false;
    this.roomCode = code;
    this.isHost = true;
    this.setStatus(`ROOM CODE: [ ${code} ] - WAITING FOR CHALLENGER...`, true);

    if (!this.supabase) {
      this.subscribeToChannel(code);
      return;
    }

    try {
      const { error } = await this.supabase
        .from('duel_rooms')
        .insert([{ room_code: code, host_callsign: callsign, status: 'WAITING' }]);

      if (error) console.error('Create room error:', error);
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
    this.isBotMatch = false;
    this.setStatus(`JOINING ROOM [ ${code} ]...`, true);

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
        this.setStatus(`ROOM [ ${code} ] NOT FOUND`, false);
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

  startBotMatch(difficulty = 'medium') {
    this.isBotMatch = true;
    this.botDifficulty = difficulty;
    this.roomCode = 'BOT_' + difficulty.toUpperCase();
    this.isHost = true;

    let botBadge = 'CADET NOVA';
    if (difficulty === 'medium') botBadge = 'STALKER REX';
    if (difficulty === 'hard') botBadge = 'APEX ZERO';

    this.opponentData.callsign = `BOT // ${botBadge}`;
    this.opponentData.hp = 100;
    this.opponentData.maxHp = 100;
    this.opponentData.shield = 100;
    this.opponentData.maxShield = 100;
    this.opponentData.x = this.game.canvas.width / 2;
    this.opponentData.y = 80;

    this.botState.x = this.game.canvas.width / 2;
    this.botState.targetX = this.game.canvas.width / 2;
    this.botState.shootTimer = 0;
    this.botState.chatCooldown = 0;
    this.botState.dodgeCooldown = 0;
    this.botState.lastHp = 100;

    this.startDuelMatch(this.roomCode);

    // Initial Bot Taunt
    setTimeout(() => {
      const greeting = difficulty === 'hard' ? 'SYSTEMS ONLINE. SURRENDER NOW. 🤖' : 'GOOD LUCK PILOT! ⚡';
      this.displayIncomingChatMessage(this.opponentData.callsign, greeting, true);
    }, 1200);
  }

  subscribeToChannel(code) {
    if (this.channel && this.supabase) {
      this.supabase.removeChannel(this.channel);
    }

    if (!this.supabase) {
      setTimeout(() => this.startDuelMatch(code), 600);
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
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        this.displayIncomingChatMessage(payload.sender, payload.text, payload.isQuickChat);
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
    if (this.podiumModal) this.podiumModal.classList.add('hidden');
    if (this.botDiffContainer) this.botDiffContainer.classList.add('hidden');

    this.opponentData.x = this.game.canvas.width / 2;
    this.opponentData.y = 80;
    this.opponentData.hp = 100;
    this.opponentData.shield = 100;

    this.updateOpponentHUD();
    if (this.opponentHud) this.opponentHud.classList.remove('hidden');
    if (this.chatContainer) this.chatContainer.classList.remove('hidden');

    this.game.startDuelGame(this);
    soundManager.playSound('waveClear');
  }

  broadcastPlayerState(player) {
    if (!this.inMatch) return;

    if (this.isBotMatch) {
      this.updateBotAI(player);
      return;
    }

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
    if (!this.inMatch) return;
    if (this.channel && !this.isBotMatch) {
      this.channel.send({
        type: 'broadcast',
        event: 'shoot',
        payload: { x, y }
      });
    }
  }

  broadcastDamage(hp, shield) {
    if (!this.inMatch) return;
    if (this.channel && !this.isBotMatch) {
      this.channel.send({
        type: 'broadcast',
        event: 'hit',
        payload: { hp, shield }
      });
    }
  }

  sendChatMessage(text, isQuickChat = false) {
    if (!this.inMatch || !text.trim()) return;
    const now = Date.now();
    if (now - this.lastChatSendTime < 1000) return; // Rate limit 1s
    this.lastChatSendTime = now;

    const callsign = getPilotCallsign();
    const cleanText = text.trim().slice(0, 40);

    if (this.channel && !this.isBotMatch) {
      this.channel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: { sender: callsign, text: cleanText, isQuickChat }
      });
    }

    this.displayIncomingChatMessage(callsign, cleanText, isQuickChat);
  }

  displayIncomingChatMessage(sender, text, isQuickChat = false) {
    if (!this.chatLog) return;

    const isLocal = (sender === getPilotCallsign());
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isLocal ? 'local' : 'opponent'}`;
    bubble.innerHTML = `<span class="chat-sender">${sender}:</span> ${text}`;

    this.chatLog.appendChild(bubble);
    soundManager.playSound('click');

    // Remove chat log item after 4.5 seconds
    setTimeout(() => {
      if (bubble.parentNode) bubble.parentNode.removeChild(bubble);
    }, 4500);

    // Push Overhead Floating Speech Bubble for Canvas rendering (lasts 2 seconds)
    this.floatingBubbles.push({
      sender,
      text,
      isLocal,
      startTime: Date.now(),
      duration: 2200
    });
  }

  updateBotAI(player) {
    const canvasWidth = this.game.canvas.width;
    const diff = this.botDifficulty;
    this.botState.shootTimer++;
    if (this.botState.chatCooldown > 0) this.botState.chatCooldown--;

    const botRenderX = canvasWidth - this.botState.x;

    // 1. Reactive Bullet Dodging AI (Raycasting player bullets within 80px danger radius)
    let dangerX = null;
    for (let i = 0; i < this.game.bullets.length; i++) {
      const b = this.game.bullets[i];
      if (!b.isEnemy && b.active && b.y < 180 && b.y > 60) {
        if (Math.abs(b.x - botRenderX) < 40) {
          dangerX = b.x;
          break;
        }
      }
    }

    if (dangerX !== null) {
      // Dodge away from incoming laser
      const dodgeDir = (botRenderX > dangerX) ? 1 : -1;
      const dodgeSpeed = (diff === 'hard') ? 8 : (diff === 'medium') ? 5 : 3;
      this.botState.x -= dodgeDir * dodgeSpeed;
    } else {
      // 2. Target Movement & Strafing
      let targetPlayerX = player.x;
      if (diff === 'hard') {
        // Lead Aiming Prediction
        targetPlayerX = player.x + (player.vx || 0) * 12;
      }

      const moveSpeed = (diff === 'hard') ? 0.08 : (diff === 'medium') ? 0.05 : 0.03;
      const weave = Math.sin(Date.now() * 0.003) * (diff === 'hard' ? 40 : 25);
      this.botState.x += ((targetPlayerX + weave) - this.botState.x) * moveSpeed;
    }

    // Keep bot inside canvas bounds
    this.botState.x = Math.max(40, Math.min(canvasWidth - 40, this.botState.x));
    this.opponentData.x = this.botState.x;
    this.opponentData.y = 80;

    // 3. Intelligent Shooting Routines
    const fireInterval = (diff === 'hard') ? 30 : (diff === 'medium') ? 45 : 65;
    if (this.botState.shootTimer >= fireInterval) {
      this.botState.shootTimer = 0;
      if (Math.abs(botRenderX - player.x) < (diff === 'hard' ? 120 : 70)) {
        this.game.spawnOpponentLaser(this.botState.x, 80);

        // Emergency Barrage if bot HP < 30% on Hard
        if (diff === 'hard' && this.opponentData.hp < 30 && Math.random() < 0.4) {
          setTimeout(() => this.game.spawnOpponentLaser(this.botState.x - 25, 80), 80);
          setTimeout(() => this.game.spawnOpponentLaser(this.botState.x + 25, 80), 160);
        }
      }
    }

    // 4. Automated Bot Chat & Reactions
    if (this.botState.chatCooldown <= 0) {
      if (this.opponentData.hp < this.botState.lastHp - 20) {
        this.botState.lastHp = this.opponentData.hp;
        this.botState.chatCooldown = 300; // 5s cooldown
        const taunts = ['IMPRESSIVE SHOT! 💥', 'SHIELD CRITICAL! 🛡️', 'NOT BAD PILOT! 🎯'];
        const msg = taunts[Math.floor(Math.random() * taunts.length)];
        this.displayIncomingChatMessage(this.opponentData.callsign, msg, true);
      }
    }
  }

  checkDuelHits(game) {
    if (!this.inMatch) return;

    const oppRenderX = game.canvas.width - this.opponentData.x;
    const oppRenderY = 70;

    // Check Player bullets vs Opponent/Bot ship
    for (let i = game.bullets.length - 1; i >= 0; i--) {
      const b = game.bullets[i];
      if (b.active && !b.isEnemy) {
        const dist = Math.hypot(b.x - oppRenderX, b.y - oppRenderY);
        if (dist < 28) {
          b.active = false;
          game.particleSystem.createSparks(b.x, b.y, '#00f0ff', 8);
          soundManager.playHit();

          if (this.opponentData.shield > 0) {
            this.opponentData.shield = Math.max(0, this.opponentData.shield - b.damage);
          } else {
            this.opponentData.hp = Math.max(0, this.opponentData.hp - b.damage);
          }

          this.updateOpponentHUD();
          this.broadcastDamage(this.opponentData.hp, this.opponentData.shield);

          if (this.opponentData.hp <= 0) {
            this.handleOpponentDefeated(getPilotCallsign());
          }
        }
      }
    }
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

  async handleOpponentDefeated(winnerCallsign) {
    if (!this.inMatch) return;
    this.inMatch = false;

    const localCallsign = getPilotCallsign();
    const isWinner = (winnerCallsign === localCallsign);

    // Update Competitive MMR, Wins, Losses, Streaks & Coin Rewards
    const updateResult = await this.updateDuelStats(isWinner, !this.isBotMatch);

    if (isWinner) {
      soundManager.playSound('waveClear');
    } else {
      soundManager.playSound('gameOver');
    }

    setTimeout(() => {
      this.cleanup();
      this.showPodiumCeremony(winnerCallsign, isWinner, updateResult);
    }, 1200);
  }

  showPodiumCeremony(winnerCallsign, isWinner, updateResult) {
    if (!this.podiumModal) return;

    const localCallsign = getPilotCallsign();
    const opponentCallsign = this.opponentData.callsign;

    const titleEl = document.getElementById('podium-title');
    const rewardCoinsEl = document.getElementById('podium-reward-coins');
    const rewardMmrEl = document.getElementById('podium-reward-mmr');
    const streakEl = document.getElementById('podium-streak');

    if (titleEl) {
      titleEl.textContent = isWinner ? '🏆 DUEL VICTORY!' : '💀 DUEL DEFEATED';
      titleEl.style.color = isWinner ? '#ffd700' : '#ff0055';
    }

    if (rewardCoinsEl) {
      rewardCoinsEl.textContent = isWinner ? `+${updateResult.finalCoins} COINS` : '0 COINS';
    }
    if (rewardMmrEl) {
      const changeStr = updateResult.mmrChange >= 0 ? `+${updateResult.mmrChange}` : `${updateResult.mmrChange}`;
      rewardMmrEl.textContent = `${changeStr} MMR (${updateResult.stats.mmr})`;
    }
    if (streakEl) {
      streakEl.textContent = `STREAK: ${updateResult.stats.streak} 🔥`;
    }

    // Populate 3-Tier Podium Slots
    const p1Avatar = document.getElementById('podium-avatar-1');
    const p1Callsign = document.getElementById('podium-callsign-1');
    const p1Mmr = document.getElementById('podium-mmr-1');

    const p2Avatar = document.getElementById('podium-avatar-2');
    const p2Callsign = document.getElementById('podium-callsign-2');
    const p2Mmr = document.getElementById('podium-mmr-2');

    const p3Avatar = document.getElementById('podium-avatar-3');
    const p3Callsign = document.getElementById('podium-callsign-3');
    const p3Mmr = document.getElementById('podium-mmr-3');

    if (isWinner) {
      // Local player is 1st Place (Center / Gold)
      if (p1Avatar) p1Avatar.textContent = updateResult.rankInfo.icon || '🛸';
      if (p1Callsign) p1Callsign.textContent = localCallsign;
      if (p1Mmr) p1Mmr.textContent = `${updateResult.stats.mmr} MMR`;

      // Opponent is 2nd Place (Left / Silver)
      if (p2Avatar) p2Avatar.textContent = '🎯';
      if (p2Callsign) p2Callsign.textContent = opponentCallsign;
      if (p2Mmr) p2Mmr.textContent = '1180 MMR';

      // 3rd Place Badge
      if (p3Avatar) p3Avatar.textContent = '🔰';
      if (p3Callsign) p3Callsign.textContent = 'CADET_01';
      if (p3Mmr) p3Mmr.textContent = '1050 MMR';
    } else {
      // Opponent is 1st Place
      if (p1Avatar) p1Avatar.textContent = '🎯';
      if (p1Callsign) p1Callsign.textContent = opponentCallsign;
      if (p1Mmr) p1Mmr.textContent = '1420 MMR';

      // Local player is 2nd Place
      if (p2Avatar) p2Avatar.textContent = updateResult.rankInfo.icon || '🛸';
      if (p2Callsign) p2Callsign.textContent = localCallsign;
      if (p2Mmr) p2Mmr.textContent = `${updateResult.stats.mmr} MMR`;

      if (p3Avatar) p3Avatar.textContent = '🔰';
      if (p3Callsign) p3Callsign.textContent = 'ROOKIE';
      if (p3Mmr) p3Mmr.textContent = '1000 MMR';
    }

    this.podiumModal.classList.remove('hidden');
  }

  drawFloatingBubbles(ctx, playerX, playerY) {
    const now = Date.now();
    for (let i = this.floatingBubbles.length - 1; i >= 0; i--) {
      const bubble = this.floatingBubbles[i];
      const elapsed = now - bubble.startTime;
      if (elapsed > bubble.duration) {
        this.floatingBubbles.splice(i, 1);
        continue;
      }

      const alpha = Math.max(0, 1 - (elapsed / bubble.duration));
      const bubbleX = bubble.isLocal ? playerX : (this.game.canvas.width - this.opponentData.x);
      const bubbleY = bubble.isLocal ? (playerY - 45) : 115;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '700 12px "Rajdhani", sans-serif';
      const textWidth = ctx.measureText(bubble.text).width;
      const padX = 10;
      const padY = 6;

      ctx.fillStyle = bubble.isLocal ? 'rgba(3, 15, 30, 0.9)' : 'rgba(30, 5, 12, 0.9)';
      ctx.strokeStyle = bubble.isLocal ? '#00f0ff' : '#ff0055';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.roundRect(bubbleX - textWidth / 2 - padX, bubbleY - 10, textWidth + padX * 2, 22, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bubble.text, bubbleX, bubbleY + 1);
      ctx.restore();
    }
  }

  leaveLobby() {
    this.cleanup();
    this.setStatus('LOBBY CANCELLED', false);
  }

  cleanup() {
    this.inMatch = false;
    this.isBotMatch = false;
    if (this.opponentHud) this.opponentHud.classList.add('hidden');
    if (this.chatContainer) this.chatContainer.classList.add('hidden');
    if (this.channel && this.supabase) {
      this.supabase.removeChannel(this.channel);
    }
    this.channel = null;
  }
}
