// ═══════════════════════════════════════════════════════════════════════════════
// ██  ENTITIES
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Player ───────────────────────────────────────────────────────────────────

function drawPlayerShip(x, y, w, h, color, variant, thrusterAnim) {
  // Thruster flame
  const flameLen = 14 + Math.sin(thrusterAnim ?? 0) * 6;
  const gradient = ctx.createLinearGradient(x, y, x - flameLen, y + h / 2);
  gradient.addColorStop(0, 'rgba(0,180,255,0.9)');
  gradient.addColorStop(0.4, 'rgba(255,120,0,0.7)');
  gradient.addColorStop(1, 'rgba(255,60,0,0)');
  ctx.beginPath();
  ctx.moveTo(x + 4, y + h * 0.35);
  ctx.lineTo(x - flameLen, y + h / 2);
  ctx.lineTo(x + 4, y + h * 0.65);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Hull shape
  ctx.fillStyle = color;
  ctx.beginPath();
  if (variant === 1) {        // Wedge — wide flat rear
    ctx.moveTo(x + w,       y + h / 2);
    ctx.lineTo(x + w * 0.7, y);
    ctx.lineTo(x,           y + h * 0.1);
    ctx.lineTo(x,           y + h * 0.9);
    ctx.lineTo(x + w * 0.7, y + h);
  } else if (variant === 2) { // Dart — swept wings, narrow body
    ctx.moveTo(x + w,       y + h / 2);
    ctx.lineTo(x + w * 0.3, y);
    ctx.lineTo(x + w * 0.5, y + h * 0.35);
    ctx.lineTo(x,           y + h * 0.4);
    ctx.lineTo(x,           y + h * 0.6);
    ctx.lineTo(x + w * 0.5, y + h * 0.65);
    ctx.lineTo(x + w * 0.3, y + h);
  } else if (variant === 3) { // Cruiser — boxy, chunky wings
    ctx.moveTo(x + w,       y + h / 2);
    ctx.lineTo(x + w * 0.6, y + h * 0.15);
    ctx.lineTo(x + w * 0.2, y + h * 0.15);
    ctx.lineTo(x,           y);
    ctx.lineTo(x,           y + h);
    ctx.lineTo(x + w * 0.2, y + h * 0.85);
    ctx.lineTo(x + w * 0.6, y + h * 0.85);
  } else if (variant === 4) { // Delta — pure triangle
    ctx.moveTo(x + w,       y + h / 2);
    ctx.lineTo(x,           y);
    ctx.lineTo(x,           y + h);
  } else if (variant === 5) { // Razor — ultra-thin swept
    ctx.moveTo(x + w,       y + h / 2);
    ctx.lineTo(x + w * 0.4, y + h * 0.2);
    ctx.lineTo(x,           y + h * 0.35);
    ctx.lineTo(x,           y + h * 0.65);
    ctx.lineTo(x + w * 0.4, y + h * 0.8);
  } else if (variant === 6) { // Stealth — flat B-2 style
    ctx.moveTo(x + w,       y + h / 2);
    ctx.lineTo(x + w * 0.8, y + h * 0.1);
    ctx.lineTo(x + w * 0.5, y + h * 0.15);
    ctx.lineTo(x,           y + h * 0.3);
    ctx.lineTo(x,           y + h * 0.7);
    ctx.lineTo(x + w * 0.5, y + h * 0.85);
    ctx.lineTo(x + w * 0.8, y + h * 0.9);
  } else if (variant === 7) { // Bomber — wide boxy full-height
    ctx.moveTo(x + w,       y + h / 2);
    ctx.lineTo(x + w * 0.7, y);
    ctx.lineTo(x + w * 0.1, y);
    ctx.lineTo(x,           y + h * 0.3);
    ctx.lineTo(x,           y + h * 0.7);
    ctx.lineTo(x + w * 0.1, y + h);
    ctx.lineTo(x + w * 0.7, y + h);
  } else if (variant === 8) { // Scout — compact rounded
    ctx.moveTo(x + w,       y + h / 2);
    ctx.lineTo(x + w * 0.5, y + h * 0.05);
    ctx.lineTo(x + w * 0.1, y + h * 0.2);
    ctx.lineTo(x,           y + h * 0.5);
    ctx.lineTo(x + w * 0.1, y + h * 0.8);
    ctx.lineTo(x + w * 0.5, y + h * 0.95);
  } else if (variant === 9) { // Interceptor — twin-boom flanking fins
    ctx.moveTo(x + w,       y + h / 2);
    ctx.lineTo(x + w * 0.4, y + h * 0.3);
    ctx.lineTo(x + w * 0.6, y + h * 0.1);
    ctx.lineTo(x,           y + h * 0.25);
    ctx.lineTo(x,           y + h * 0.75);
    ctx.lineTo(x + w * 0.6, y + h * 0.9);
    ctx.lineTo(x + w * 0.4, y + h * 0.7);
  } else if (variant === 10) { // Hawk — forward-swept wings
    ctx.moveTo(x + w,        y + h / 2);
    ctx.lineTo(x + w * 0.3,  y);
    ctx.lineTo(x + w * 0.5,  y + h * 0.3);
    ctx.lineTo(x,            y + h * 0.45);
    ctx.lineTo(x,            y + h * 0.55);
    ctx.lineTo(x + w * 0.5,  y + h * 0.7);
    ctx.lineTo(x + w * 0.3,  y + h);
  } else if (variant === 11) { // X-Fighter — notched wing tips
    ctx.moveTo(x + w,        y + h / 2);
    ctx.lineTo(x + w * 0.5,  y);
    ctx.lineTo(x + w * 0.4,  y + h * 0.25);
    ctx.lineTo(x,            y + h * 0.1);
    ctx.lineTo(x,            y + h * 0.4);
    ctx.lineTo(x + w * 0.35, y + h / 2);
    ctx.lineTo(x,            y + h * 0.6);
    ctx.lineTo(x,            y + h * 0.9);
    ctx.lineTo(x + w * 0.4,  y + h * 0.75);
    ctx.lineTo(x + w * 0.5,  y + h);
  } else if (variant === 12) { // Mantis — rear spikes
    ctx.moveTo(x + w,        y + h / 2);
    ctx.lineTo(x + w * 0.6,  y + h * 0.2);
    ctx.lineTo(x + w * 0.3,  y + h * 0.2);
    ctx.lineTo(x + w * 0.3,  y);
    ctx.lineTo(x,            y + h * 0.35);
    ctx.lineTo(x,            y + h * 0.65);
    ctx.lineTo(x + w * 0.3,  y + h);
    ctx.lineTo(x + w * 0.3,  y + h * 0.8);
    ctx.lineTo(x + w * 0.6,  y + h * 0.8);
  } else if (variant === 13) { // Phantom — notched upper hull
    ctx.moveTo(x + w,        y + h / 2);
    ctx.lineTo(x + w * 0.6,  y);
    ctx.lineTo(x + w * 0.45, y + h * 0.25);
    ctx.lineTo(x + w * 0.25, y + h * 0.15);
    ctx.lineTo(x,            y + h * 0.3);
    ctx.lineTo(x,            y + h * 0.7);
    ctx.lineTo(x + w * 0.6,  y + h);
  } else if (variant === 14) { // Titan — maximum blockiness
    ctx.moveTo(x + w,        y + h / 2);
    ctx.lineTo(x + w * 0.75, y + h * 0.05);
    ctx.lineTo(x + w * 0.1,  y + h * 0.05);
    ctx.lineTo(x,            y + h * 0.2);
    ctx.lineTo(x,            y + h * 0.8);
    ctx.lineTo(x + w * 0.1,  y + h * 0.95);
    ctx.lineTo(x + w * 0.75, y + h * 0.95);
  } else if (variant === 15) { // Viper — S-curve profile
    ctx.moveTo(x + w,        y + h / 2);
    ctx.lineTo(x + w * 0.6,  y + h * 0.05);
    ctx.lineTo(x + w * 0.4,  y + h * 0.25);
    ctx.lineTo(x,            y + h * 0.15);
    ctx.lineTo(x,            y + h * 0.55);
    ctx.lineTo(x + w * 0.35, y + h * 0.6);
    ctx.lineTo(x + w * 0.35, y + h * 0.9);
    ctx.lineTo(x + w * 0.7,  y + h * 0.95);
  } else if (variant === 16) { // Raptor — spine ridge + swept wings
    ctx.moveTo(x + w,        y + h / 2);
    ctx.lineTo(x + w * 0.7,  y + h * 0.25);
    ctx.lineTo(x + w * 0.5,  y + h * 0.3);
    ctx.lineTo(x + w * 0.2,  y);
    ctx.lineTo(x,            y + h * 0.2);
    ctx.lineTo(x + w * 0.3,  y + h / 2);
    ctx.lineTo(x,            y + h * 0.8);
    ctx.lineTo(x + w * 0.2,  y + h);
    ctx.lineTo(x + w * 0.5,  y + h * 0.7);
    ctx.lineTo(x + w * 0.7,  y + h * 0.75);
  } else if (variant === 17) { // Javelin — ultra-long needle
    ctx.moveTo(x + w,        y + h / 2);
    ctx.lineTo(x + w * 0.15, y + h * 0.3);
    ctx.lineTo(x,            y + h * 0.4);
    ctx.lineTo(x,            y + h * 0.6);
    ctx.lineTo(x + w * 0.15, y + h * 0.7);
  } else if (variant === 18) { // Cobra — hooded flared rear
    ctx.moveTo(x + w,        y + h / 2);
    ctx.lineTo(x + w * 0.65, y + h * 0.1);
    ctx.lineTo(x + w * 0.4,  y + h * 0.2);
    ctx.lineTo(x + w * 0.2,  y);
    ctx.lineTo(x,            y + h * 0.1);
    ctx.lineTo(x + w * 0.1,  y + h * 0.5);
    ctx.lineTo(x,            y + h * 0.9);
    ctx.lineTo(x + w * 0.2,  y + h);
    ctx.lineTo(x + w * 0.4,  y + h * 0.8);
    ctx.lineTo(x + w * 0.65, y + h * 0.9);
  } else if (variant === 19) { // Omega — starburst rear + long nose
    ctx.moveTo(x + w,        y + h / 2);
    ctx.lineTo(x + w * 0.55, y + h * 0.1);
    ctx.lineTo(x + w * 0.4,  y);
    ctx.lineTo(x + w * 0.35, y + h * 0.2);
    ctx.lineTo(x + w * 0.15, y + h * 0.05);
    ctx.lineTo(x + w * 0.2,  y + h * 0.3);
    ctx.lineTo(x,            y + h * 0.25);
    ctx.lineTo(x + w * 0.1,  y + h / 2);
    ctx.lineTo(x,            y + h * 0.75);
    ctx.lineTo(x + w * 0.2,  y + h * 0.7);
    ctx.lineTo(x + w * 0.15, y + h * 0.95);
    ctx.lineTo(x + w * 0.35, y + h * 0.8);
    ctx.lineTo(x + w * 0.4,  y + h);
    ctx.lineTo(x + w * 0.55, y + h * 0.9);
  } else {                      // variant 0 — Arrowhead (default)
    ctx.moveTo(x + w,       y + h / 2);
    ctx.lineTo(x,           y);
    ctx.lineTo(x + w * 0.2, y + h / 2);
    ctx.lineTo(x,           y + h);
  }
  ctx.closePath();
  ctx.fill();

  // Cockpit — frosted glass
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.55, y + h / 2, w * 0.18, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wing accent stripe
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.3, y + h * 0.3);
  ctx.lineTo(x + w * 0.7, y + h * 0.5);
  ctx.lineTo(x + w * 0.3, y + h * 0.7);
  ctx.stroke();
}

