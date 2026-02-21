// ─── Constants ────────────────────────────────────────────────────────────────
let CANVAS_W = window.innerWidth;
let CANVAS_H = window.innerHeight;
const PLAYER_SPEED = 280;   // px/s
const BULLET_SPEED = 620;   // px/s
const SHOOT_COOLDOWN = 0.18; // seconds between shots
const BASE_SPAWN_INTERVAL = 1.4; // seconds between asteroid spawns
const BASE_AST_SPEED  = 160; // px/s (leftward)
const INVINCIBLE_TIME = 2.0; // seconds after hit
const STARTING_LIVES  = 3;

// Asteroid size tiers: [radius, hp, scoreValue]
const AST_TIERS = [
  { radius: 40, hp: 1, score: 100 }, // Large
  { radius: 22, hp: 1, score: 200 }, // Medium
  { radius: 12, hp: 1, score: 400 }, // Small
];

// Difficulty presets
const DIFFICULTIES = {
  easy: {
    label: 'EASY',   color: '#4f4',
    lives: 5,  spawnMult: 1.5,  speedMult: 0.7,
    largeChance: 0.30, medChance: 0.45,  // 30% large, 45% med, 25% small
  },
  medium: {
    label: 'MEDIUM', color: '#ff4',
    lives: 3,  spawnMult: 0.85, speedMult: 1.15,
    largeChance: 0.65, medChance: 0.30,  // 65% large, 30% med, 5% small
  },
  hard: {
    label: 'HARD',   color: '#f44',
    lives: 2,  spawnMult: 0.40, speedMult: 1.8,
    largeChance: 0.75, medChance: 0.20,  // 75% large, 20% med, 5% small
  },
};

let currentDiff = 'medium';
const diffButtonRects = [];
const menuButtonRects = [];
const gameOverButtonRects = [];
let controlsBackRect = null;
let changelogScrollY  = 0;
let changelogBackRect = null;

const CHANGELOG = [
  { v: 'v1.1.0',  title: 'Initial Release',           desc: 'Space shooter with asteroids, bullets, lives, score, and parallax star background.' },
  { v: 'v1.2.0',  title: 'Fullscreen',                desc: 'Game now fills the entire browser window and dynamically adapts to resize.' },
  { v: 'v1.3.0',  title: 'Pause Menu',                desc: 'Press ESC to pause with options to resume, restart, or return to the main menu.' },
  { v: 'v1.4.0',  title: 'Sound Effects',             desc: 'Added Web Audio API sounds for asteroid explosions, shooting, and player hit.' },
  { v: 'v1.5.0',  title: 'Louder Explosions',         desc: 'Asteroid explosion volume increased for better feedback.' },
  { v: 'v1.6.0',  title: 'Doubled Explosion Volume',  desc: 'Explosion sounds doubled in volume again for extra impact.' },
  { v: 'v1.7.0',  title: 'Main Menu from Pause',      desc: 'Added a Main Menu option to the pause screen.' },
  { v: 'v1.8.0',  title: 'Difficulty Modes',          desc: 'Easy, Medium, and Hard modes selectable before each game.' },
  { v: 'v1.9.0',  title: 'Difficulty Tuning',         desc: 'Medium has bigger and more frequent asteroids. Hard has constant fast barrages.' },
  { v: 'v1.10.0', title: 'Button Text Fix',           desc: 'Fixed text alignment inside Medium and Hard difficulty buttons.' },
  { v: 'v1.11.0', title: 'Difficulty Descriptions',   desc: 'Difficulty buttons now show specific stats: speed, lives, and spawn rate.' },
  { v: 'v1.12.0', title: 'Power-Up System',           desc: '6 power-up types (Rapid Fire, Triple Shot, Speed Boost, Shield, Bomb, Extra Life) spawn in pairs. Active effects shown in a bottom-left bar.' },
  { v: 'v1.13.0', title: 'Removed Notification Banner', desc: 'Removed the flashing "Power-Up Available" banner from the top of the screen.' },
  { v: 'v1.14.0', title: 'Power-Up Bar Colors',       desc: 'Each power-up pill uses its own color with a matching dark background.' },
  { v: 'v1.15.0', title: 'Instant Power-Ups',         desc: 'Power-ups apply immediately on touch. Timed ones fade out when they expire.' },
  { v: 'v1.16.0', title: 'How to Play Screen',        desc: 'New screen accessible from the main menu showing all controls and power-up info.' },
  { v: 'v1.17.0', title: 'Duration Brackets',         desc: 'Power-up durations shown in brackets at the end of each description.' },
  { v: 'v1.18.0', title: 'Random Power-Up Spawns',    desc: 'Power-ups now spawn at random time intervals instead of every 1000 points.' },
  { v: 'v1.19.0', title: 'Button Overflow Fix',       desc: 'Fixed text overflowing outside difficulty button borders on Medium and Hard.' },
  { v: 'v1.20.0', title: 'Power-Up Interval',         desc: 'Power-up spawn interval set to 15–30 seconds.' },
  { v: 'v1.21.0', title: 'Main Menu Buttons',         desc: 'Added styled PLAY and HOW TO PLAY buttons to the main menu.' },
  { v: 'v1.22.0', title: 'Blue Button Styling',       desc: 'Main menu buttons redesigned with blue border and dark blue background.' },
  { v: 'v1.23.0', title: 'Back Button',               desc: 'Added a clickable ← Back button to the How to Play screen.' },
  { v: 'v1.24.0', title: 'Back Button Spacing',       desc: 'Fixed Back button overlapping the instructions text in How to Play.' },
  { v: 'v1.25.0', title: 'Game Over Buttons',         desc: 'Added Play Again and Main Menu buttons to the Game Over screen.' },
  { v: 'v1.26.0', title: 'Difficulty Selection Fix',  desc: 'Fixed a bug where difficulty selection was skipped after returning from pause.' },
  { v: 'v1.27.0', title: 'Version Number',            desc: 'Added version number display to the bottom-right corner of the main menu.' },
  { v: 'v1.28.0', title: 'Changelog',                 desc: 'Added Changelog screen with a scrollable list of every improvement made to the game.' },
  { v: 'v1.29.0', title: 'Changelog Newest First',    desc: 'Changelog now displays the most recent version at the top.' },
  { v: 'v1.30.0', title: 'Power-Up Bar Overlap Fix',  desc: 'Fixed the countdown timer overlapping the power-up label. Label and timer are now stacked on separate lines.' },
  { v: 'v1.31.0', title: 'Boss Fight',                desc: 'At 10,000 points a boss spawns with a health bar, AI movement, bullet attacks, and charge attacks. Difficulty scales the boss stats and name: Easy = Spaceship Eater 450, Medium = Galaxy Warden, Hard = Omega Devourer.' },
  { v: 'v1.32.0', title: 'Boss Defeat Crash Fix',    desc: 'Fixed a crash where defeating the boss caused the game to freeze. A null reference in the bullet loop was stopping the game loop.' },
  { v: 'v1.33.0', title: 'Button-Only Navigation',   desc: 'Removed SPACE key shortcut from Game Over and Level Complete screens. Buttons must now be clicked to continue.' },
  { v: 'v1.34.0', title: 'How to Play Text Color',   desc: 'Improved visibility of the objective blurb text at the bottom of the How to Play screen.' },
  { v: 'v1.35.0', title: 'Save System',              desc: 'Game auto-saves when a level is completed. PLAY now shows New Game and Load Game options. Load Game resumes from the highest completed level with your saved score and lives.' },
  { v: 'v1.36.0', title: 'Delete Save Button',       desc: 'Added a red trash can button beside Load Game that deletes the saved game. Only visible when a save exists.' },
  { v: 'v1.37.0', title: 'Delete Save Confirmation', desc: 'Clicking the trash button now shows a confirmation popup before erasing the save file.' },
  { v: 'v1.38.0', title: 'Pause Menu Buttons',       desc: 'Replaced pause menu keyboard hints with clickable Resume, Restart, and Main Menu buttons.' },
  { v: 'v1.39.0', title: 'Pause Button Colors',      desc: 'Pause menu buttons are now green (Resume), red (Restart), and blue (Main Menu).' },
];

