// Environmental Hazards, Meteor Storms & Sweeping Laser Grids for FinalOrbit

// Environmental Hazards, Meteor Storms & Sharp Obstacles for FinalOrbit

export class Asteroid {
  constructor(x, y, radius = 26) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vy = Math.random() * 1.5 + 1.5; // Slow downward drift 1.5-3px/frame
    this.vx = (Math.random() - 0.5) * 0.6;
    this.rot = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() > 0.5 ? 1 : -1) * 0.02; // 0.02 rad/frame continuous rotation
    this.health = 3; // 3 HP
    this.maxHealth = 3;
    this.scoreValue = 25;
    this.active = true;

    this.vertices = [];
    const count = 9; // Jagged sharp pointed edges
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const offset = (i % 2 === 0 ? 1.0 : 0.45) * (Math.random() * 0.2 + 0.85) * this.radius;
      this.vertices.push({
        x: Math.cos(angle) * offset,
        y: Math.sin(angle) * offset
      });
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rot += this.rotSpeed;
  }

  isOutOfBounds(height) {
    return this.y > height + 60;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    // Dark graphite grey multi-sided jagged polygon (8-10 uneven sharp vertices)
    ctx.fillStyle = '#22262c';
    ctx.strokeStyle = '#444d5a';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    this.vertices.forEach((v, idx) => {
      if (idx === 0) ctx.moveTo(v.x, v.y);
      else ctx.lineTo(v.x, v.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing orange magma cracks running through body
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (this.vertices.length >= 6) {
      ctx.moveTo(this.vertices[0].x * 0.75, this.vertices[0].y * 0.75);
      ctx.lineTo(0, 0);
      ctx.lineTo(this.vertices[3].x * 0.75, this.vertices[3].y * 0.75);
      ctx.moveTo(0, 0);
      ctx.lineTo(this.vertices[6].x * 0.75, this.vertices[6].y * 0.75);
    }
    ctx.stroke();

    // Inner glowing magma core
    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

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

export class EnergySpikeMine {
  constructor(x, y, radius = 24) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vy = Math.random() * 1.5 + 1.5; // Slow downward drift 1.5-3px/frame
    this.vx = (Math.random() - 0.5) * 0.6;
    this.rot = Math.random() * Math.PI * 2;
    this.rotSpeed = 0.03; // 0.03 rad/frame continuous rotation
    this.health = 2;
    this.maxHealth = 2;
    this.scoreValue = 25;
    this.active = true;
    this.spikeCount = 8;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rot += this.rotSpeed;
  }

  isOutOfBounds(height) {
    return this.y > height + 60;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);

    // Dark steel sphere covered in 8 razor-sharp protruding spikes
    ctx.fillStyle = '#2b323d';
    ctx.strokeStyle = '#444d5a';
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i < this.spikeCount; i++) {
      const angle = (i / this.spikeCount) * Math.PI * 2;
      const innerAngle = angle + Math.PI / (this.spikeCount * 2);
      const outerR = this.radius * 1.15;
      const innerR = this.radius * 0.5;

      const ox = Math.cos(angle) * outerR;
      const oy = Math.sin(angle) * outerR;
      const ix = Math.cos(innerAngle) * innerR;
      const iy = Math.sin(innerAngle) * innerR;

      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Dark Steel Inner Body
    ctx.fillStyle = '#1c222b';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff0033';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Ominous Red Center LED that blinks faster as it approaches the bottom!
    const blinkSpeed = 0.02 + (this.y / 600) * 0.08;
    const isBlinking = Math.floor(Date.now() * blinkSpeed) % 2 === 0;

    ctx.fillStyle = isBlinking ? '#ff0033' : '#660011';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    if (isBlinking) {
      ctx.fillStyle = '#ff6688';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
    }

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

export class SweepingLaserGrid {
  constructor(canvasWidth, gapX = 400) {
    this.y = -20;
    this.vy = 2.5;
    this.width = canvasWidth;
    this.gapX = gapX;
    this.gapWidth = 140;
    this.active = true;
  }

  update() {
    this.y += this.vy;
  }

  isOutOfBounds(height) {
    return this.y > height + 40;
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 6;

    // Left beam segment
    ctx.beginPath();
    ctx.moveTo(0, this.y);
    ctx.lineTo(this.gapX - this.gapWidth / 2, this.y);
    ctx.stroke();

    // Right beam segment
    ctx.beginPath();
    ctx.moveTo(this.gapX + this.gapWidth / 2, this.y);
    ctx.lineTo(this.width, this.y);
    ctx.stroke();

    ctx.restore();
  }
}

export class BlackHole {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 35;
    this.pullRadius = 220;
    this.vy = 0.5;
    this.rot = 0;
    this.active = true;
  }

  update(player, enemies, bullets) {
    this.y += this.vy;
    this.rot += 0.08;

    const pdx = this.x - player.x;
    const pdy = this.y - player.y;
    const pdist = Math.hypot(pdx, pdy);
    if (pdist < this.pullRadius && pdist > 10) {
      player.x += (pdx / pdist) * 1.8;
      player.y += (pdy / pdist) * 1.8;
    }

    bullets.forEach(b => {
      const bdx = this.x - b.x;
      const bdy = this.y - b.y;
      const bdist = Math.hypot(bdx, bdy);
      if (bdist < this.pullRadius) {
        b.x += (bdx / bdist) * 3.5;
        b.y += (bdy / bdist) * 3.5;
      }
    });
  }

  isOutOfBounds(height) {
    return this.y > height + 80;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, this.pullRadius * 0.4);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.5, 'rgba(120, 0, 255, 0.4)');
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.pullRadius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#a000ff';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

export class NebulaCloud {
  constructor(x, y, type = 'shield') {
    this.x = x;
    this.y = y;
    this.radius = 80;
    this.type = type;
    this.vy = 0.8;
    this.active = true;
  }

  update(player) {
    this.y += this.vy;
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    if (Math.hypot(dx, dy) < this.radius) {
      if (this.type === 'shield') {
        player.restoreShield(0.5);
      } else if (this.type === 'ion') {
        player.weapons.isOverheated = true;
      }
    }
  }

  isOutOfBounds(height) {
    return this.y > height + 100;
  }

  draw(ctx) {
    ctx.save();
    const color = this.type === 'shield' ? 'rgba(0, 136, 255, 0.18)' : 'rgba(255, 0, 85, 0.18)';
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class SolarFlareFog {
  constructor(x, y, isAcid = true) {
    this.x = x;
    this.y = y;
    this.radius = 110;
    this.isAcid = isAcid;
    this.vy = 0.6;
    this.active = true;
    this.tickTimer = 0;
  }

  update(player) {
    this.y += this.vy;
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    if (Math.hypot(dx, dy) < this.radius) {
      this.tickTimer++;
      if (this.tickTimer >= 30) {
        this.tickTimer = 0;
        player.takeDamage(5); // 5 tick damage per half-second
      }
    }
  }

  isOutOfBounds(height) {
    return this.y > height + 140;
  }

  draw(ctx) {
    ctx.save();
    const color0 = this.isAcid ? 'rgba(57, 255, 20, 0.25)' : 'rgba(255, 102, 0, 0.25)';
    const color1 = this.isAcid ? 'rgba(0, 200, 100, 0.05)' : 'rgba(255, 0, 85, 0.05)';
    const grad = ctx.createRadialGradient(this.x, this.y, 10, this.x, this.y, this.radius);
    grad.addColorStop(0, color0);
    grad.addColorStop(0.7, color1);
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