class Player {
  constructor() {
    this.w = 48;
    this.h = 28;
    this.x = 80;
    this.y = CANVAS_H / 2 - this.h / 2;
    this.invincible = 0;
    this.shootCooldown = 0;
    this.thrusterAnim = 0;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt) {
    // Movement (speed boost doubles speed; hull+engine stats scale base speed)
    const stats = getShipStats();
    const baseSpd = PLAYER_SPEED * stats.speedMult;
    const spd = activeEffects && activeEffects.speedboost > 0 ? baseSpd * 1.6 : baseSpd;
    let vx = 0, vy = 0;
    if (isDown('ArrowUp',    'KeyW')) vy = -spd;
    if (isDown('ArrowDown',  'KeyS')) vy =  spd;
    if (isDown('ArrowLeft',  'KeyA')) vx = -spd;
    if (isDown('ArrowRight', 'KeyD')) vx =  spd;

    // Normalize diagonal (keyboard only)
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    // Touch joystick — only when no keyboard key is held
    if (IS_TOUCH && touch.joystick.active && vx === 0 && vy === 0) {
      vx = touch.joystick.dx * spd;
      vy = touch.joystick.dy * spd;
      // dx/dy are already normalized to a circle — no further diagonal reduction needed
    }

    this.x = Math.max(0, Math.min(CANVAS_W - this.w, this.x + vx * dt));
    this.y = Math.max(0, Math.min(CANVAS_H - this.h, this.y + vy * dt));

    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    this.thrusterAnim += dt * 12;
  }