// Power-up definitions
const POWERUP_TYPES = {
  rapidfire:  { label: 'RAPID FIRE',  color: '#f80', symbol: 'RF', duration: 10, desc: 'Shoot 3x faster'      },
  tripleshot: { label: 'TRIPLE SHOT', color: '#d0f', symbol: '|||',duration: 10, desc: 'Fire 3 bullets at once'},
  speedboost: { label: 'SPEED BOOST', color: '#0f8', symbol: '>>',  duration: 10, desc: 'Move 1.6x faster'    },
  shield:     { label: 'SHIELD',      color: '#4af', symbol: 'SH',  duration: 0,  desc: '5s of invincibility' },
  bomb:       { label: 'BOMB',        color: '#f44', symbol: 'BM',  duration: 0,  desc: 'Clears all asteroids' },
  extralife:  { label: 'EXTRA LIFE',  color: '#f4f', symbol: '+1',  duration: 0,  desc: '+1 life'             },
};
const POWERUP_IDS = Object.keys(POWERUP_TYPES);

// ─── Canvas Setup ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  CANVAS_W = canvas.width;
  CANVAS_H = canvas.height;
  initStars();
}
window.addEventListener('resize', resize);

// ─── Audio ────────────────────────────────────────────────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playExplosion(tier) {
  if (audioCtx.state !== 'running') return;
  const duration = [0.5,  0.28, 0.13][tier];
  const cutoff   = [220,  480, 1100][tier];
  const volume   = [2.4, 1.7, 1.1][tier];

  const frames = Math.ceil(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, frames, audioCtx.sampleRate);
  const data   = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src    = audioCtx.createBufferSource();
  src.buffer   = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type  = 'lowpass';
  filter.frequency.value = cutoff;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  src.start();
}

function playShoot() {
  if (audioCtx.state !== 'running') return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(900, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.09);
  gain.gain.setValueAtTime(0.10, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.09);
}

function playPlayerHit() {
  if (audioCtx.state !== 'running') return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.35);
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.35);
}
function playBossShoot() {
  if (audioCtx.state !== 'running') return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(160, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.18);
  gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.18);
}
function playBossHit() {
  if (audioCtx.state !== 'running') return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}
function playBossDefeat() {
  if (audioCtx.state !== 'running') return;
  [0, 120, 260].forEach(delayMs => {
    setTimeout(() => playExplosion(0), delayMs);
  });
}

// ─── Input ────────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  // Resume audio on first interaction (browser autoplay policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // Toggle pause / back
  if (e.code === 'Escape') {
    if (gameState === 'PLAYING')         gameState = 'PAUSED';
    else if (gameState === 'PAUSED')     gameState = 'PLAYING';
    else if (gameState === 'DIFFICULTY') gameState = 'MENU';
    else if (gameState === 'PLAY_MODE')  { confirmDeleteVisible = false; gameState = 'MENU'; }
    else if (gameState === 'CONTROLS')   gameState = 'MENU';
    else if (gameState === 'CHANGELOG')  gameState = 'MENU';
  }

  keys[e.code] = true;
  e.preventDefault();
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
});
window.addEventListener('wheel', e => {
  if (gameState === 'CHANGELOG') {
    changelogScrollY = Math.max(0, changelogScrollY + e.deltaY);
  }
}, { passive: true });

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  if (gameState === 'MENU') {
    for (const btn of menuButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (btn.key === 'play')     gameState = 'PLAY_MODE';
        if (btn.key === 'controls')  gameState = 'CONTROLS';
        if (btn.key === 'changelog') { gameState = 'CHANGELOG'; changelogScrollY = 0; }
      }
    }
  } else if (gameState === 'CONTROLS') {
    if (controlsBackRect) {
      const r = controlsBackRect;
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        gameState = 'MENU';
      }
    }
  } else if (gameState === 'CHANGELOG') {
    if (changelogBackRect) {
      const r = changelogBackRect;
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        gameState = 'MENU';
      }
    }
  } else if (gameState === 'PAUSED') {
    for (const btn of pauseButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (btn.key === 'resume')  gameState = 'PLAYING';
        if (btn.key === 'restart') { gameState = 'PLAYING'; loadGame(); }
        if (btn.key === 'menu')    gameState = 'MENU';
      }
    }
  } else if (gameState === 'GAME_OVER') {
    for (const btn of gameOverButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (btn.key === 'play') { gameState = 'PLAYING'; loadGame(); }
        if (btn.key === 'menu') { gameState = 'MENU'; }
      }
    }
  } else if (gameState === 'LEVEL_COMPLETE') {
    for (const btn of levelCompleteButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (btn.key === 'continue') loadLevel(currentLevel + 1);
        if (btn.key === 'menu')     gameState = 'MENU';
      }
    }
  } else if (gameState === 'PLAY_MODE') {
    for (const btn of playModeButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (btn.key === 'new') {
          gameState = 'DIFFICULTY';
        } else if (btn.key === 'load') {
          try {
            const save = JSON.parse(localStorage.getItem('astroSave'));
            if (save) {
              currentDiff = save.diff;
              score       = save.score;
              lives       = save.lives;
              loadLevel(save.level);
            }
          } catch(e) {}
        } else if (btn.key === 'delete') {
          confirmDeleteVisible = true;
        } else if (btn.key === 'confirm_delete') {
          localStorage.removeItem('astroSave');
          confirmDeleteVisible = false;
        } else if (btn.key === 'cancel_delete') {
          confirmDeleteVisible = false;
        }
      }
    }
  } else if (gameState === 'DIFFICULTY') {
    for (const btn of diffButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        currentDiff = btn.key;
        gameState = 'PLAYING';
        loadGame();
      }
    }
  }
});

function isDown(...codes) {
  return codes.some(c => keys[c]);
}

// ─── Stars (parallax background) ──────────────────────────────────────────────
const STAR_LAYERS = [
  { count: 80,  speed: 25,  size: 1   },
  { count: 40,  speed: 55,  size: 1.5 },
  { count: 15,  speed: 100, size: 2   },
];

const stars = [];
function initStars() {
  stars.length = 0;
  for (const layer of STAR_LAYERS) {
    for (let i = 0; i < layer.count; i++) {
      stars.push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        speed: layer.speed,
        size: layer.size,
        brightness: 0.5 + Math.random() * 0.5,
      });
    }
  }
}

function updateStars(dt) {
  for (const s of stars) {
    s.x -= s.speed * dt;
    if (s.x + s.size < 0) s.x = CANVAS_W + s.size;
  }
}

function renderStars() {
  for (const s of stars) {
    ctx.fillStyle = `rgba(255,255,255,${s.brightness})`;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
}

// ─── Helper Functions ──────────────────────────────────────────────────────────
function hexDarken(hex, factor) {
  let r, g, b;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
}

function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// Closest point on AABB to circle center, returns distance
function circleRectDist(cx, cy, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  return dist(cx, cy, nearX, nearY);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

// ─── Classes ──────────────────────────────────────────────────────────────────

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
    // Movement (speed boost doubles speed)
    const spd = activeEffects && activeEffects.speedboost > 0 ? PLAYER_SPEED * 1.6 : PLAYER_SPEED;
    let vx = 0, vy = 0;
    if (isDown('ArrowUp',    'KeyW')) vy = -spd;
    if (isDown('ArrowDown',  'KeyS')) vy =  spd;
    if (isDown('ArrowLeft',  'KeyA')) vx = -spd;
    if (isDown('ArrowRight', 'KeyD')) vx =  spd;

    // Normalize diagonal
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    this.x = Math.max(0, Math.min(CANVAS_W - this.w, this.x + vx * dt));
    this.y = Math.max(0, Math.min(CANVAS_H - this.h, this.y + vy * dt));

    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    this.thrusterAnim += dt * 12;
  }

  draw() {
    const x = this.x, y = this.y, w = this.w, h = this.h;

    // Flash when invincible
    if (this.invincible > 0 && Math.floor(this.invincible * 10) % 2 === 0) return;

    // Thruster flame
    const flameLen = 14 + Math.sin(this.thrusterAnim) * 6;
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

    // Ship body
    ctx.fillStyle = '#4af';
    ctx.beginPath();
    ctx.moveTo(x + w,       y + h / 2);      // nose
    ctx.lineTo(x,           y);               // top-left
    ctx.lineTo(x + w * 0.2, y + h / 2);      // inner top
    ctx.lineTo(x,           y + h);           // bottom-left
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#9ef';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.55, y + h / 2, w * 0.18, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing accent
    ctx.strokeStyle = '#2cf';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.3);
    ctx.lineTo(x + w * 0.7, y + h * 0.5);
    ctx.lineTo(x + w * 0.3, y + h * 0.7);
    ctx.stroke();
  }

  tryShoot(bullets) {
    if (this.shootCooldown > 0) return;
    if (!isDown('Space')) return;
    const bx = this.x + this.w;
    const by = this.y + this.h / 2 - 2;
    bullets.push(new Bullet(bx, by));
    if (activeEffects && activeEffects.tripleshot > 0) {
      bullets.push(new Bullet(bx, by, BULLET_SPEED * 0.92, -90));
      bullets.push(new Bullet(bx, by, BULLET_SPEED * 0.92,  90));
    }
    this.shootCooldown = (activeEffects && activeEffects.rapidfire > 0)
      ? SHOOT_COOLDOWN * 0.30
      : SHOOT_COOLDOWN;
    playShoot();
  }

  hit() {
    if (this.invincible > 0) return false;
    this.invincible = INVINCIBLE_TIME;
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
  easy:   { name: 'Spaceship Eater 450', maxHp: 30,  speed: 110, shootInterval: 2.8, bulletSpeed: 260, bulletCount: 1, chargeInterval: 14, color: '#c44' },
  medium: { name: 'Galaxy Warden',       maxHp: 65,  speed: 170, shootInterval: 1.8, bulletSpeed: 360, bulletCount: 2, chargeInterval: 9,  color: '#a4f' },
  hard:   { name: 'Omega Devourer',      maxHp: 120, speed: 240, shootInterval: 0.9, bulletSpeed: 500, bulletCount: 3, chargeInterval: 5,  color: '#f44' },
};

