// Grid Level Editor & Custom JSON Wave Importer for FinalOrbit

export class LevelEditor {
  constructor(onPlayCustomWave) {
    this.onPlayCustomWave = onPlayCustomWave;
    this.canvas = document.getElementById('editor-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.selectedItem = 'drone';
    this.placedItems = [];
    this.gridSize = 20;

    this.setupUI();
    if (this.canvas) this.render();
  }

  setupUI() {
    // Palette selection buttons
    const paletteButtons = document.querySelectorAll('.palette-item');
    paletteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        paletteButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedItem = btn.getAttribute('data-type');
      });
    });

    // Canvas click to place or remove entity
    if (this.canvas) {
      this.canvas.addEventListener('click', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / (rect.width / 10));
        const y = Math.floor((e.clientY - rect.top) / (rect.height / 10));

        // Check if existing item to toggle
        const existingIdx = this.placedItems.findIndex(i => i.gridX === x && i.gridY === y);
        if (existingIdx >= 0) {
          this.placedItems.splice(existingIdx, 1);
        } else {
          this.placedItems.push({ type: this.selectedItem, gridX: x, gridY: y });
        }

        this.updateJSONOutput();
        this.render();
      });
    }

    // Export button
    const exportBtn = document.getElementById('editor-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.updateJSONOutput());
    }

    // Play Custom Wave button
    const playBtn = document.getElementById('editor-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        const jsonText = document.getElementById('editor-json-text').value;
        try {
          const parsed = JSON.parse(jsonText);
          if (this.onPlayCustomWave) this.onPlayCustomWave(parsed);
          document.getElementById('editor-screen').classList.add('hidden');
        } catch (err) {
          alert('Invalid JSON Wave Format!');
        }
      });
    }
  }

  updateJSONOutput() {
    const outputText = document.getElementById('editor-json-text');
    if (outputText) {
      outputText.value = JSON.stringify({ waveName: 'Custom Sector', entities: this.placedItems }, null, 2);
    }
  }

  render() {
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const cellW = w / 10;
    const cellH = h / 10;

    this.ctx.fillStyle = '#02040a';
    this.ctx.fillRect(0, 0, w, h);

    // Draw Grid Lines
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * cellW, 0);
      this.ctx.lineTo(i * cellW, h);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, i * cellH);
      this.ctx.lineTo(w, i * cellH);
      this.ctx.stroke();
    }

    // Render Placed Entities
    this.placedItems.forEach(item => {
      const cx = item.gridX * cellW + cellW / 2;
      const cy = item.gridY * cellH + cellH / 2;

      this.ctx.save();
      this.ctx.translate(cx, cy);

      switch (item.type) {
        case 'swarmer':
          this.ctx.fillStyle = '#ff0055';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
          this.ctx.fill();
          break;
        case 'scout':
          this.ctx.fillStyle = '#ff0077';
          this.ctx.fillRect(-10, -10, 20, 20);
          break;
        case 'cruiser':
        case 'shield_bearer':
          this.ctx.fillStyle = '#ffea00';
          this.ctx.fillRect(-14, -14, 28, 28);
          break;
        case 'asteroid':
          this.ctx.fillStyle = '#8c6d58';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
          this.ctx.fill();
          break;
        case 'boss':
          this.ctx.fillStyle = '#ff0055';
          this.ctx.fillRect(-18, -18, 36, 36);
          break;
        case 'drone':
        default:
          this.ctx.fillStyle = '#00f0ff';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
          this.ctx.fill();
          break;
      }

      this.ctx.restore();
    });
  }
}