  draw() {
    if (this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0) return;
    drawPlayerShip(this.x, this.y, this.w, this.h, playerColor, playerVariant, this.thrusterAnim);
  }

  tryShoot(bullets) {
    if (this.shootCooldown > 0) return;
    if (!isDown('Space') && !(IS_TOUCH && touch.fire.active)) return;
    const bx = this.x + this.w;
    const by = this.y + this.h / 2 - 2;
    const sStats = getShipStats();
    const bSpd   = BULLET_SPEED * sStats.bulletMult;
    const baseCd = SHOOT_COOLDOWN * sStats.cooldownMult;
    bullets.push(new Bullet(bx, by, bSpd));
    if (activeEffects && activeEffects.tripleshot > 0) {
      bullets.push(new Bullet(bx, by, bSpd * 0.92, -90));
      bullets.push(new Bullet(bx, by, bSpd * 0.92,  90));
    }
    this.shootCooldown = (activeEffects && activeEffects.rapidfire > 0)
      ? baseCd * 0.30
      : baseCd;
    playShoot();
  }

  hit() {
    if (this.invincible > 0) return false;
    this.invincible = INVINCIBLE_TIME * getShipStats().invincMult;
    return true;
  }
}

class Bullet {
  constructor(x, y, vx = BULLET_SPEED, vy = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.w = 18;
    this.h = 4;
    this.active = true;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x > CANVAS_W + 10 || this.y < -20 || this.y > CANVAS_H + 20) this.active = false;
  }

  draw() {
    // Glow
    ctx.shadowColor = '#ff0';
    ctx.shadowBlur  = 8;
    ctx.fillStyle = '#ffe566';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.shadowBlur = 0;
  }
}