class Boss {
  constructor(level = 1) {
    const def      = BOSS_DEFS[currentDiff];
    const lm       = 1 + (level - 1) * 0.4; // 40% harder per level
    this.name      = level === 1 ? def.name : `${def.name} Mk.${level}`;
    this.color     = def.color;
    this.w         = 192;
    this.h         = 112;
    this.x         = CANVAS_W + 60;
    this.y         = CANVAS_H / 2 - this.h / 2;
    this.maxHp     = Math.floor(def.maxHp * lm);
    this.hp        = this.maxHp;
    this.speed     = Math.min(def.speed * (1 + (level - 1) * 0.2), 380);
    this.shootInterval  = Math.max(0.45, def.shootInterval / (1 + (level - 1) * 0.25));
    this.bulletSpeed    = Math.min(def.bulletSpeed * (1 + (level - 1) * 0.15), 680);
    this.bulletCount    = Math.min(def.bulletCount + (level - 1), 5);
    this.chargeInterval = Math.max(3, def.chargeInterval - (level - 1) * 1.5);
    this.homeX     = CANVAS_W - this.w - 80;
    this.entering  = true;
    this.shootTimer     = 2.0;
    this.chargeTimer    = this.chargeInterval;
    this.charging  = false;
    this.chargeVx  = 0;
    this.anim      = 0;
    this.flashTimer = 0;
    this.active    = true;
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
      this._trackY(dt * 0.4);
      if (this.chargeVx < 0 && this.x < Math.max(80, player.x - this.w - 10)) {
        this.chargeVx = 400;
      }
      if (this.chargeVx > 0 && this.x >= this.homeX) {
        this.x = this.homeX;
        this.charging = false;
        this.chargeTimer = this.chargeInterval;
      }
      return;
    }

    this._trackY(dt);

    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this._shoot(bossBullets);
      this.shootTimer = this.shootInterval;
    }

    this.chargeTimer -= dt;
    if (this.chargeTimer <= 0) {
      this.charging = true;
      this.chargeVx = -580;
    }

    this.y = Math.max(10, Math.min(CANVAS_H - this.h - 10, this.y));
  }

  _trackY(dt) {
    const targetY = player.y + player.h / 2 - this.h / 2;
    const dy      = targetY - this.y;
    const step    = this.speed * dt;
    this.y += Math.abs(dy) < step ? dy : Math.sign(dy) * step;
  }

  _shoot(bossBullets) {
    const ox = this.x;
    const oy = this.cy;
    const dx = player.cx - ox;
    const dy = player.cy - oy;
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

    // Main hull (points left)
    ctx.fillStyle = this.flashTimer > 0 ? '#fff' : c;
    ctx.beginPath();
    ctx.moveTo(x,          y + h / 2);
    ctx.lineTo(x + w,      y);
    ctx.lineTo(x + w * 0.75, y + h / 2);
    ctx.lineTo(x + w,      y + h);
    ctx.closePath();
    ctx.fill();

    // Dark secondary panels
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.flashTimer > 0 ? '#ddd' : 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.38);
    ctx.lineTo(x + w * 0.8, y + h * 0.12);
    ctx.lineTo(x + w,       y + h * 0.08);
    ctx.lineTo(x + w,       y + h * 0.28);
    ctx.lineTo(x + w * 0.45, y + h * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.62);
    ctx.lineTo(x + w * 0.8, y + h * 0.88);
    ctx.lineTo(x + w,       y + h * 0.92);
    ctx.lineTo(x + w,       y + h * 0.72);
    ctx.lineTo(x + w * 0.45, y + h * 0.62);
    ctx.closePath();
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

    // Cannon barrels (left nose)
    ctx.fillStyle = '#222';
    ctx.fillRect(x - 16, y + h * 0.36, 18, 9);
    ctx.fillRect(x - 16, y + h * 0.55, 18, 9);
    ctx.fillStyle = c;
    ctx.fillRect(x - 18, y + h * 0.37, 5, 7);
    ctx.fillRect(x - 18, y + h * 0.56, 5, 7);

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

// ─── Game State ───────────────────────────────────────────────────────────────
let gameState;   // 'MENU' | 'PLAY_MODE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'LEVEL_COMPLETE'
let player, bullets, asteroids, particles;
let score, lives;
let spawnTimer, spawnInterval;
let difficultyTimer, astSpeedMult;
let gameTime;
let powerups, collectedPowerups, powerupTimer;
let activeEffects;  // { rapidfire, tripleshot, speedboost } — seconds remaining
let boss, bossBullets, bossSpawned, bossDefeated, bossWarningTimer;
let currentLevel, nextBossScore;
const levelCompleteButtonRects = [];
const playModeButtonRects = [];
const pauseButtonRects = [];
let confirmDeleteVisible = false;

function loadGame() {
  const d    = DIFFICULTIES[currentDiff];
  player     = new Player();
  bullets    = [];
  asteroids  = [];
  particles  = [];
  powerups   = [];
  collectedPowerups = [];
  activeEffects = { rapidfire: 0, tripleshot: 0, speedboost: 0 };
  powerupTimer    = rand(15, 30);
  score      = 0;
  lives      = d.lives;
  spawnTimer = 0;
  spawnInterval   = BASE_SPAWN_INTERVAL * d.spawnMult;
  difficultyTimer = 0;
  astSpeedMult    = d.speedMult;
  gameTime        = 0;
  boss            = null;
  bossBullets     = [];
  bossSpawned     = false;
  bossDefeated    = false;
  bossWarningTimer = 0;
  currentLevel    = 1;
  nextBossScore   = 10000;
}

function loadLevel(level) {
  const d       = DIFFICULTIES[currentDiff];
  const lm      = 1 + (level - 1) * 0.3; // 30% harder per level
  currentLevel  = level;
  // Clear the field, keep player position and lives
  player        = new Player();
  bullets       = [];
  asteroids     = [];
  particles     = [];
  powerups      = [];
  collectedPowerups = [];
  bossBullets   = [];
  activeEffects = { rapidfire: 0, tripleshot: 0, speedboost: 0 };
  powerupTimer  = rand(15, 30);
  spawnTimer    = 0;
  difficultyTimer = 0;
  gameTime      = 0;
  spawnInterval = Math.max(0.35, BASE_SPAWN_INTERVAL * d.spawnMult / lm);
  astSpeedMult  = d.speedMult * lm;
  nextBossScore = score + 8000 + (level - 1) * 2000;
  boss          = null;
  bossSpawned   = false;
  bossDefeated  = false;
  bossWarningTimer = 0;
  gameState     = 'PLAYING';
}

