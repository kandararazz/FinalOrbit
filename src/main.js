// Entry Point & Application Bootstrap for FinalOrbit
import { Game } from './game.js';
import { LevelEditor } from './editor.js';
import { soundManager } from './audio.js';
import { themeManager } from './theme.js';
import { DuelManager } from './duel.js';
import { getPilotCallsign } from './leaderboard.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const container = document.getElementById('game-container');

  function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(2.0, window.devicePixelRatio || 1.0);
    const width = rect.width;
    const height = rect.height;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (window.gameInstance) {
      window.gameInstance.resize(width, height);
    }
  }

  resizeCanvas();

  const game = new Game(canvas);
  window.gameInstance = game;
  const duelManager = new DuelManager(game);

  // Level Editor Integration
  const editor = new LevelEditor((customConfig) => {
    game.playCustomWave(customConfig);
  });

  // Touch Event Isolation for Virtual Buttons
  const isolateTouchButtons = () => {
    const buttonSelectors = [
      '#mobile-bomb-btn', '#mobile-dash-btn', '#bomb-btn', '#chrono-btn',
      '#mobile-pause-btn', '#mobile-fullscreen-btn', '#audio-toggle', '#fullscreen-toggle',
      '.mode-card-btn', '.arcade-btn', '.btn-neon', '.tab-btn', '.theme-card'
    ];

    buttonSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
          e.stopPropagation();
        }, { passive: false });
        btn.addEventListener('touchend', (e) => {
          e.stopPropagation();
        }, { passive: false });
      });
    });
  };

  isolateTouchButtons();

  // Enforce Callsign Check before Mode Entry
  const checkCallsignSet = () => {
    const callsign = getPilotCallsign();
    if (!callsign || (callsign === 'RAZA' && !localStorage.getItem('void_pilot_callsign'))) {
      const callsignModal = document.getElementById('callsign-modal');
      if (callsignModal) {
        callsignModal.classList.remove('hidden');
        return false;
      }
    }
    return true;
  };

  // Bind Start Screen Mode Switcher Cards
  const btnModeSolo = document.getElementById('btn-mode-solo');
  const btnModeDuel = document.getElementById('btn-mode-duel');
  const startBtn = document.getElementById('start-btn');

  if (btnModeSolo) {
    btnModeSolo.addEventListener('click', () => {
      if (!checkCallsignSet()) return;
      soundManager.init();
      game.startNewGame();
    });
  }

  if (btnModeDuel) {
    btnModeDuel.addEventListener('click', () => {
      if (!checkCallsignSet()) return;
      soundManager.init();
      duelManager.openLobbyModal();
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (!checkCallsignSet()) return;
      soundManager.init();
      game.startNewGame();
    });
  }

  // Bind Resume Button
  const resumeBtn = document.getElementById('resume-btn');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      game.togglePause();
    });
  }

  // Bind Restart & Return to Home Buttons
  const restartPauseBtn = document.getElementById('restart-pause-btn');
  if (restartPauseBtn) {
    restartPauseBtn.addEventListener('click', () => {
      game.startNewGame();
    });
  }

  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      game.startNewGame();
    });
  }

  const gameOverHomeBtn = document.getElementById('game-over-home-btn');
  if (gameOverHomeBtn) {
    gameOverHomeBtn.addEventListener('click', () => {
      game.returnToHome();
    });
  }

  // Bind Hangar Deck & Theme Switcher Modals
  const shopOpenBtn = document.getElementById('shop-open-btn');
  const shopCloseBtn = document.getElementById('shop-close-btn');
  const gameOverShopBtn = document.getElementById('game-over-shop-btn');
  const shopScreen = document.getElementById('shop-screen');

  const btnHangarOpen = document.getElementById('btn-hangar-open');
  const btnHangarClose = document.getElementById('btn-hangar-close');
  const btnHangarBack = document.getElementById('btn-hangar-back');
  const hangarModal = document.getElementById('hangar-modal');

  if (btnHangarOpen && hangarModal) {
    btnHangarOpen.addEventListener('click', () => {
      game.shop.updateUI();
      themeManager.updateUI();
      hangarModal.style.display = 'flex';
    });
  }

  const closeHangar = () => {
    if (hangarModal) hangarModal.style.display = 'none';
  };

  if (btnHangarClose) btnHangarClose.addEventListener('click', closeHangar);
  if (btnHangarBack) btnHangarBack.addEventListener('click', closeHangar);

  // Bind Theme Cards click events
  const themeCards = document.querySelectorAll('.theme-card');
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      const themeId = card.getAttribute('data-theme-id');
      if (themeId) {
        themeManager.setTheme(themeId);
        soundManager.playSound('click');
      }
    });
  });

  if (shopOpenBtn && shopScreen) {
    shopOpenBtn.addEventListener('click', () => {
      game.shop.updateUI();
      shopScreen.classList.remove('hidden');
    });
  }
  if (gameOverShopBtn && shopScreen) {
    gameOverShopBtn.addEventListener('click', () => {
      game.returnToHome();
    });
  }
  if (shopCloseBtn && shopScreen) {
    shopCloseBtn.addEventListener('click', () => {
      shopScreen.classList.add('hidden');
    });
  }

  // Bind Daily Quests & Pilot Badges Modals
  const questsOpenBtn = document.getElementById('quests-open-btn');
  const questsCloseBtn = document.getElementById('quests-close-btn');
  const questsScreen = document.getElementById('quests-screen');
  const questsTab1 = document.getElementById('quests-tab-1');
  const questsTab2 = document.getElementById('quests-tab-2');
  const questsPanel1 = document.getElementById('quests-panel-1');
  const questsPanel2 = document.getElementById('quests-panel-2');

  if (questsOpenBtn && questsScreen) {
    questsOpenBtn.addEventListener('click', () => {
      game.quests.renderUI();
      questsScreen.classList.remove('hidden');
    });
  }

  if (questsCloseBtn && questsScreen) {
    questsCloseBtn.addEventListener('click', () => {
      questsScreen.classList.add('hidden');
    });
  }

  if (questsTab1 && questsTab2 && questsPanel1 && questsPanel2) {
    questsTab1.addEventListener('click', () => {
      questsTab1.classList.add('active');
      questsTab2.classList.remove('active');
      questsPanel1.classList.remove('hidden');
      questsPanel2.classList.add('hidden');
    });
    questsTab2.addEventListener('click', () => {
      questsTab2.classList.add('active');
      questsTab1.classList.remove('active');
      questsPanel2.classList.remove('hidden');
      questsPanel1.classList.add('hidden');
    });
  }

  // Bind Level Editor Modals
  const editorOpenBtn = document.getElementById('editor-open-btn');
  const editorCloseBtn = document.getElementById('editor-close-btn');
  const editorScreen = document.getElementById('editor-screen');

  if (editorOpenBtn && editorScreen) {
    editorOpenBtn.addEventListener('click', () => {
      editorScreen.classList.remove('hidden');
      editor.render();
    });
  }
  if (editorCloseBtn && editorScreen) {
    editorCloseBtn.addEventListener('click', () => {
      editorScreen.classList.add('hidden');
    });
  }

  // Bind Leaderboard Modals
  const leaderboardOpenBtn = document.getElementById('leaderboard-open-btn');
  const leaderboardCloseBtn = document.getElementById('leaderboard-close-btn');
  const leaderboardScreen = document.getElementById('leaderboard-screen');

  if (leaderboardOpenBtn && leaderboardScreen) {
    leaderboardOpenBtn.addEventListener('click', () => {
      game.leaderboard.render();
      leaderboardScreen.classList.remove('hidden');
    });
  }
  if (leaderboardCloseBtn && leaderboardScreen) {
    leaderboardCloseBtn.addEventListener('click', () => {
      leaderboardScreen.classList.add('hidden');
    });
  }

  const submitScoreBtn = document.getElementById('submit-score-btn');
  if (submitScoreBtn) {
    submitScoreBtn.addEventListener('click', () => {
      const inputEl = document.getElementById('gameover-callsign-input');
      const name = inputEl ? inputEl.value : '';
      game.leaderboard.setPilotName(name);
      game.leaderboard.addScore(game.score, game.wave, name);
      submitScoreBtn.textContent = 'SUBMITTED!';
      submitScoreBtn.classList.add('equipped-btn');
      setTimeout(() => {
        document.getElementById('game-over-screen').classList.add('hidden');
        game.leaderboard.render();
        leaderboardScreen.classList.remove('hidden');
      }, 500);
    });
  }

  // Fullscreen API Integration
  function toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }

  window.toggleFullscreenApp = toggleFullscreen;

  const fullscreenToggleBtn = document.getElementById('fullscreen-toggle');
  if (fullscreenToggleBtn) {
    fullscreenToggleBtn.addEventListener('click', toggleFullscreen);
  }

  document.addEventListener('fullscreenchange', resizeCanvas);
  document.addEventListener('webkitfullscreenchange', resizeCanvas);
  document.addEventListener('MSFullscreenChange', resizeCanvas);

  // Bind Victory Screen Buttons
  const victoryHangarBtn = document.getElementById('victory-hangar-btn');
  const victoryEndlessBtn = document.getElementById('victory-endless-btn');
  const victoryScreen = document.getElementById('victory-screen');

  if (victoryHangarBtn && victoryScreen) {
    victoryHangarBtn.addEventListener('click', () => {
      victoryScreen.classList.add('hidden');
      game.shop.updateUI();
      document.getElementById('shop-screen').classList.remove('hidden');
    });
  }

  if (victoryEndlessBtn && victoryScreen) {
    victoryEndlessBtn.addEventListener('click', () => {
      victoryScreen.classList.add('hidden');
      game.startNewGame(true);
    });
  }

  // Pilot Callsign System Modal Integration
  const callsignModal = document.getElementById('callsign-modal');
  const inputPilotName = document.getElementById('input-pilot-name');
  const btnCallsignConfirm = document.getElementById('btn-callsign-confirm');
  const btnCallsignCancel = document.getElementById('btn-callsign-cancel');
  const btnCallsignStart = document.getElementById('btn-callsign-start');
  const btnCallsignPause = document.getElementById('btn-callsign-pause');

  function openCallsignModal() {
    if (!callsignModal || !inputPilotName) return;
    const current = game.leaderboard.loadPilotName();
    inputPilotName.value = current;
    callsignModal.classList.remove('hidden');
    setTimeout(() => {
      inputPilotName.focus();
      inputPilotName.select();
    }, 50);
  }

  function closeCallsignModal() {
    if (callsignModal) callsignModal.classList.add('hidden');
  }

  function saveCallsignFromModal() {
    if (!inputPilotName) return;
    game.leaderboard.setPilotName(inputPilotName.value);
    closeCallsignModal();
  }

  if (btnCallsignStart) btnCallsignStart.addEventListener('click', openCallsignModal);
  if (btnCallsignPause) btnCallsignPause.addEventListener('click', openCallsignModal);

  if (btnCallsignConfirm) {
    btnCallsignConfirm.addEventListener('click', saveCallsignFromModal);
  }

  if (btnCallsignCancel) {
    btnCallsignCancel.addEventListener('click', closeCallsignModal);
  }

  if (inputPilotName) {
    inputPilotName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveCallsignFromModal();
      } else if (e.key === 'Escape') {
        closeCallsignModal();
      }
    });

    inputPilotName.addEventListener('input', (e) => {
      const sanitized = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase().slice(0, 10);
      if (e.target.value !== sanitized) {
        e.target.value = sanitized;
      }
    });
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 100);
  });

  // Initial sync of callsign displays and theme UI
  game.leaderboard.syncInputFields();
  themeManager.updateUI();

  // Run render loop
  game.run();
});