// ─── Boss Bullet ──────────────────────────────────────────────────────────────
class BossBullet {
  constructor(x, y, vx, vy) {
    this.x  = x; this.y  = y;
    this.vx = vx; this.vy = vy;
    this.w  = 24; this.h  = 10;
    this.active = true;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -60 || this.x > CANVAS_W + 60 || this.y < -60 || this.y > CANVAS_H + 60)
      this.active = false;
  }
  draw() {
    ctx.save();
    ctx.shadowColor = '#f60';
    ctx.shadowBlur  = 12;
    ctx.translate(this.cx, this.cy);
    ctx.rotate(Math.atan2(this.vy, this.vx));
    ctx.fillStyle = '#f84';
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.fillStyle = '#ffa';
    ctx.fillRect(-this.w / 2, -2, this.w * 0.4, 4);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ─── Boss ─────────────────────────────────────────────────────────────────────
const BOSS_DEFS = {
  easy:   {
    names:       ['Spaceship Eater 450', 'Iron Fang',  'Void King', 'Night Hammer', 'Black Nova', 'Space Tyrant', 'War Pulse', 'Rift Lord', 'Dark Core'],
    colors:      ['#c44',               '#7cf',        '#b4f',      '#38e',          '#fa5',       '#f62',         '#3c8',      '#4ef',      '#f4b'],
    variants:    [0,                     1,             2,           3,               4,            0,              1,           2,           3],
    cannonCounts:[2,                     1,             3,           2,               1,            3,              2,           1,           3],
    maxHp: 30,  speed: 110, shootInterval: 2.8, bulletSpeed: 260, bulletCount: 1, chargeInterval: 14,
  },
  medium: {
    names:       ['Starcrusher', 'Voidstorm', 'Ironclad', 'Nightfall', 'Warbringer', 'Skybreaker', 'Darkstar', 'Dreadcore', 'Stormlord'],
    colors:      ['#ff0',        '#08f',      '#aaa',     '#80f',      '#f80',       '#0ff',       '#f0a',     '#5f0',      '#f05'],
    variants:    [0,              1,           2,          3,           4,            0,             1,          2,           3],
    cannonCounts:[1,              3,           2,          1,           2,            3,             1,          3,           2],
    maxHp: 65,  speed: 170, shootInterval: 1.8, bulletSpeed: 360, bulletCount: 2, chargeInterval: 9,
  },
  hard:   { name: 'Omega Devourer',      maxHp: 120, speed: 240, shootInterval: 0.9, bulletSpeed: 500, bulletCount: 3, chargeInterval: 5,  color: '#f44', variant: 4, cannonCount: 3 },
};

class Boss {
  constructor(level = 1) {
    const bossKey    = currentDiff === 'progress'
      ? (currentPlanet < 3 ? 'easy' : currentPlanet < 6 ? 'medium' : 'hard')
      : currentDiff;
    const def        = BOSS_DEFS[bossKey];
    this.aiLevel     = Math.min(1, (level - 1) / 8); // 0.0 at L1 → 1.0 at L9+
    this.name        = def.names
      ? (def.names[level - 1] ?? `${def.names[def.names.length - 1]} Mk.${level}`)
      : (level === 1 ? def.name : `${def.name} Mk.${level}`);
    this.color       = def.colors ? (def.colors[level - 1] ?? def.colors[def.colors.length - 1]) : def.color;
    this.variant     = def.variants ? (def.variants[level - 1] ?? 0) : (def.variant ?? 0);
    this.cannonCount = def.cannonCounts ? (def.cannonCounts[level - 1] ?? 2) : (def.cannonCount ?? 2);
    this.w           = 192;
    this.h           = 112;
    this.x           = CANVAS_W + 60;
    this.y           = CANVAS_H / 2 - this.h / 2;
    this.maxHp       = Math.floor(def.maxHp * (1 + (level - 1) * 0.5));
    this.hp          = this.maxHp;
    this.speed       = Math.min(def.speed       + (level - 1) * 20,   310);
    this.shootInterval  = Math.max(0.85, def.shootInterval - (level - 1) * 0.21);
    this.bulletSpeed    = Math.min(def.bulletSpeed + (level - 1) * 20, 480);
    this.bulletCount    = def.bulletCount; // fixed — no bullet scaling
    this.chargeInterval = Math.max(4, def.chargeInterval - (level - 1) * 1.2);
    this.homeX       = CANVAS_W - this.w - 80;
    this.entering    = true;
    this.shootTimer  = 2.0;
    this.chargeTimer = this.chargeInterval;
    this.charging    = false;
    this.chargeVx    = 0;
    this.anim        = 0;
    this.flashTimer  = 0;
    this.active      = true;
    this._prevPlayerCY = null; // for predictive aiming
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt, bossBullets) {
    this.anim += dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;

    if (this.entering) {
      this.x -= 220 * dt;
      if (this.x <= this.homeX) { this.x = this.homeX; this.entering = false; }
      return;
    }

    if (this.charging) {
      this.x += this.chargeVx * dt;
      this._trackY(dt * (0.4 + this.aiLevel * 0.3)); // tracks player better mid-charge at high levels
      if (this.chargeVx < 0 && this.x < Math.max(80, player.x - this.w - 10)) {
        this.chargeVx = 400 + this.aiLevel * 150; // faster retreat at higher levels
      }
      if (this.chargeVx > 0 && this.x >= this.homeX) {
        this.x = this.homeX;
        this.charging = false;
        this.chargeTimer = this.chargeInterval;
      }
      return;
    }

    this._trackY(dt);
    this._prevPlayerCY = player.cy;

    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this._shoot(bossBullets);
      this.shootTimer = this.shootInterval;
    }

    this.chargeTimer -= dt;
    if (this.chargeTimer <= 0) {
      this.charging = true;
      this.chargeVx = -(560 + this.aiLevel * 240); // 560 at L1 → 800 at L9
    }

    this.y = Math.max(10, Math.min(CANVAS_H - this.h - 10, this.y));
  }

  _trackY(dt) {
    // At higher AI levels the boss weaves sinusoidally, making it harder to hit
    const drift   = this.aiLevel * 48 * Math.sin(this.anim * (2 + this.aiLevel * 3.5));
    const targetY = player.y + player.h / 2 - this.h / 2 + drift;
    const dy      = targetY - this.y;
    const step    = this.speed * dt;
    this.y += Math.abs(dy) < step ? dy : Math.sign(dy) * step;
  }

  _shoot(bossBullets) {
    const ox = this.x;
    const oy = this.cy;
    // Predictive aiming: estimate where player will be when bullet arrives
    const rawDX = player.cx - ox;
    const rawDY = player.cy - oy;
    const dist  = Math.sqrt(rawDX * rawDX + rawDY * rawDY) || 1;
    const travelTime = dist / this.bulletSpeed;
    const playerVY  = this._prevPlayerCY !== null ? (player.cy - this._prevPlayerCY) : 0;
    const predictedDY = rawDY + playerVY * travelTime * this.aiLevel * 0.7;
    const dx  = rawDX;
    const dy  = predictedDY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len, ny = dy / len;
    const spreads = this.bulletCount === 1 ? [0]
                  : this.bulletCount === 2 ? [-0.22, 0.22]
                  :                          [-0.32, 0, 0.32];
    for (const a of spreads) {
      const c = Math.cos(a), s = Math.sin(a);
      bossBullets.push(new BossBullet(ox, oy,
        (nx * c - ny * s) * this.bulletSpeed,
        (nx * s + ny * c) * this.bulletSpeed));
    }
    playBossShoot();
  }

  hit() {
    this.hp = Math.max(0, this.hp - 1);
    this.flashTimer = 0.1;
    playBossHit();
    return this.hp <= 0;
  }

  draw() {
    const x = this.x, y = this.y, w = this.w, h = this.h;
    const c = this.color;
    ctx.save();

    // Hit flash: draw bright overlay
    if (this.flashTimer > 0) ctx.globalAlpha = 0.85;

    // Thruster flames (right side)
    const fl = 32 + Math.sin(this.anim * 10) * 12;
    const fg = ctx.createLinearGradient(x + w, y + h / 2, x + w + fl, y + h / 2);
    fg.addColorStop(0, 'rgba(255,120,0,0.95)');
    fg.addColorStop(0.5, 'rgba(255,60,0,0.6)');
    fg.addColorStop(1, 'rgba(255,0,0,0)');
    [[0.3, 0.7], [0.1, 0.3], [0.7, 0.9]].forEach(([t, b]) => {
      ctx.beginPath();
      ctx.moveTo(x + w - 8, y + h * t);
      ctx.lineTo(x + w + fl * (0.7 + (b - t)), y + h * ((t + b) / 2));
      ctx.lineTo(x + w - 8, y + h * b);
      ctx.closePath();
      ctx.fillStyle = fg;
      ctx.fill();
    });

    // Glow
    ctx.shadowColor = c;
    ctx.shadowBlur  = 28 + Math.sin(this.anim * 2) * 6;

    // Main hull — shape determined by this.variant (0–4)
    ctx.fillStyle = this.flashTimer > 0 ? '#fff' : c;
    ctx.beginPath();
    switch (this.variant) {
      case 1: // Fang — double-pronged nose
        ctx.moveTo(x,            y + h * 0.25);
        ctx.lineTo(x + w * 0.35, y + h * 0.12);
        ctx.lineTo(x + w * 0.35, y + h * 0.42);
        ctx.lineTo(x + w,        y + h * 0.05);
        ctx.lineTo(x + w * 0.8,  y + h * 0.5);
        ctx.lineTo(x + w,        y + h * 0.95);
        ctx.lineTo(x + w * 0.35, y + h * 0.58);
        ctx.lineTo(x + w * 0.35, y + h * 0.88);
        ctx.lineTo(x,            y + h * 0.75);
        ctx.lineTo(x + w * 0.15, y + h * 0.5);
        break;
      case 2: // Heavy Cruiser — wide swept wings
        ctx.moveTo(x + w * 0.05, y + h * 0.35);
        ctx.lineTo(x,            y + h * 0.5);
        ctx.lineTo(x + w * 0.05, y + h * 0.65);
        ctx.lineTo(x + w * 0.2,  y + h * 0.9);
        ctx.lineTo(x + w,        y + h);
        ctx.lineTo(x + w,        y);
        ctx.lineTo(x + w * 0.2,  y + h * 0.1);
        break;
      case 3: // Hammer — wide flat sides, narrow center
        ctx.moveTo(x,            y + h * 0.2);
        ctx.lineTo(x + w * 0.45, y);
        ctx.lineTo(x + w,        y + h * 0.15);
        ctx.lineTo(x + w * 0.65, y + h * 0.5);
        ctx.lineTo(x + w,        y + h * 0.85);
        ctx.lineTo(x + w * 0.45, y + h);
        ctx.lineTo(x,            y + h * 0.8);
        break;
      case 4: // Star — jagged multi-wing
        ctx.moveTo(x,            y + h * 0.5);
        ctx.lineTo(x + w * 0.25, y + h * 0.12);
        ctx.lineTo(x + w * 0.35, y + h * 0.3);
        ctx.lineTo(x + w * 0.6,  y);
        ctx.lineTo(x + w * 0.7,  y + h * 0.25);
        ctx.lineTo(x + w,        y + h * 0.2);
        ctx.lineTo(x + w * 0.85, y + h * 0.5);
        ctx.lineTo(x + w,        y + h * 0.8);
        ctx.lineTo(x + w * 0.7,  y + h * 0.75);
        ctx.lineTo(x + w * 0.6,  y + h);
        ctx.lineTo(x + w * 0.35, y + h * 0.7);
        ctx.lineTo(x + w * 0.25, y + h * 0.88);
        break;
      default: // Variant 0 — classic arrowhead
        ctx.moveTo(x,            y + h * 0.5);
        ctx.lineTo(x + w,        y);
        ctx.lineTo(x + w * 0.75, y + h * 0.5);
        ctx.lineTo(x + w,        y + h);
        break;
    }
    ctx.closePath();
    ctx.fill();

    // Dark center panel
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.flashTimer > 0 ? '#ddd' : 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.rect(x + w * 0.38, y + h * 0.32, w * 0.42, h * 0.36);
    ctx.fill();

    // Cockpit eye
    ctx.shadowColor = c;
    ctx.shadowBlur  = 18;
    ctx.fillStyle   = c;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.38, y + h / 2, w * 0.1, h * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.38, y + h / 2, w * 0.04, h * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cannon barrels — count determined by this.cannonCount
    const cannonFracs = this.cannonCount === 1 ? [0.5]
                      : this.cannonCount === 3 ? [0.25, 0.5, 0.75]
                      :                          [0.36, 0.64];
    for (const fy of cannonFracs) {
      ctx.fillStyle = '#222';
      ctx.fillRect(x - 16, y + h * fy - 4.5, 18, 9);
      ctx.fillStyle = c;
      ctx.fillRect(x - 18, y + h * fy - 3.5, 5, 7);
    }

    // Accent stripe
    ctx.strokeStyle = this.flashTimer > 0 ? '#fff' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.28, y + h * 0.32);
    ctx.lineTo(x + w * 0.65, y + h / 2);
    ctx.lineTo(x + w * 0.28, y + h * 0.68);
    ctx.stroke();

    ctx.restore();
  }
}