function saveGame() {
  localStorage.setItem('astroSave', JSON.stringify({
    level: currentLevel + 1,
    diff:  currentDiff,
    score: score,
    lives: lives,
  }));
}

function spawnAsteroid(tier) {
  if (tier === undefined) {
    const d = DIFFICULTIES[currentDiff];
    const r = Math.random();
    tier = r < d.largeChance ? 0 : r < d.largeChance + d.medChance ? 1 : 2;
  }
  const ast = new Asteroid(
    CANVAS_W + AST_TIERS[tier].radius + 10,
    rand(AST_TIERS[tier].radius + 10, CANVAS_H - AST_TIERS[tier].radius - 10),
    tier
  );
  const speed = rand(0.75, 1.25) * BASE_AST_SPEED * astSpeedMult;
  ast.vx = -speed;
  ast.vy = rand(-50, 50) * astSpeedMult;
  asteroids.push(ast);
}

function spawnParticles(x, y, count, colors) {
  for (let i = 0; i < count; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push(new Particle(x, y, color));
  }
}

function spawnPowerupPair() {
  // Pick 2 different random power-up types
  const shuffled = [...POWERUP_IDS].sort(() => Math.random() - 0.5);
  const chosen = shuffled.slice(0, 2);

  const placed = [];
  for (const id of chosen) {
    let x, y, tries = 0;
    do {
      x = rand(CANVAS_W * 0.15, CANVAS_W * 0.80);
      y = rand(80, CANVAS_H - 80);
      tries++;
    } while (
      tries < 30 &&
      (placed.some(p => dist(x, y, p.x, p.y) < 180) ||
       dist(x, y, player.x + player.w / 2, player.y + player.h / 2) < 120)
    );
    placed.push({ x, y });
    powerups.push(new PowerUp(x, y, id));
  }
}

// Called when player flies into a world power-up — applies instantly
function collectPowerup(typeId) {
  // Remove both world power-ups in the pair
  for (const pu of powerups) pu.active = false;

  const info = POWERUP_TYPES[typeId];
  let instantFade = false;

  switch (typeId) {
    case 'rapidfire':
      activeEffects.rapidfire  = info.duration;
      break;
    case 'tripleshot':
      activeEffects.tripleshot = info.duration;
      break;
    case 'speedboost':
      activeEffects.speedboost = info.duration;
      break;
    case 'shield':
      player.invincible = Math.max(player.invincible, 5.0);
      instantFade = true;
      break;
    case 'bomb':
      for (const a of asteroids) {
        if (!a.active) continue;
        spawnParticles(a.x, a.y, 8, ['#fa0', '#f60', '#ff0', '#fff']);
        playExplosion(a.tier);
        a.active = false;
      }
      instantFade = true;
      break;
    case 'extralife':
      lives = Math.min(lives + 1, 9);
      instantFade = true;
      break;
  }

  collectedPowerups.push({ typeId, fadeAlpha: 1, fading: instantFade });
}

// ─── Update ───────────────────────────────────────────────────────────────────
function update(dt) {
  updateStars(dt);

  if (gameState === 'MENU') {
    if (keys['Space']) {
      keys['Space'] = false;
      gameState = 'PLAY_MODE';
    }
    if (keys['KeyC']) {
      keys['KeyC'] = false;
      gameState = 'CONTROLS';
    }
    return;
  }

  if (gameState === 'CONTROLS') {
    if (keys['Escape'] || keys['KeyC']) {
      keys['Escape'] = false;
      keys['KeyC'] = false;
      gameState = 'MENU';
    }
    return;
  }

  if (gameState === 'CHANGELOG') {
    if (keys['Escape']) { keys['Escape'] = false; gameState = 'MENU'; }
    if (keys['ArrowUp'])   changelogScrollY = Math.max(0, changelogScrollY - 120);
    if (keys['ArrowDown']) changelogScrollY += 120;
    return;
  }

  if (gameState === 'PLAY_MODE') {
    return;
  }

  if (gameState === 'DIFFICULTY') {
    const map = { Digit1: 'easy', Digit2: 'medium', Digit3: 'hard' };
    for (const [code, diff] of Object.entries(map)) {
      if (keys[code]) {
        keys[code] = false;
        currentDiff = diff;
        gameState = 'PLAYING';
        loadGame();
      }
    }
    return;
  }

  if (gameState === 'GAME_OVER') {
    if (keys['KeyM']) {
      keys['KeyM'] = false;
      gameState = 'MENU';
    }
    return;
  }

  if (gameState === 'LEVEL_COMPLETE') {
    if (keys['KeyM']) {
      keys['KeyM'] = false;
      gameState = 'MENU';
    }
    return;
  }

  if (gameState === 'PAUSED') {
    if (keys['KeyR']) {
      keys['KeyR'] = false;
      gameState = 'PLAYING';
      loadGame();
    }
    if (keys['KeyM']) {
      keys['KeyM'] = false;
      gameState = 'MENU';
    }
    return;
  }

  // ── PLAYING ──────────────────────────────────────────────────────────────
  gameTime += dt;

  // Difficulty ramp every 15s
  difficultyTimer += dt;
  if (difficultyTimer >= 15) {
    difficultyTimer -= 15;
    astSpeedMult   = Math.min(astSpeedMult * 1.12, 2.5);
    spawnInterval  = Math.max(spawnInterval * 0.88, 0.4);
  }

  // Spawn asteroids
  spawnTimer += dt;
  if (spawnTimer >= spawnInterval) {
    spawnTimer -= spawnInterval;
    spawnAsteroid();
  }

  // Update player
  player.update(dt);
  player.tryShoot(bullets);

  // Update bullets
  for (const b of bullets) b.update(dt);
  bullets = bullets.filter(b => b.active);

  // Update asteroids
  for (const a of asteroids) a.update(dt);

  // Update particles
  for (const p of particles) p.update(dt);
  particles = particles.filter(p => p.active);

  // ── Collision: bullets vs asteroids ───────────────────────────────────────
  for (const b of bullets) {
    if (!b.active) continue;
    for (const a of asteroids) {
      if (!a.active) continue;
      if (dist(b.cx, b.cy, a.x, a.y) < a.radius) {
        b.active = false;
        a.active = false;
        score += AST_TIERS[a.tier].score;

        // Explosion particles + sound
        spawnParticles(a.x, a.y, 10, ['#fa0', '#f60', '#ff0', '#fff']);
        playExplosion(a.tier);

        // Split into smaller asteroids
        if (a.tier < 2) {
          for (let s = 0; s < 2; s++) {
            const child = new Asteroid(a.x, a.y, a.tier + 1);
            const spread = rand(0.5, 1.5) * BASE_AST_SPEED * astSpeedMult;
            child.vx = a.vx + rand(-30, 30);
            child.vy = s === 0 ? -spread * 0.5 : spread * 0.5;
            asteroids.push(child);
          }
        }
        break;
      }
    }
  }

  // ── Collision: player vs asteroids ────────────────────────────────────────
  for (const a of asteroids) {
    if (!a.active) continue;
    if (circleRectDist(a.x, a.y, player.x, player.y, player.w, player.h) < a.radius * 0.85) {
      if (player.hit()) {
        lives--;
        playPlayerHit();
        spawnParticles(player.cx, player.cy, 8, ['#4af', '#fff', '#08f']);
        if (lives <= 0) {
          gameState = 'GAME_OVER';
        }
      }
    }
  }

  // Clean up inactive asteroids
  asteroids = asteroids.filter(a => a.active);

  // ── Boss spawn ───────────────────────────────────────────────────────────
  if (!bossSpawned && score >= nextBossScore) {
    bossSpawned      = true;
    boss             = new Boss(currentLevel);
    bossWarningTimer = 3.0;
  }
  if (bossWarningTimer > 0) bossWarningTimer -= dt;

  // ── Boss update + collisions ─────────────────────────────────────────────
  if (boss && boss.active) {
    boss.update(dt, bossBullets);

    // Player bullets → boss
    for (const b of bullets) {
      if (!b.active) continue;
      if (b.x > boss.x && b.x < boss.x + boss.w &&
          b.y > boss.y && b.y < boss.y + boss.h) {
        b.active = false;
        if (boss.hit()) {
          // Defeated
          bossDefeated = true;
          score += 5000;
          lives += 2;
          for (let i = 0; i < 5; i++) {
            spawnParticles(
              boss.x + Math.random() * boss.w,
              boss.y + Math.random() * boss.h,
              12, ['#f44', '#f84', '#ff0', '#fff', '#f00']
            );
          }
          playBossDefeat();
          boss = null;
          gameState = 'LEVEL_COMPLETE';
          saveGame();
          break;
        }
      }
    }

    // Boss body → player
    if (boss) {
      const bossCollideR = boss.w * 0.38;
      if (circleRectDist(boss.cx, boss.cy, player.x, player.y, player.w, player.h) < bossCollideR) {
        if (player.hit()) {
          lives--;
          playPlayerHit();
          spawnParticles(player.cx, player.cy, 8, ['#4af', '#fff', '#08f']);
          if (lives <= 0) gameState = 'GAME_OVER';
        }
      }
    }
  }

  // Boss bullets update + player collision
  for (const bb of bossBullets) bb.update(dt);
  for (const bb of bossBullets) {
    if (!bb.active) continue;
    if (bb.x < player.x + player.w && bb.x + bb.w > player.x &&
        bb.y < player.y + player.h && bb.y + bb.h > player.y) {
      bb.active = false;
      if (player.hit()) {
        lives--;
        playPlayerHit();
        spawnParticles(player.cx, player.cy, 8, ['#f44', '#f84', '#f00']);
        if (lives <= 0) gameState = 'GAME_OVER';
      }
    }
  }
  bossBullets = bossBullets.filter(bb => bb.active);

  // ── Active effect timers ─────────────────────────────────────────────────
  for (const key of Object.keys(activeEffects)) {
    if (activeEffects[key] > 0) activeEffects[key] = Math.max(0, activeEffects[key] - dt);
  }

  // ── Power-up bar fade-out ────────────────────────────────────────────────
  for (const cp of collectedPowerups) {
    const info = POWERUP_TYPES[cp.typeId];
    // Start fading a timed power-up once its effect expires
    if (!cp.fading && info.duration > 0 && activeEffects[cp.typeId] === 0) {
      cp.fading = true;
    }
    if (cp.fading) {
      cp.fadeAlpha = Math.max(0, cp.fadeAlpha - dt / 0.7);
    }
  }
  collectedPowerups = collectedPowerups.filter(cp => cp.fadeAlpha > 0);

  // ── Random power-up timer ────────────────────────────────────────────────
  powerupTimer -= dt;
  if (powerupTimer <= 0 && powerups.length === 0) {
    spawnPowerupPair();
    powerupTimer = rand(15, 30);
  } else if (powerupTimer <= 0) {
    powerupTimer = rand(5, 10); // retry soon if a pair is already on screen
  }

  // ── Update power-ups + pickup collision ──────────────────────────────────
  for (const pu of powerups) pu.update(dt);
  for (const pu of powerups) {
    if (!pu.active) continue;
    if (dist(player.cx, player.cy, pu.x, pu.y) < pu.radius + 18) {
      collectPowerup(pu.typeId);
      break;
    }
  }
  powerups = powerups.filter(pu => pu.active);
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  // Background
  ctx.fillStyle = '#05050f';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  renderStars();

  if (gameState === 'MENU') {
    renderMenu();
    return;
  }

  if (gameState === 'PLAY_MODE') {
    renderPlayMode();
    return;
  }

  if (gameState === 'DIFFICULTY') {
    renderDifficulty();
    return;
  }

  if (gameState === 'CONTROLS') {
    renderControls();
    return;
  }

  if (gameState === 'CHANGELOG') {
    renderChangelog();
    return;
  }

  if (gameState === 'GAME_OVER') {
    renderGameOver();
    return;
  }

  if (gameState === 'LEVEL_COMPLETE') {
    renderLevelComplete();
    return;
  }

  // PLAYING + PAUSED (draw frozen world, then overlay if paused)
  for (const a of asteroids) a.draw();
  for (const b of bullets)   b.draw();
  player.draw();
  for (const p of particles) p.draw();
  for (const pu of powerups)  pu.draw();
  for (const bb of bossBullets) bb.draw();
  if (boss && boss.active) boss.draw();

  renderHUD();
  renderBossHealthBar();
  renderBossWarning();
  renderPowerupBar();
  if (gameState === 'PAUSED') renderPaused();
}

