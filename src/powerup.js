// Power-Up Drops, Nano Pods, Shield Boosters, & Magnet Spheres for FinalOrbit

export class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'scrap', 'nano', 'booster', 'smart_restock', 'magnet_sphere', 'coolant', 'railgun', 'missile', 'flak', 'tesla', 'bomb'
    this.vy = 1.6;
    this.radius = type === 'scrap' ? 8 : 14;
    this.active = true;
    this.pulse = 0;

    switch (this.type) {
      case 'scrap':
        this.color = '#ffd700';
        this.label = '💎';
        break;
      case 'nano':
        this.color = '#00ff66';
        this.label = 'NANO';
        break;
      case 'booster':
        this.color = '#0088ff';
        this.label = 'BOOST';
        break;
      case 'smart_restock':
        this.color = '#ff5500';
        this.label = 'BMB+';
        break;
      case 'magnet_sphere':
        this.color = '#ff0077';
        this.label = 'MAG';
        break;
      case 'coolant':
        this.color = '#00ffff';
        this.label = 'ICE';
        break;
      case 'health':
        this.color = '#ff0055';
        this.label = 'HP';
        break;
      case 'shield':
        this.color = '#0088ff';
        this.label = 'SHD';
        break;
      case 'railgun':
        this.color = '#00f0ff';
        this.label = 'RAIL';
        break;
      case 'missile':
        this.color = '#ffea00';
        this.label = 'MIS';
        break;
      case 'flak':
        this.color = '#ff0077';
        this.label = 'FLK';
        break;
      case 'tesla':
        this.color = '#00ff66';
        this.label = 'TSL';
        break;
      case 'bomb':
        this.color = '#ffea00';
        this.label = 'BMB';
        break;
      default:
        this.color = '#00f0ff';
        this.label = 'PWR';
    }
  }

  update() {
    this.y += this.vy;
    this.pulse += 0.08;
  }

  isOutOfBounds(height) {
    return this.y > height + 30;
  }

  draw(ctx) {
    ctx.save();
    const scale = 1 + Math.sin(this.pulse) * 0.12;
    const r = this.radius * scale;

    ctx.fillStyle = 'rgba(5, 10, 25, 0.9)';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;

    if (this.type === 'nano') {
      // Hexagonal Nano Pod
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const hx = this.x + Math.cos(a) * r;
        const hy = this.y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.font = this.type === 'scrap' ? "12px sans-serif" : "800 8px 'Orbitron', sans-serif";
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, this.x, this.y);

    ctx.restore();
  }

  getBounds() {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2
    };
  }
}