// ─── Asteroid ─────────────────────────────────────────────────────────────────
class Asteroid {
  constructor(x, y, tier) {
    this.tier    = tier;
    this.radius  = AST_TIERS[tier].radius;
    this.x       = x;
    this.y       = y;
    this.vx      = 0; // set by spawnAsteroid
    this.vy      = 0;
    this.rotation  = Math.random() * Math.PI * 2;
    this.rotSpeed  = rand(-1.5, 1.5);
    this.active    = true;

    // Pre-generate irregular polygon points
    const pts = 10;
    this.points = [];
    for (let i = 0; i < pts; i++) {
      const angle = (i / pts) * Math.PI * 2;
      const r = this.radius * rand(0.65, 1.0);
      this.points.push({ angle, r });
    }
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotSpeed * dt;

    // Bounce off top/bottom walls
    if (this.y - this.radius < 0)        { this.y = this.radius;        this.vy = Math.abs(this.vy); }
    if (this.y + this.radius > CANVAS_H) { this.y = CANVAS_H - this.radius; this.vy = -Math.abs(this.vy); }

    if (this.x + this.radius < -50) this.active = false;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.beginPath();
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const px = Math.cos(p.angle) * p.r;
      const py = Math.sin(p.angle) * p.r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Fill
    const shade = this.tier === 0 ? '#888' : this.tier === 1 ? '#999' : '#aaa';
    ctx.fillStyle = shade;
    ctx.fill();

    // Edge highlight
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Surface crack lines
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.2, -this.radius * 0.3);
    ctx.lineTo( this.radius * 0.1,  this.radius * 0.1);
    ctx.moveTo( this.radius * 0.1, -this.radius * 0.1);
    ctx.lineTo(-this.radius * 0.1,  this.radius * 0.2);
    ctx.stroke();

