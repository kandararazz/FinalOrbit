// Entry Point & Application Bootstrap for FinalOrbit
import { Game } from './game.js';
import { LevelEditor } from './editor.js';
import { soundManager } from './audio.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const container = document.getElementById('game-container');

  function resizeCanvas() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    canvas.width = width;
    canvas.height = height;
    if (window.gameInstance) {
      window.gameInstance.resize(width, height);
    }
  }

  resizeCanvas();

  const game = new Game(canvas);
  window.gameInstance = game;

  // Level Editor Integration
  const editor = new LevelEditor((customConfig) => {
    game.playCustomWave(customConfig);
  });

  // Bind Start Button
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
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

  // Bind Hangar Shop Modals
  const shopOpenBtn = document.getElementById('shop-open-btn');
  const shopCloseBtn = document.getElementById('shop-close-btn');
  const gameOverShopBtn = document.getElementById('game-over-shop-btn');
  const shopScreen = document.getElementById('shop-screen');

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
      game.startNewGame(true); // Start Endless Mode run!
    });
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 100);
  });

  // Run render loop
  game.run();
});