function renderHUD() {
  // Dark strip
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, CANVAS_W, 38);

  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.textBaseline = 'middle';

  // Score
  ctx.fillStyle = '#4af';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${score}`, 14, 19);

  // Time
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'center';
  ctx.fillText(`TIME: ${Math.floor(gameTime)}s`, CANVAS_W / 2, 19);

  // Lives
  ctx.fillStyle = '#f44';
  ctx.textAlign = 'right';
  ctx.fillText(`LIVES: ${'♥ '.repeat(lives).trim()}`, CANVAS_W - 14, 19);

  ctx.textAlign = 'left';
}

function renderMenu() {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.font = 'bold 52px "Courier New", monospace';
  ctx.fillStyle = '#4af';
  ctx.shadowColor = '#0af';
  ctx.shadowBlur = 20;
  ctx.fillText('ASTEROID BLASTER', CANVAS_W / 2, CANVAS_H / 2 - 130);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.font = '18px "Courier New", monospace';
  ctx.fillStyle = '#8cf';
  ctx.fillText('Navigate the asteroid field and survive as long as you can', CANVAS_W / 2, CANVAS_H / 2 - 78);

  // Buttons
  menuButtonRects.length = 0;
  const btnW = 320, gap = 18;
  const cx = CANVAS_W / 2;

  const buttons = [
    { key: 'play',      label: 'PLAY',        hint: 'SPACE', color: '#4af', bg: 'rgba(0,40,90,0.75)', btnH: 58 },
    { key: 'controls',  label: 'HOW TO PLAY',  hint: 'C',     color: '#4af', bg: 'rgba(0,30,70,0.65)', btnH: 48 },
    { key: 'changelog', label: 'CHANGELOG',    hint: '',      color: '#4af', bg: 'rgba(0,30,70,0.65)', btnH: 48 },
  ];

  let btnY = CANVAS_H / 2 - 40;
  for (const b of buttons) {
    const bx  = cx - btnW / 2;
    const bcy = btnY + b.btnH / 2;
    menuButtonRects.push({ x: bx, y: btnY, w: btnW, h: b.btnH, key: b.key });

    // Glow on play button
    if (b.key === 'play') {
      ctx.shadowColor = b.color;
      ctx.shadowBlur  = 12;
    }

    // Background
    ctx.fillStyle   = b.bg;
    ctx.strokeStyle = b.color;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(bx, btnY, btnW, b.btnH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${b.key === 'play' ? 22 : 16}px "Courier New", monospace`;
    ctx.fillText(b.label, cx, bcy);

    // Key hint (right-aligned inside button)
    ctx.fillStyle = b.color;
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(b.hint, bx + btnW - 14, bcy);
    ctx.textAlign = 'center';

    btnY += b.btnH + gap;
  }

  // Version
  ctx.fillStyle    = '#778';
  ctx.font         = '15px "Courier New", monospace';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('v1.39.0', CANVAS_W - 10, CANVAS_H - 8);

  ctx.restore();
}