    ctx.restore();
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(40, 200);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life    = 0;
    this.maxLife = rand(0.3, 0.7);
    this.size    = rand(2, 5);
    this.color   = color;
    this.active  = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 1 - dt * 3;
    this.vy *= 1 - dt * 3;
    this.life += dt;
    if (this.life >= this.maxLife) this.active = false;
  }

  draw() {
    const alpha = 1 - this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

// ─── CoinPickup ───────────────────────────────────────────────────────────────
class CoinPickup {
  constructor(x, y) {
    this.x      = x;
    this.y      = y;
    this.r      = 9;
    this.anim   = Math.random() * Math.PI * 2;
    this.active = true;
  }

  update(dt) { this.anim += dt * 2.5; }

  draw() {
    const pulse = Math.sin(this.anim) * 2;
    const r     = this.r + pulse;
    ctx.save();
    ctx.shadowColor = '#fd0';
    ctx.shadowBlur  = 12 + pulse;
    // Solid gold outer circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#fd0';
    ctx.fill();
    // Dark inner circle to create ring/coin look
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    ctx.restore();
  }
}

class PowerUp {
  constructor(x, y, typeId) {
    this.x      = x;
    this.y      = y;
    this.typeId = typeId;
    this.radius = 24;
    this.anim   = 0;
    this.active = true;
  }

  update(dt) { this.anim += dt; }

  draw() {
    const info  = POWERUP_TYPES[this.typeId];
    const pulse = Math.sin(this.anim * 3) * 3;
    const r     = this.radius + pulse;

    ctx.save();
    ctx.shadowColor = info.color;
    ctx.shadowBlur  = 18 + pulse * 2;

    // Outer ring
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,20,0.75)';
    ctx.fill();
    ctx.strokeStyle = info.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Symbol
    ctx.fillStyle = info.color;
    ctx.font = `bold 13px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.symbol, this.x, this.y);

    // Label below
    ctx.fillStyle = '#ddd';
    ctx.font = `10px "Courier New", monospace`;
    ctx.fillText(info.label, this.x, this.y + r + 13);

    ctx.restore();
  }
}