function renderPlayMode() {
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = 'rgba(0,0,20,0.88)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.font        = 'bold 42px "Courier New", monospace';
  ctx.fillStyle   = '#fff';
  ctx.shadowColor = '#44f';
  ctx.shadowBlur  = 18;
  ctx.fillText('HOW DO YOU WANT TO PLAY?', CANVAS_W / 2, CANVAS_H / 2 - 100);
  ctx.shadowBlur  = 0;

  playModeButtonRects.length = 0;
  const btnW = 360, cx = CANVAS_W / 2, gap = 20;
  const save = (() => { try { return JSON.parse(localStorage.getItem('astroSave')); } catch(e) { return null; } })();
  const hasSave = save && save.level && save.diff;

  const buttons = [
    { key: 'new',  label: 'NEW GAME', sub: null, color: '#4af', bg: 'rgba(0,40,90,0.85)', btnH: 68, enabled: true },
    {
      key: 'load',
      label: 'LOAD GAME',
      sub: hasSave ? `Level ${save.level}  ·  ${DIFFICULTIES[save.diff].label}` : 'No save found',
      color: hasSave ? '#4f8' : '#446',
      bg:    hasSave ? 'rgba(0,50,25,0.85)' : 'rgba(10,10,20,0.6)',
      btnH: 68,
      enabled: hasSave,
    },
  ];

  const trashSize = 44, trashGap = 12;
  let btnY = CANVAS_H / 2 - 30;
  for (const b of buttons) {
    const bx  = cx - btnW / 2;
    const bcy = btnY + b.btnH / 2;
    if (b.enabled) playModeButtonRects.push({ x: bx, y: btnY, w: btnW, h: b.btnH, key: b.key });

    if (b.enabled) { ctx.shadowColor = b.color; ctx.shadowBlur = 10; }
    ctx.fillStyle   = b.bg;
    ctx.strokeStyle = b.color;
    ctx.lineWidth   = b.enabled ? 2 : 1;
    ctx.globalAlpha = b.enabled ? 1 : 0.4;
    ctx.beginPath();
    ctx.roundRect(bx, btnY, btnW, b.btnH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur  = 0;

    ctx.fillStyle = '#fff';
    ctx.font      = `bold 20px "Courier New", monospace`;
    ctx.fillText(b.label, cx, b.sub ? bcy - 10 : bcy);

    if (b.sub) {
      ctx.font      = '13px "Courier New", monospace';
      ctx.fillStyle = b.color;
      ctx.fillText(b.sub, cx, bcy + 12);
    }

    ctx.globalAlpha = 1;

    // Trash button — only beside the load row when a save exists
    if (b.key === 'load' && hasSave) {
      const tx = bx + btnW + trashGap;
      const ty = btnY + (b.btnH - trashSize) / 2;
      playModeButtonRects.push({ x: tx, y: ty, w: trashSize, h: trashSize, key: 'delete' });

      ctx.shadowColor = '#f44';
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = 'rgba(80,0,0,0.85)';
      ctx.strokeStyle = '#f44';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.roundRect(tx, ty, trashSize, trashSize, 10);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw trash can icon
      const ix = tx + trashSize / 2, iy = ty + trashSize / 2;
      ctx.strokeStyle = '#f88';
      ctx.lineWidth   = 1.5;
      ctx.lineCap     = 'round';

      // Lid
      ctx.beginPath();
      ctx.moveTo(ix - 9, iy - 6);
      ctx.lineTo(ix + 9, iy - 6);
      ctx.stroke();
      // Handle on lid
      ctx.beginPath();
      ctx.moveTo(ix - 4, iy - 6);
      ctx.lineTo(ix - 4, iy - 9);
      ctx.lineTo(ix + 4, iy - 9);
      ctx.lineTo(ix + 4, iy - 6);
      ctx.stroke();
      // Body
      ctx.beginPath();
      ctx.moveTo(ix - 7, iy - 4);
      ctx.lineTo(ix - 6, iy + 8);
      ctx.lineTo(ix + 6, iy + 8);
      ctx.lineTo(ix + 7, iy - 4);
      ctx.stroke();
      // Inner lines
      for (const ox of [-3, 0, 3]) {
        ctx.beginPath();
        ctx.moveTo(ix + ox, iy - 2);
        ctx.lineTo(ix + ox, iy + 6);
        ctx.stroke();
      }
    }

    btnY += b.btnH + gap;
  }

  ctx.fillStyle = '#555';
  ctx.font      = '14px "Courier New", monospace';
  ctx.fillText('ESC — Back', cx, btnY + 20);

  // Confirmation popup
  if (confirmDeleteVisible) {
    const pw = 420, ph = 180, px = cx - pw / 2, py = CANVAS_H / 2 - ph / 2;

    // Scrim
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Box
    ctx.shadowColor = '#f44';
    ctx.shadowBlur  = 18;
    ctx.fillStyle   = 'rgba(25,5,5,0.97)';
    ctx.strokeStyle = '#f44';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 14);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Message
    ctx.font      = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('Erase this save file?', cx, py + 44);
    ctx.font      = '13px "Courier New", monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('This cannot be undone.', cx, py + 68);

    // Buttons
    const bw = 150, bh = 44, bgap = 20;
    const yesX = cx - bw - bgap / 2, noX = cx + bgap / 2, bby = py + ph - bh - 22;

    // Yes button
    playModeButtonRects.push({ x: yesX, y: bby, w: bw, h: bh, key: 'confirm_delete' });
    ctx.shadowColor = '#f44'; ctx.shadowBlur = 8;
    ctx.fillStyle   = 'rgba(80,0,0,0.9)';
    ctx.strokeStyle = '#f44';
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.roundRect(yesX, bby, bw, bh, 8); ctx.fill(); ctx.stroke();
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = '#fff';
    ctx.font        = 'bold 15px "Courier New", monospace';
    ctx.fillText('Yes, Erase', yesX + bw / 2, bby + bh / 2);

    // No button
    playModeButtonRects.push({ x: noX, y: bby, w: bw, h: bh, key: 'cancel_delete' });
    ctx.fillStyle   = 'rgba(0,30,70,0.9)';
    ctx.strokeStyle = '#4af';
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.roundRect(noX, bby, bw, bh, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle   = '#fff';
    ctx.fillText('Cancel', noX + bw / 2, bby + bh / 2);
  }

  ctx.restore();
}

function renderDifficulty() {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Background overlay
  ctx.fillStyle = 'rgba(0,0,20,0.88)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Title
  ctx.font = 'bold 42px "Courier New", monospace';
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#44f';
  ctx.shadowBlur = 18;
  ctx.fillText('SELECT DIFFICULTY', CANVAS_W / 2, CANVAS_H / 2 - 110);
  ctx.shadowBlur = 0;

  // Buttons
  diffButtonRects.length = 0;
  const diffs = [
    {
      key: 'easy',   num: '1',
      sub1: '5 lives · 70% speed',
      sub2: 'mixed sizes · sparse spawns',
    },
    {
      key: 'medium', num: '2',
      sub1: '3 lives · 115% speed',
      sub2: '65% large rocks · frequent spawns',
    },
    {
      key: 'hard',   num: '3',
      sub1: '2 lives · 180% speed',
      sub2: '75% large rocks · constant barrage',
    },
  ];

  const btnW = 270, btnH = 115, gap = 24;
  const totalW = diffs.length * btnW + (diffs.length - 1) * gap;
  const startX = CANVAS_W / 2 - totalW / 2;
  const btnY   = CANVAS_H / 2 - btnH / 2;

  for (let i = 0; i < diffs.length; i++) {
    const d    = diffs[i];
    const diff = DIFFICULTIES[d.key];
    const bx   = startX + i * (btnW + gap);
    const bcx  = bx + btnW / 2;   // button center x
    const bcy  = btnY + btnH / 2; // button center y
    diffButtonRects.push({ x: bx, y: btnY, w: btnW, h: btnH, key: d.key });

    // Button background
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeStyle = diff.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(bx, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.stroke();

    // Number badge (top-left corner)
    ctx.fillStyle = diff.color;
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(d.num, bx + 10, btnY + 14);
    ctx.textAlign = 'center';

    // Label — above center
    ctx.fillStyle = diff.color;
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.fillText(diff.label, bcx, bcy - 20);

    // Sub-line 1
    ctx.fillStyle = '#aaa';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText(d.sub1, bcx, bcy + 8, btnW - 24);

    // Sub-line 2
    ctx.fillStyle = '#666';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillText(d.sub2, bcx, bcy + 28, btnW - 24);
  }

  // Hints
  ctx.textAlign = 'center';
  ctx.fillStyle = '#555';
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('Press 1, 2, 3  or  click a button', CANVAS_W / 2, CANVAS_H / 2 + 80);
  ctx.fillText('ESC — Back', CANVAS_W / 2, CANVAS_H / 2 + 104);

  ctx.restore();
}

function renderPowerupBar() {
  if (!collectedPowerups || collectedPowerups.length === 0) return;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'left';

  const itemW = 108, itemH = 36, gap = 5;
  const barX  = 10;
  const barY  = CANVAS_H - itemH - 10;

  for (let i = 0; i < collectedPowerups.length; i++) {
    const cp        = collectedPowerups[i];
    const info      = POWERUP_TYPES[cp.typeId];
    const x         = barX + i * (itemW + gap);
    const remaining = activeEffects[cp.typeId] || 0;
    const isActive  = info.duration > 0 && remaining > 0;

    ctx.globalAlpha = cp.fadeAlpha;

    // Background pill
    ctx.fillStyle   = hexDarken(info.color, isActive ? 0.22 : 0.08);
    ctx.strokeStyle = isActive ? info.color : hexDarken(info.color, 0.35);
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, barY, itemW, itemH, 6);
    ctx.fill();
    ctx.stroke();

    // Color dot
    ctx.fillStyle = isActive ? info.color : hexDarken(info.color, 0.4);
    ctx.beginPath();
    ctx.arc(x + 13, barY + 12, 5, 0, Math.PI * 2);
    ctx.fill();

    // Label (top line)
    ctx.fillStyle    = isActive ? info.color : hexDarken(info.color, 0.4);
    ctx.font         = '11px "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.label, x + 22, barY + 12);

    // Countdown (bottom line, only when active)
    if (isActive) {
      ctx.fillStyle = info.color;
      ctx.font      = 'bold 11px "Courier New", monospace';
      ctx.fillText(`${Math.ceil(remaining)}s remaining`, x + 22, barY + 26);
    }

    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function renderControls() {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Overlay
  ctx.fillStyle = 'rgba(0,0,20,0.92)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Title
  ctx.font = 'bold 36px "Courier New", monospace';
  ctx.fillStyle = '#4af';
  ctx.shadowColor = '#0af';
  ctx.shadowBlur = 16;
  ctx.fillText('HOW TO PLAY', CANVAS_W / 2, 70);
  ctx.shadowBlur = 0;

  const col1 = CANVAS_W / 2 - 260;
  const col2 = CANVAS_W / 2 + 60;
  let y = 140;
  const lineH = 30;

  function sectionHeader(text, x) {
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = '#4af';
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
    y += lineH * 0.8;
  }

  function row(key, desc, x) {
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = '#ff0';
    ctx.textAlign = 'left';
    ctx.fillText(key, x, y);
    ctx.font = '13px "Courier New", monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText(desc, x + 130, y);
    y += lineH;
  }

  // ── Movement ──
  sectionHeader('MOVEMENT', col1);
  row('W / ↑', 'Move up',    col1);
  row('S / ↓', 'Move down',  col1);
  row('A / ←', 'Move left',  col1);
  row('D / →', 'Move right', col1);
  y += 10;
  sectionHeader('COMBAT', col1);
  row('SPACE',  'Hold to shoot', col1);
  y += 10;
  sectionHeader('MENU', col1);
  row('ESC',    'Pause / back',  col1);
  row('R',      'Restart',       col1);
  row('M',      'Main menu',     col1);

  // ── Right column ──
  y = 140;
  sectionHeader('POWER-UPS', col2);
  y += 6;

  const entries = [
    { color: '#f80', label: 'RAPID FIRE',  desc: 'Shoot 3× faster [10s]'        },
    { color: '#d0f', label: 'TRIPLE SHOT', desc: 'Fire 3 bullets at once [10s]' },
    { color: '#0f8', label: 'SPEED BOOST', desc: 'Move 1.6× faster [10s]'      },
    { color: '#4af', label: 'SHIELD',      desc: 'Invincibility [5s]'           },
    { color: '#f44', label: 'BOMB',        desc: 'Destroys all asteroids'       },
    { color: '#f4f', label: 'EXTRA LIFE',  desc: 'Auto-grants +1 life'          },
  ];
  for (const e of entries) {
    ctx.beginPath();
    ctx.arc(col2 + 8, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = e.color;
    ctx.fill();
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = e.color;
    ctx.textAlign = 'left';
    ctx.fillText(e.label, col2 + 20, y);
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = '#999';
    ctx.fillText(e.desc, col2 + 20, y + 14);
    y += 36;
  }

  // ── Objective blurb ──
  ctx.font = '13px "Courier New", monospace';
  ctx.fillStyle = '#999';
  ctx.textAlign = 'center';
  ctx.fillText('Destroy asteroids to score points. Large ones split into smaller ones.', CANVAS_W / 2, CANVAS_H - 120);
  ctx.fillText('Power-ups spawn randomly — fly over one to collect it instantly.', CANVAS_W / 2, CANVAS_H - 100);

  // Back button
  const backW = 180, backH = 38;
  const backX = CANVAS_W / 2 - backW / 2;
  const backY = CANVAS_H - backH - 28;
  controlsBackRect = { x: backX, y: backY, w: backW, h: backH };

  ctx.fillStyle   = 'rgba(0,30,70,0.75)';
  ctx.strokeStyle = '#4af';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.roundRect(backX, backY, backW, backH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle    = '#fff';
  ctx.font         = 'bold 15px "Courier New", monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('← Back', CANVAS_W / 2, backY + backH / 2);

  ctx.restore();
}

function renderChangelog() {
  ctx.save();

  // Overlay
  ctx.fillStyle = 'rgba(0,0,20,0.92)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Title
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = 'bold 36px "Courier New", monospace';
  ctx.fillStyle    = '#4af';
  ctx.shadowColor  = '#0af';
  ctx.shadowBlur   = 16;
  ctx.fillText('CHANGELOG', CANVAS_W / 2, 52);
  ctx.shadowBlur = 0;

  // Scrollable area
  const padX   = 80;
  const areaY  = 90;
  const areaH  = CANVAS_H - 90 - 70; // leave room for back button
  const entryH = 62;

  const totalH = CHANGELOG.length * entryH;
  const maxScroll = Math.max(0, totalH - areaH);
  changelogScrollY = Math.min(changelogScrollY, maxScroll);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, areaY, CANVAS_W, areaH);
  ctx.clip();

  const startY = areaY - changelogScrollY;

  const entries = [...CHANGELOG].reverse();
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const ey    = startY + i * entryH;
    if (ey + entryH < areaY || ey > areaY + areaH) continue;

    // Row tint for alternating rows
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(padX - 10, ey + 4, CANVAS_W - (padX - 10) * 2, entryH - 6);
    }

    // Version badge
    ctx.font         = 'bold 12px "Courier New", monospace';
    ctx.fillStyle    = '#4af';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(entry.v, padX, ey + 10);

    // Title
    ctx.font      = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(entry.title, padX + 72, ey + 10);

    // Description
    ctx.font      = '12px "Courier New", monospace';
    ctx.fillStyle = '#889';
    ctx.fillText(entry.desc, padX + 72, ey + 30, CANVAS_W - padX * 2 - 72);
  }

  ctx.restore();

  // Scroll hint
  if (maxScroll > 0) {
    ctx.font         = '11px "Courier New", monospace';
    ctx.fillStyle    = '#445';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('scroll with mouse wheel or ↑ ↓', CANVAS_W / 2, areaY + areaH + 10);
  }

  // Back button
  const backW = 180, backH = 38;
  const backX = CANVAS_W / 2 - backW / 2;
  const backY = CANVAS_H - backH - 14;
  changelogBackRect = { x: backX, y: backY, w: backW, h: backH };

  ctx.fillStyle   = 'rgba(0,30,70,0.75)';
  ctx.strokeStyle = '#4af';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.roundRect(backX, backY, backW, backH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle    = '#fff';
  ctx.font         = 'bold 15px "Courier New", monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('← Back', CANVAS_W / 2, backY + backH / 2);

  ctx.restore();
}

function renderLevelComplete() {
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Dim overlay
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Green banner
  const bannerH = 80;
  const bannerY = CANVAS_H / 2 - 160;
  ctx.fillStyle = 'rgba(0,80,30,0.9)';
  ctx.fillRect(0, bannerY, CANVAS_W, bannerH);
  ctx.strokeStyle = '#4f8';
  ctx.lineWidth   = 3;
  ctx.strokeRect(0, bannerY, CANVAS_W, bannerH);

  ctx.font      = 'bold 42px "Courier New", monospace';
  ctx.fillStyle = '#4f8';
  ctx.shadowColor = '#0f4';
  ctx.shadowBlur  = 20;
  ctx.fillText(`LEVEL ${currentLevel} COMPLETE!`, CANVAS_W / 2, bannerY + bannerH / 2);
  ctx.shadowBlur  = 0;

  // Stats
  ctx.font      = '20px "Courier New", monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(`Score: ${score}`, CANVAS_W / 2, CANVAS_H / 2 - 60);

  ctx.font      = 'bold 20px "Courier New", monospace';
  ctx.fillStyle = '#f4f';
  ctx.shadowColor = '#f0f';
  ctx.shadowBlur  = 10;
  ctx.fillText('+2 LIVES BONUS', CANVAS_W / 2, CANVAS_H / 2 - 28);
  ctx.shadowBlur  = 0;

  ctx.font      = '16px "Courier New", monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText(`Lives: ${'♥ '.repeat(lives).trim()}`, CANVAS_W / 2, CANVAS_H / 2 + 4);

  // Buttons
  levelCompleteButtonRects.length = 0;
  const btnW = 300, gap = 16, cx = CANVAS_W / 2;
  const buttons = [
    { key: 'continue', label: `Continue to Level ${currentLevel + 1}`, hint: '',      color: '#4f8', bg: 'rgba(0,60,25,0.85)', btnH: 58 },
    { key: 'menu',     label: 'Main Menu',                              hint: 'M',     color: '#4af', bg: 'rgba(0,30,70,0.75)', btnH: 48 },
  ];

  let btnY = CANVAS_H / 2 + 38;
  for (const b of buttons) {
    const bx  = cx - btnW / 2;
    const bcy = btnY + b.btnH / 2;
    levelCompleteButtonRects.push({ x: bx, y: btnY, w: btnW, h: b.btnH, key: b.key });

    if (b.key === 'continue') { ctx.shadowColor = b.color; ctx.shadowBlur = 12; }
    ctx.fillStyle   = b.bg;
    ctx.strokeStyle = b.color;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(bx, btnY, btnW, b.btnH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font      = `bold ${b.key === 'continue' ? 18 : 15}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(b.label, cx, bcy);

    ctx.fillStyle = b.color;
    ctx.font      = '12px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(b.hint, bx + btnW - 14, bcy);
    ctx.textAlign = 'center';

    btnY += b.btnH + gap;
  }

  ctx.restore();
}

function renderBossHealthBar() {
  if (!boss || !boss.active) return;
  ctx.save();

  const barW = Math.min(CANVAS_W * 0.55, 560);
  const barH = 20;
  const barX = CANVAS_W / 2 - barW / 2;
  const barY = 44;

  // Boss name above bar
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font         = 'bold 14px "Courier New", monospace';
  ctx.fillStyle    = boss.color;
  ctx.shadowColor  = boss.color;
  ctx.shadowBlur   = 10;
  ctx.fillText(boss.name.toUpperCase(), CANVAS_W / 2, barY - 2);
  ctx.shadowBlur   = 0;

  // Bar background
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 4);
  ctx.fill();

  // Health fill
  const pct = boss.hp / boss.maxHp;
  const fillColor = pct > 0.5 ? boss.color : pct > 0.25 ? '#f84' : '#ff0';
  ctx.fillStyle = fillColor;
  ctx.shadowColor = fillColor;
  ctx.shadowBlur  = 8;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * pct, barH, 4);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * pct, barH / 2, 4);
  ctx.fill();

  // Border
  ctx.strokeStyle = boss.color;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 4);
  ctx.stroke();

  // HP text
  ctx.fillStyle    = '#fff';
  ctx.font         = 'bold 11px "Courier New", monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${boss.hp} / ${boss.maxHp}`, CANVAS_W / 2, barY + barH / 2);

  ctx.restore();
}

function renderBossWarning() {
  if (bossWarningTimer <= 0) return;
  if (Math.floor(bossWarningTimer * 4) % 2 === 0) return; // flash
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  const bdef = BOSS_DEFS[currentDiff];
  ctx.font      = 'bold 28px "Courier New", monospace';
  ctx.fillStyle = '#f44';
  ctx.shadowColor = '#f00';
  ctx.shadowBlur  = 20;
  ctx.fillText(`⚠ ${bdef.name.toUpperCase()} INCOMING ⚠`, CANVAS_W / 2, CANVAS_H / 2);
  ctx.shadowBlur  = 0;
  ctx.restore();
}

function renderPaused() {
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Frosted overlay
  ctx.fillStyle = 'rgba(0,0,20,0.65)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Title
  ctx.font        = 'bold 56px "Courier New", monospace';
  ctx.fillStyle   = '#fff';
  ctx.shadowColor = '#88f';
  ctx.shadowBlur  = 24;
  ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2 - 110);
  ctx.shadowBlur  = 0;

  // Buttons
  pauseButtonRects.length = 0;
  const btnW = 300, gap = 14, cx = CANVAS_W / 2;
  const buttons = [
    { key: 'resume',  label: 'Resume',    hint: 'ESC', color: '#4f8', bg: 'rgba(0,60,25,0.85)',  btnH: 54 },
    { key: 'restart', label: 'Restart',   hint: 'R',   color: '#f44', bg: 'rgba(70,0,0,0.85)',   btnH: 48 },
    { key: 'menu',    label: 'Main Menu', hint: 'M',   color: '#4af', bg: 'rgba(0,40,90,0.85)',  btnH: 48 },
  ];

  let btnY = CANVAS_H / 2 - 50;
  for (const b of buttons) {
    const bx  = cx - btnW / 2;
    const bcy = btnY + b.btnH / 2;
    pauseButtonRects.push({ x: bx, y: btnY, w: btnW, h: b.btnH, key: b.key });

    if (b.key === 'resume') { ctx.shadowColor = b.color; ctx.shadowBlur = 10; }
    ctx.fillStyle   = b.bg;
    ctx.strokeStyle = b.color;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(bx, btnY, btnW, b.btnH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font      = `bold ${b.key === 'resume' ? 18 : 15}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(b.label, cx, bcy);

    ctx.fillStyle = b.color;
    ctx.font      = '12px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(b.hint, bx + btnW - 14, bcy);
    ctx.textAlign = 'center';

    btnY += b.btnH + gap;
  }

  ctx.restore();
}

function renderGameOver() {
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Dim overlay
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Title
  ctx.font = 'bold 52px "Courier New", monospace';
  ctx.fillStyle = '#f44';
  ctx.shadowColor = '#f00';
  ctx.shadowBlur = 20;
  ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 130);
  ctx.shadowBlur = 0;

  // Score
  ctx.font = '24px "Courier New", monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(`Final Score: ${score}`, CANVAS_W / 2, CANVAS_H / 2 - 72);

  ctx.font = '18px "Courier New", monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText(`Survived: ${Math.floor(gameTime)} seconds`, CANVAS_W / 2, CANVAS_H / 2 - 38);

  // Buttons
  gameOverButtonRects.length = 0;
  const btnW = 300, gap = 16;
  const cx = CANVAS_W / 2;
  const buttons = [
    { key: 'play', label: 'Play Again', hint: '',      color: '#4af', bg: 'rgba(0,40,90,0.75)',  btnH: 58 },
    { key: 'menu', label: 'Main Menu',  hint: 'M',     color: '#4af', bg: 'rgba(0,30,70,0.65)',  btnH: 48 },
  ];

  let btnY = CANVAS_H / 2 + 10;
  for (const b of buttons) {
    const bx  = cx - btnW / 2;
    const bcy = btnY + b.btnH / 2;
    gameOverButtonRects.push({ x: bx, y: btnY, w: btnW, h: b.btnH, key: b.key });

    if (b.key === 'play') { ctx.shadowColor = b.color; ctx.shadowBlur = 12; }

    ctx.fillStyle   = b.bg;
    ctx.strokeStyle = b.color;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(bx, btnY, btnW, b.btnH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${b.key === 'play' ? 22 : 16}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(b.label, cx, bcy);

    ctx.fillStyle = b.color;
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(b.hint, bx + btnW - 14, bcy);
    ctx.textAlign = 'center';

    btnY += b.btnH + gap;
  }

  ctx.restore();
}

// ─── Game Loop ────────────────────────────────────────────────────────────────
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
resize();
gameState = 'MENU';
requestAnimationFrame(gameLoop);
