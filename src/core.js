// ═══════════════════════════════════════════════════════════════════════════════
// ██  CORE
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Game State ───────────────────────────────────────────────────────────────
let gameState;   // 'MENU' | 'PLAY_MODE' | 'SOLAR_MAP' | 'SHOP' | 'DIFFICULTY' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'LEVEL_COMPLETE' | 'CONTROLS' | 'CHANGELOG'
let player, bullets, asteroids, particles;
let score, lives;
let spawnTimer, spawnInterval;
let difficultyTimer, astSpeedMult;
let gameTime;
let powerups, collectedPowerups, powerupTimer;
let coinPickups, coinSpawnTimer;
let activeEffects;  // { rapidfire, tripleshot, speedboost } — seconds remaining
let boss, bossBullets, bossSpawned, bossDefeated, bossWarningTimer;
let currentLevel, nextBossScore;
let gameMode       = 'endless';  // 'endless' | 'progress'
let selectedPlanet = null;       // index into PLANET_DEFS, or null
let currentPlanet  = 0;          // which planet is active in progress mode
const levelCompleteButtonRects = [];
const playModeButtonRects = [];
const pauseButtonRects = [];
const shopButtonRects = [];
const solarMapButtonRects = [];
let shopScrollY = 0;

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
  coinPickups     = [];
  coinSpawnTimer  = rand(10, 15);
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
  planetObstacles.length = 0;
  planetObstacleTimer    = 3.0;
  planetDebuffs.iceslow  = 0;
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
  coinPickups   = [];
  coinSpawnTimer = rand(10, 30);
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

function saveShop() {
  localStorage.setItem('astroCustomize', JSON.stringify({
    color: playerColor, variant: playerVariant,
    coins: spaceCoins,
    unlockedColors, unlockedHulls,
    engine: playerEngine, unlockedEngines,
    progressUnlocked, soundMuted,
  }));
}

// ─── Ship Stats ───────────────────────────────────────────────────────────────
// Combines hull base stats + active engine deltas → gameplay multipliers.
function getShipStats() {
  const h = HULL_STATS[playerVariant] ?? HULL_STATS[0];
  const e = ENGINE_DEFS[playerEngine]  ?? ENGINE_DEFS[0];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const spd  = clamp(h.spd  + e.spd,  1, 7);
  const rate = clamp(h.rate + e.rate, 1, 7);
  const def  = clamp(h.def  + e.def,  1, 7);
  const pow  = clamp(h.pow  + e.pow,  1, 7);
  const t = v => (v - 1) / 6;  // normalize 1–7 → 0–1
  return {
    speedMult:    0.75 + t(spd)  * 0.75,  // 0.75×–1.50×  on PLAYER_SPEED
    cooldownMult: 1.35 - t(rate) * 0.70,  // 1.35×–0.65×  on SHOOT_COOLDOWN (lower = faster)
    invincMult:   0.60 + t(def)  * 1.40,  // 0.60×–2.00×  on INVINCIBLE_TIME
    bulletMult:   0.80 + t(pow)  * 0.60,  // 0.80×–1.40×  on BULLET_SPEED
  };
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

  // Universal button animation tick
  if (btnAnim.active) {
    btnAnim.timer -= dt;
    if (btnAnim.timer <= 0) {
      btnAnim.active = false;
      btnAnim.timer  = 0;
      if (btnAnim.onComplete) {
        btnAnim.onComplete();
        btnAnim.onComplete = null;
      }
    }
  }

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

  if (gameState === 'SHOP') {
    if (tutorialActive) {
      if (keys['Space'] || keys['Enter']) { keys['Space'] = keys['Enter'] = false; advanceTutorial(); }
      if (keys['Escape'])                 { keys['Escape'] = false; completeTutorial(); }
    }
    return;
  }

  if (gameState === 'SETTINGS') {
    return;
  }

  if (gameState === 'PLAY_MODE') {
    return;
  }

  if (gameState === 'SOLAR_MAP') {
    // Tutorial keyboard: Space/Enter = next slide, Escape = skip
    if (tutorialActive) {
      if (keys['Space'] || keys['Enter']) {
        keys['Space'] = false; keys['Enter'] = false;
        advanceTutorial();
      } else if (keys['Escape']) {
        keys['Escape'] = false;
        completeTutorial();
      }
      return;
    }
    if (solarMapLaunchTimer > 0) {
      solarMapLaunchTimer -= dt;
      if (solarMapLaunchTimer <= 0) {
        solarMapLaunchTimer = 0;
        selectedPlanet = null;
        gameState      = 'PLAYING';
        loadGame();
      }
    }
    return;
  }

  if (gameState === 'DIFFICULTY') {
    if (!btnAnim.active) {
      const map = { Digit1: 'easy', Digit2: 'medium', Digit3: 'hard' };
      for (const [code, diff] of Object.entries(map)) {
        if (keys[code]) {
          keys[code]  = false;
          currentDiff = diff;
          const rect  = diffButtonRects.find(b => b.key === diff);
          if (rect) {
            startBtnAnim(rect, DIFFICULTIES[diff]?.color ?? '#fff', () => {
              gameState = 'PLAYING';
              loadGame();
            });
          } else {
            gameState = 'PLAYING';
            loadGame();
          }
        }
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
    if (IS_TOUCH && touch.pause.active) {
      touch.pause.active = false;
      gameState = 'PLAYING';
      return;
    }
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
  if (IS_TOUCH && touch.pause.active) {
    touch.pause.active = false;
    gameState = 'PAUSED';
    return;
  }

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
          if (gameMode !== 'progress') lives += 2;
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
          if (gameMode === 'progress') {
            progressUnlocked = Math.max(progressUnlocked, currentPlanet + 1);
            saveShop();
          }
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

  // ── Coin spawner ─────────────────────────────────────────────────────────
  coinSpawnTimer -= dt;
  if (coinSpawnTimer <= 0) {
    const count = Math.floor(rand(2, 5));
    for (let i = 0; i < count; i++) {
      coinPickups.push(new CoinPickup(
        rand(CANVAS_W * 0.15, CANVAS_W * 0.85),
        rand(60, CANVAS_H - 60)
      ));
    }
    coinSpawnTimer = rand(10, 15);
  }

  // ── Coin collection ──────────────────────────────────────────────────────
  for (const c of coinPickups) c.update(dt);
  for (const c of coinPickups) {
    if (!c.active) continue;
    if (dist(player.cx, player.cy, c.x, c.y) < c.r + 16) {
      c.active = false;
      spaceCoins++;
      saveShop();
      playCollectCoin();
    }
  }
  coinPickups = coinPickups.filter(c => c.active);

  // ── Planet-specific obstacles (progress mode only) ───────────────────────
  if (gameMode === 'progress') updatePlanetObstacles(dt);
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  // Background
  ctx.fillStyle = '#05050f';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  renderStars();

  if (gameState === 'MENU')           { renderMenu(); }
  else if (gameState === 'PLAY_MODE') { renderPlayMode(); }
  else if (gameState === 'SOLAR_MAP') { renderSolarMap(); if (tutorialActive) renderTutorialOverlay(); }
  else if (gameState === 'DIFFICULTY'){ renderDifficulty(); }
  else if (gameState === 'CONTROLS')  { renderControls(); }
  else if (gameState === 'SETTINGS')  { renderSettings(); }
  else if (gameState === 'SHOP')      { renderShop(); if (tutorialActive) renderTutorialOverlay(); }
  else if (gameState === 'CHANGELOG') { renderChangelog(); }
  else if (gameState === 'GAME_OVER') { renderGameOver(); }
  else if (gameState === 'LEVEL_COMPLETE') { renderLevelComplete(); }
  else {
    // PLAYING + PAUSED (draw frozen world, then overlay if paused)
    for (const a of asteroids) a.draw();
    for (const b of bullets)   b.draw();
    player.draw();
    for (const p of particles) p.draw();
    for (const pu of powerups)  pu.draw();
    for (const c  of coinPickups) c.draw();
    for (const bb of bossBullets) bb.draw();
    if (boss && boss.active) boss.draw();
    if (gameMode === 'progress') renderPlanetObstacles();

    renderHUD();
    renderBossHealthBar();
    renderBossWarning();
    renderPowerupBar();
    if (IS_TOUCH) renderTouchControls();
    if (gameState === 'PAUSED') renderPaused();
  }

  // Universal button animation overlay — always rendered on top
  if (btnAnim.active) renderBtnAnimOverlay();
}

// ─── Planet Obstacle System ───────────────────────────────────────────────────
// One themed hazard type per planet, active only in progress mode.
const PLANET_OBSTACLE_CONFIG = [
  { type: 'solar_flare',  interval: 13, maxActive: 2 },  // 0 Sun
  { type: 'radiation',    interval:  9, maxActive: 3 },  // 1 Mercury
  { type: 'toxic_cloud',  interval:  7, maxActive: 3 },  // 2 Venus
  { type: 'debris',       interval:  5, maxActive: 4 },  // 3 Earth
  { type: 'dust_devil',   interval: 15, maxActive: 2 },  // 4 Mars
  { type: 'gravity_well', interval: 18, maxActive: 1 },  // 5 Jupiter
  { type: 'ring_shard',   interval:  4, maxActive: 6 },  // 6 Saturn
  { type: 'ice_shard',    interval:  7, maxActive: 3 },  // 7 Uranus
  { type: 'wind_gust',    interval: 11, maxActive: 1 },  // 8 Neptune
];

function hurtPlayer(particleColors) {
  if (player.hit()) {
    lives--;
    playPlayerHit();
    spawnParticles(player.cx, player.cy, 6, particleColors);
    if (lives <= 0) gameState = 'GAME_OVER';
  }
}

function spawnPlanetObstacle() {
  const cfg = PLANET_OBSTACLE_CONFIG[currentPlanet];
  if (!cfg) return;
  if (planetObstacles.filter(o => o.active).length >= cfg.maxActive) return;
  const type = cfg.type;
  const o    = { type, active: true, dmgTimer: 0 };
  switch (type) {
    case 'solar_flare': {
      const y = 70 + Math.random() * (CANVAS_H - 140);
      Object.assign(o, { y, h: 40, life: 3.2, maxLife: 3.2, phase: 'warning' });
      break;
    }
    case 'radiation': {
      const x = 200 + Math.random() * (CANVAS_W - 350);
      const y = 70  + Math.random() * (CANVAS_H - 140);
      Object.assign(o, { x, y, r: 55, life: 12, maxLife: 12 });
      break;
    }
    case 'toxic_cloud': {
      const y  = 80 + Math.random() * (CANVAS_H - 160);
      const vx = -(22 + Math.random() * 28);
      Object.assign(o, { x: CANVAS_W + 70, y, r: 55 + Math.random() * 22,
        vx, vy: (Math.random() - 0.5) * 14, life: 14, maxLife: 14 });
      break;
    }
    case 'debris': {
      const left = Math.random() < 0.5;
      const y    = 60 + Math.random() * (CANVAS_H - 120);
      const spd  = 290 + Math.random() * 200;
      const w    = 52 + Math.random() * 50;
      const h    = 10 + Math.random() * 8;
      Object.assign(o, { x: left ? -w : CANVAS_W, y, w, h,
        vx: left ? spd : -spd, angle: (Math.random() - 0.5) * 0.35,
        life: (CANVAS_W + w) / spd, maxLife: (CANVAS_W + w) / spd });
      break;
    }
    case 'dust_devil': {
      const ang = Math.random() * Math.PI * 2;
      const spd = 38 + Math.random() * 28;
      Object.assign(o, { x: 150 + Math.random() * (CANVAS_W - 300),
        y: 80 + Math.random() * (CANVAS_H - 160), r: 70,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        spinAngle: 0, life: 18, maxLife: 18 });
      break;
    }
    case 'gravity_well': {
      Object.assign(o, { x: CANVAS_W * 0.55 + (Math.random() - 0.5) * 110,
        y: CANVAS_H * 0.45 + (Math.random() - 0.5) * 80,
        r: 22, pullR: 130, life: 15, maxLife: 15 });
      break;
    }
    case 'ring_shard': {
      const top  = Math.random() < 0.5;
      const x    = 100 + Math.random() * (CANVAS_W - 200);
      const y    = top ? -15 : CANVAS_H + 15;
      const spd  = 270 + Math.random() * 90;
      const vy   = top ? spd : -spd;
      const vx   = (Math.random() - 0.5) * spd * 0.55;
      const len  = 32 + Math.random() * 26;
      Object.assign(o, { x, y, vx, vy, len, w: 7, angle: Math.atan2(vy, vx),
        life: 3.5, maxLife: 3.5 });
      break;
    }
    case 'ice_shard': {
      const right = Math.random() < 0.65;
      const y     = 60 + Math.random() * (CANVAS_H - 120);
      const spd   = 175 + Math.random() * 85;
      const vx    = right ? -spd : spd;
      Object.assign(o, { x: right ? CANVAS_W + 30 : -30, y, vx,
        vy: (Math.random() - 0.5) * spd * 0.45,
        r: 18 + Math.random() * 9, life: 4.5, maxLife: 4.5 });
      break;
    }
    case 'wind_gust': {
      const dir = Math.random() < 0.5 ? 1 : -1;
      Object.assign(o, { x: 0, y: 0, dir, force: 360, life: 4.0, maxLife: 4.0 });
      break;
    }
  }
  planetObstacles.push(o);
}

function updatePlanetObstacles(dt) {
  const cfg = PLANET_OBSTACLE_CONFIG[currentPlanet];
  if (!cfg) return;

  // Tick debuffs
  if (planetDebuffs.iceslow > 0) planetDebuffs.iceslow = Math.max(0, planetDebuffs.iceslow - dt);

  // Spawn timer
  planetObstacleTimer -= dt;
  if (planetObstacleTimer <= 0) {
    spawnPlanetObstacle();
    planetObstacleTimer = cfg.interval * (0.7 + Math.random() * 0.6);
  }

  const pcx = player.cx, pcy = player.cy;

  for (const o of planetObstacles) {
    if (!o.active) continue;
    o.life -= dt;
    if (o.life <= 0) { o.active = false; continue; }

    switch (o.type) {
      case 'solar_flare': {
        if (o.phase === 'warning' && o.life < o.maxLife * 0.50) o.phase = 'active';
        if (o.phase === 'active') {
          if (pcy >= o.y - o.h / 2 && pcy <= o.y + o.h / 2) {
            o.dmgTimer -= dt;
            if (o.dmgTimer <= 0) {
              o.dmgTimer = 0.6;
              hurtPlayer(['#ff8800', '#ffee00', '#fff']);
            }
          }
        }
        break;
      }
      case 'radiation': {
        const dx = pcx - o.x, dy = pcy - o.y;
        if (dx * dx + dy * dy < o.r * o.r) {
          o.dmgTimer += dt;
          if (o.dmgTimer >= 6.0) { o.dmgTimer = 0; hurtPlayer(['#ff4400', '#ff8800', '#fff']); }
        } else {
          o.dmgTimer = Math.max(0, o.dmgTimer - dt * 0.5);
        }
        break;
      }
      case 'toxic_cloud': {
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        if (o.x < -o.r - 80) { o.active = false; break; }
        const dx = pcx - o.x, dy = pcy - o.y;
        if (dx * dx + dy * dy < o.r * o.r) {
          o.dmgTimer += dt;
          if (o.dmgTimer >= 5.0) { o.dmgTimer = 0; hurtPlayer(['#88ff44', '#ccff88', '#fff']); }
        } else {
          o.dmgTimer = Math.max(0, o.dmgTimer - dt * 0.5);
        }
        break;
      }
      case 'debris': {
        o.x += o.vx * dt;
        if (o.x > CANVAS_W + o.w + 10 || o.x < -o.w * 2 - 10) { o.active = false; break; }
        if (o.x < player.x + player.w && o.x + o.w > player.x &&
            o.y < player.y + player.h && o.y + o.h > player.y) {
          hurtPlayer(['#aaaaaa', '#cccccc', '#fff']);
        }
        break;
      }
      case 'dust_devil': {
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.spinAngle += dt * 2.6;
        if (o.x < 70 || o.x > CANVAS_W - 70) o.vx = -o.vx;
        if (o.y < 70 || o.y > CANVAS_H - 70) o.vy = -o.vy;
        const dx = pcx - o.x, dy = pcy - o.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < o.r * 1.6 && d > 1) {
          const push = 230 * (1 - d / (o.r * 1.6));
          player.x = Math.max(0, Math.min(CANVAS_W - player.w, player.x + (dx / d) * push * dt));
          player.y = Math.max(0, Math.min(CANVAS_H - player.h, player.y + (dy / d) * push * dt));
        }
        break;
      }
      case 'gravity_well': {
        const dx = o.x - pcx, dy = o.y - pcy;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < o.pullR && d > 1) {
          const pull = 155 * (1 - d / o.pullR);
          player.x = Math.max(0, Math.min(CANVAS_W - player.w, player.x + (dx / d) * pull * dt));
          player.y = Math.max(0, Math.min(CANVAS_H - player.h, player.y + (dy / d) * pull * dt));
        }
        break;
      }
      case 'ring_shard': {
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        if (o.x < -120 || o.x > CANVAS_W + 120 || o.y < -120 || o.y > CANVAS_H + 120) {
          o.active = false; break;
        }
        if (Math.abs(o.x - player.cx) < player.w && Math.abs(o.y - player.cy) < player.h) {
          hurtPlayer(['#e4d191', '#fff7aa', '#fff']);
        }
        break;
      }
      case 'ice_shard': {
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        if (o.x < -60 || o.x > CANVAS_W + 60) { o.active = false; break; }
        const dx = pcx - o.x, dy = pcy - o.y;
        if (dx * dx + dy * dy < (o.r + 14) * (o.r + 14)) {
          o.active = false;
          if (player.hit()) {
            lives--;
            planetDebuffs.iceslow = 5.0;
            playPlayerHit();
            spawnParticles(player.cx, player.cy, 8, ['#88ddff', '#ccf0ff', '#fff', '#5599cc']);
            if (lives <= 0) gameState = 'GAME_OVER';
          }
        }
        break;
      }
      case 'wind_gust': {
        const gustProg = o.life / o.maxLife;
        const force    = o.force * Math.sin((1 - gustProg) * Math.PI);
        player.x = Math.max(0, Math.min(CANVAS_W - player.w, player.x + o.dir * force * dt));
        break;
      }
    }
  }
  planetObstacles = planetObstacles.filter(o => o.active);
}

function renderPlanetObstacles() {
  const now = performance.now() / 1000;
  for (const o of planetObstacles) {
    if (!o.active) continue;
    const fadeIn  = Math.min(1, (o.maxLife - o.life) * 2.5);
    const fadeOut = Math.min(1, o.life * 2.0);
    const alpha   = Math.min(fadeIn, fadeOut);
    ctx.save();
    ctx.globalAlpha = alpha;

    switch (o.type) {
      case 'solar_flare': {
        const pulse = 0.55 + 0.45 * Math.sin(now * 9);
        if (o.phase === 'warning') {
          ctx.strokeStyle = `rgba(255,200,0,${0.55 * pulse})`;
          ctx.lineWidth   = 2;
          ctx.setLineDash([10, 8]);
          ctx.beginPath(); ctx.moveTo(0, o.y); ctx.lineTo(CANVAS_W, o.y); ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = 'bold 13px "Courier New", monospace';
          ctx.fillStyle = `rgba(255,200,0,${0.85 * pulse})`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('! SOLAR FLARE INCOMING', CANVAS_W / 2, o.y - 16);
        } else {
          const ba = Math.min(1, o.life * 3.5);
          const g  = ctx.createLinearGradient(0, o.y - o.h / 2, 0, o.y + o.h / 2);
          g.addColorStop(0,   'rgba(255,200,50,0)');
          g.addColorStop(0.35, `rgba(255,240,100,${ba})`);
          g.addColorStop(0.5,  `rgba(255,255,200,${ba})`);
          g.addColorStop(0.65, `rgba(255,240,100,${ba})`);
          g.addColorStop(1,   'rgba(255,200,50,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, o.y - o.h / 2, CANVAS_W, o.h);
          ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 18;
          ctx.strokeStyle = `rgba(255,255,160,${ba * 0.8})`;
          ctx.lineWidth   = 2;
          ctx.beginPath(); ctx.moveTo(0, o.y); ctx.lineTo(CANVAS_W, o.y); ctx.stroke();
          ctx.shadowBlur  = 0;
        }
        break;
      }
      case 'radiation': {
        const pulse = 0.65 + 0.35 * Math.sin(now * 3.2);
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        g.addColorStop(0,   'rgba(255,80,0,0.20)');
        g.addColorStop(0.65,'rgba(255,40,0,0.12)');
        g.addColorStop(1,   'rgba(255,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 12 * pulse;
        ctx.strokeStyle = `rgba(255,80,0,${0.7 * pulse})`;
        ctx.lineWidth   = 2;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = `rgba(255,100,0,${0.55 * alpha})`;
        ctx.font = '17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('☢', o.x, o.y);
        break;
      }
      case 'toxic_cloud': {
        for (let b = 0; b < 3; b++) {
          const bx = o.x + Math.sin(now * 0.9 + b * 2.1) * o.r * 0.24;
          const by = o.y + Math.cos(now * 0.7 + b * 1.9) * o.r * 0.18;
          const br = o.r * (0.68 + b * 0.18);
          const cg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
          cg.addColorStop(0,   'rgba(90,210,40,0.22)');
          cg.addColorStop(0.6, 'rgba(55,170,15,0.13)');
          cg.addColorStop(1,   'rgba(40,150,0,0)');
          ctx.fillStyle = cg;
          ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
        }
        const wobble = 0.5 + 0.5 * Math.sin(now * 1.8);
        ctx.strokeStyle = `rgba(90,210,40,${0.32 * wobble * alpha})`;
        ctx.lineWidth   = 1.5;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'debris': {
        ctx.save();
        ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
        ctx.rotate(o.angle);
        ctx.fillStyle   = '#888'; ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
        ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
        ctx.strokeRect(-o.w / 2, -o.h / 2, o.w, o.h);
        ctx.fillStyle = '#336bcc';
        ctx.fillRect(-o.w / 2 + 8, -o.h / 2 - 7, o.w * 0.33, 7);
        ctx.fillRect(-o.w / 2 + 8,  o.h / 2,      o.w * 0.33, 7);
        ctx.restore();
        break;
      }
      case 'dust_devil': {
        for (let k = 0; k < 9; k++) {
          const a  = o.spinAngle + (k / 9) * Math.PI * 2;
          const dr = o.r * 0.58 * (0.6 + 0.4 * Math.sin(a * 3 + now));
          const px2 = o.x + Math.cos(a) * dr;
          const py2 = o.y + Math.sin(a) * dr;
          ctx.fillStyle = `rgba(185,95,35,${0.42 * alpha})`;
          ctx.beginPath(); ctx.arc(px2, py2, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = `rgba(205,115,45,${0.28 * alpha})`;
        ctx.lineWidth   = 2;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(205,115,45,${0.13 * alpha})`;
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 1.55, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'gravity_well': {
        const pulse = 0.6 + 0.4 * Math.sin(now * 2.5);
        for (let k = 1; k <= 3; k++) {
          ctx.strokeStyle = `rgba(60,100,220,${0.14 * (4 - k) * alpha * pulse})`;
          ctx.lineWidth   = 1.5;
          ctx.beginPath(); ctx.arc(o.x, o.y, o.pullR * (k / 3), 0, Math.PI * 2); ctx.stroke();
        }
        const cg = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * 2.5);
        cg.addColorStop(0,   `rgba(110,140,255,${0.55 * alpha})`);
        cg.addColorStop(0.5, `rgba(45,65,210,${0.24 * alpha})`);
        cg.addColorStop(1,   'rgba(20,40,180,0)');
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.pullR * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.shadowColor = '#4466ff'; ctx.shadowBlur = 16 * pulse;
        ctx.strokeStyle = `rgba(110,145,255,${0.85 * alpha})`;
        ctx.lineWidth   = 2;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur  = 0;
        break;
      }
      case 'ring_shard': {
        ctx.save();
        ctx.translate(o.x, o.y); ctx.rotate(o.angle);
        const sg = ctx.createLinearGradient(-o.len / 2, 0, o.len / 2, 0);
        sg.addColorStop(0,   'rgba(230,220,150,0)');
        sg.addColorStop(0.2, `rgba(245,238,185,${0.92 * alpha})`);
        sg.addColorStop(0.5, `rgba(255,252,220,${alpha})`);
        sg.addColorStop(0.8, `rgba(245,238,185,${0.92 * alpha})`);
        sg.addColorStop(1,   'rgba(230,220,150,0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.moveTo(-o.len / 2, 0); ctx.lineTo(0, -o.w / 2);
        ctx.lineTo(o.len / 2, 0);  ctx.lineTo(0, o.w / 2);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      case 'ice_shard': {
        ctx.save();
        ctx.translate(o.x, o.y); ctx.rotate(now * 1.4);
        const ip = 0.7 + 0.3 * Math.sin(now * 4.2);
        ctx.strokeStyle = `rgba(155,225,255,${0.92 * alpha * ip})`;
        ctx.fillStyle   = `rgba(185,238,255,${0.30 * alpha})`;
        ctx.lineWidth   = 2;
        ctx.shadowColor = '#88ddff'; ctx.shadowBlur = 10 * ip;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          k === 0 ? ctx.moveTo(Math.cos(a) * o.r, Math.sin(a) * o.r)
                  : ctx.lineTo(Math.cos(a) * o.r, Math.sin(a) * o.r);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
        break;
      }
      case 'wind_gust': {
        const wp = Math.sin((1 - o.life / o.maxLife) * Math.PI);
        const wa = wp * 0.32;
        for (let k = 0; k < 16; k++) {
          const sy  = 28 + k * (CANVAS_H / 16);
          const len = 75 + Math.sin(k * 2.4 + now * 9) * 48;
          const sx  = o.dir > 0
            ? (((k * 131 + now * 580) % (CANVAS_W + len)) - len)
            : CANVAS_W - (((k * 131 + now * 580) % (CANVAS_W + len)));
          ctx.strokeStyle = `rgba(100,130,255,${wa})`;
          ctx.lineWidth   = 1.5;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + o.dir * len, sy); ctx.stroke();
        }
        ctx.fillStyle = `rgba(40,60,200,${wa * 0.22})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        break;
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Ice-slow HUD indicator
  if (planetDebuffs.iceslow > 0) {
    const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 180);
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font        = 'bold 13px "Courier New", monospace';
    ctx.fillStyle   = `rgba(160,230,255,${0.95 * pulse})`;
    ctx.shadowColor = '#88ddff'; ctx.shadowBlur = 9;
    ctx.fillText(`ICE SLOWED  ${Math.ceil(planetDebuffs.iceslow)}s`, CANVAS_W / 2, 56);
    ctx.shadowBlur  = 0;
    ctx.restore();
  }
}

// ─── Universal Button Animation Overlay ──────────────────────────────────────
function renderBtnAnimOverlay() {
  const a    = btnAnim;
  const prog = 1 - a.timer / a.dur;          // 0 → 1
  const pulse = Math.sin(prog * Math.PI);     // 0 → 1 → 0

  // Parse hex color (#rgb or #rrggbb) to r,g,b integers
  let r = 255, g = 255, b = 255;
  const hex = a.color;
  if (hex && hex[0] === '#') {
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
  }

  const isCircle = a.r > 0;
  const bx = a.cx - a.w / 2;
  const by = a.cy - a.h / 2;

  ctx.save();

  // Glow halo + stroke
  ctx.shadowColor = a.color;
  ctx.shadowBlur  = 45 * pulse;
  ctx.strokeStyle = a.color;
  ctx.lineWidth   = 3;
  ctx.globalAlpha = 0.9 * pulse;
  ctx.beginPath();
  if (isCircle) { ctx.arc(a.cx, a.cy, a.r, 0, Math.PI * 2); }
  else          { ctx.roundRect(bx, by, a.w, a.h, 12); }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Fill flash
  ctx.fillStyle   = `rgba(${r},${g},${b},${0.30 * pulse})`;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  if (isCircle) { ctx.arc(a.cx, a.cy, a.r, 0, Math.PI * 2); }
  else          { ctx.roundRect(bx, by, a.w, a.h, 12); }
  ctx.fill();

  // Expanding ripple ring
  const baseSize = isCircle ? a.r * 2 : Math.max(a.w, a.h);
  const rippleR  = baseSize * 0.65 * prog;
  ctx.strokeStyle = `rgba(${r},${g},${b},${0.55 * (1 - prog)})`;
  ctx.lineWidth   = 3;
  ctx.shadowBlur  = 0;
  ctx.beginPath();
  ctx.arc(a.cx, a.cy, rippleR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
  ctx.restore();
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

  // Coin balance (bottom right)
  const cr = 9, cx = CANVAS_W - 14 - cr, cy = CANVAS_H - 18;
  ctx.shadowColor = '#fd0';
  ctx.shadowBlur  = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.fillStyle = '#fd0';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(cx, cy, cr * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();
  ctx.fillStyle    = '#fd0';
  ctx.font         = 'bold 14px "Courier New", monospace';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(spaceCoins, cx - cr - 6, cy);

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
  ctx.fillText('AstroShooter', CANVAS_W / 2, CANVAS_H / 2 - 130);
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
    { key: 'play',      label: 'PLAY',        color: '#4af', bg: 'rgba(0,40,90,0.75)',  btnH: 58 },
    { key: 'shop',      label: 'SHOP',         color: '#a8f', bg: 'rgba(30,0,60,0.65)',  btnH: 48 },
    { key: 'controls',  label: 'HOW TO PLAY', color: '#4af', bg: 'rgba(0,30,70,0.65)',  btnH: 48 },
    { key: 'settings',  label: 'SETTINGS',    color: '#8af', bg: 'rgba(10,20,60,0.65)', btnH: 48 },
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

    btnY += b.btnH + gap;
  }

  // Version (clickable — opens changelog)
  ctx.font         = '15px "Courier New", monospace';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'bottom';
  const verText = 'v1.61.1';
  const verW    = ctx.measureText(verText).width;
  const verH    = 18;
  const verX    = CANVAS_W - 10 - verW;
  const verY    = CANVAS_H - 8 - verH;
  menuButtonRects.push({ x: verX - 4, y: verY, w: verW + 8, h: verH + 4, key: 'changelog' });
  ctx.fillStyle = '#99b';
  ctx.fillText(verText, CANVAS_W - 10, CANVAS_H - 8);
  // Underline hint
  ctx.strokeStyle = '#556';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(verX, CANVAS_H - 8);
  ctx.lineTo(CANVAS_W - 10, CANVAS_H - 8);
  ctx.stroke();

  ctx.restore();
}

function renderShop() {
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = 'rgba(0,0,20,0.92)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.font        = 'bold 42px "Courier New", monospace';
  ctx.fillStyle   = '#fff';
  ctx.shadowColor = '#a8f';
  ctx.shadowBlur  = 18;
  ctx.fillText('SHOP', CANVAS_W / 2, 70);
  ctx.shadowBlur  = 0;

  shopButtonRects.length = 0;
  const cx = CANVAS_W / 2;

  // ── SpaceCoins balance (top-right) ────────────────────────────────────────
  const coinBoxW = 120, coinBoxH = 34, coinBoxX = CANVAS_W - coinBoxW - 16, coinBoxY = 16;
  ctx.fillStyle   = 'rgba(30,25,0,0.85)';
  ctx.strokeStyle = '#fd0';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.roundRect(coinBoxX, coinBoxY, coinBoxW, coinBoxH, 8);
  ctx.fill();
  ctx.stroke();
  // coin icon
  ctx.fillStyle = '#fd0';
  ctx.beginPath();
  ctx.arc(coinBoxX + 18, coinBoxY + coinBoxH / 2, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.arc(coinBoxX + 18, coinBoxY + coinBoxH / 2, 5, 0, Math.PI * 2);
  ctx.fill();
  // count
  ctx.fillStyle    = '#fd0';
  ctx.font         = 'bold 15px "Courier New", monospace';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(spaceCoins, coinBoxX + 34, coinBoxY + coinBoxH / 2);
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // ── Scrollable content (clipped below title) ──────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 95, CANVAS_W, CANVAS_H - 95);
  ctx.clip();
  ctx.translate(0, -shopScrollY);

  // ── Two-column layout ─────────────────────────────────────────────────────
  // LEFT:  ship preview + color swatches + attributes panel
  // RIGHT: hull grid + engine grid
  const lcx    = CANVAS_W * 0.25;   // left col centre
  const rcx    = CANVAS_W * 0.75;   // right col centre
  const topY   = 110;
  const lPad   = 20;                 // left margin
  const leftColW  = CANVAS_W / 2 - lPad - 20;
  const rightColW = CANVAS_W / 2 - 40;

  // ── LEFT: Ship preview ────────────────────────────────────────────────────
  const previewW = Math.min(200, leftColW - 20);
  const previewH = 84;
  const previewX = lcx - previewW / 2;
  const previewY = topY;
  ctx.strokeStyle = '#a8f';
  ctx.lineWidth   = 1.5;
  ctx.fillStyle   = 'rgba(20,0,40,0.6)';
  ctx.beginPath();
  ctx.roundRect(previewX, previewY, previewW, previewH, 10);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(lcx, previewY + previewH / 2);
  ctx.scale(2.8, 2.8);
  ctx.translate(-24, -14);
  drawPlayerShip(0, 0, 48, 28, playerColor, playerVariant, 0);
  ctx.restore();

  // ── LEFT: Color swatches ──────────────────────────────────────────────────
  const swatchR = 16, swatchGap = 10;
  const totalSwatchW = SHIP_COLORS.length * (swatchR * 2) + (SHIP_COLORS.length - 1) * swatchGap;
  let swatchX = lcx - totalSwatchW / 2 + swatchR;
  const swatchY = previewY + previewH + 60;

  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.fillStyle = '#a8f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('COLOR', lcx, swatchY - 30);

  for (let i = 0; i < SHIP_COLORS.length; i++) {
    const locked   = !unlockedColors.includes(i);
    const selected = SHIP_COLORS[i] === playerColor && !locked;
    shopButtonRects.push({ x: swatchX - swatchR, y: swatchY - swatchR, w: swatchR * 2, h: swatchR * 2, key: `color_${i}` });

    ctx.globalAlpha = locked ? 0.35 : 1;
    if (selected) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.arc(swatchX, swatchY, swatchR + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = SHIP_COLORS[i];
    ctx.beginPath();
    ctx.arc(swatchX, swatchY, swatchR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (locked) {
      ctx.strokeStyle = '#fd0';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(swatchX, swatchY - 3, 5, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = '#fd0';
      ctx.fillRect(swatchX - 5, swatchY - 3, 10, 8);
      ctx.font         = '9px "Courier New", monospace';
      ctx.fillStyle    = '#fd0';
      ctx.textBaseline = 'top';
      ctx.fillText(COLOR_COSTS[i], swatchX, swatchY + swatchR + 2);
      ctx.textBaseline = 'middle';
    }
    swatchX += swatchR * 2 + swatchGap;
  }

  // ── LEFT: Attributes panel ────────────────────────────────────────────────
  const attrPanelX = lPad;
  const attrPanelW = leftColW;
  const attrPanelH = 152;
  const attrPanelY = swatchY + swatchR + 28;
  const attrCx     = attrPanelX + attrPanelW / 2;

  ctx.fillStyle = 'rgba(10,0,25,0.85)';
  ctx.strokeStyle = '#446';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(attrPanelX, attrPanelY, attrPanelW, attrPanelH, 8);
  ctx.fill();
  ctx.stroke();

  const hs = HULL_STATS[playerVariant] ?? HULL_STATS[0];
  const es = ENGINE_DEFS[playerEngine]  ?? ENGINE_DEFS[0];
  const clampStat = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.fillStyle = '#a8f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`ATTRIBUTES — ${HULL_DEFS[playerVariant].name.toUpperCase()}`, attrCx, attrPanelY + 14);

  const statRows = [
    { label: 'SPD',  base: hs.spd,  delta: es.spd  },
    { label: 'RATE', base: hs.rate, delta: es.rate },
    { label: 'DEF',  base: hs.def,  delta: es.def  },
    { label: 'POW',  base: hs.pow,  delta: es.pow  },
  ];
  const segW = 16, segH = 13, segGap = 3;
  const barX  = attrPanelX + 52;
  const barY0 = attrPanelY + 32;
  const rowGap = 24;

  ctx.font = '10px "Courier New", monospace';
  for (let si = 0; si < statRows.length; si++) {
    const s = statRows[si];
    const ry = barY0 + si * rowGap;
    const total = clampStat(s.base + s.delta, 1, 7);

    ctx.fillStyle = '#88a';
    ctx.textAlign = 'right';
    ctx.fillText(s.label, barX - 8, ry + segH / 2);

    for (let seg = 0; seg < 7; seg++) {
      const sx = barX + seg * (segW + segGap);
      if (seg < total) {
        ctx.fillStyle = (s.delta > 0 && seg >= s.base) ? '#4f8' : '#a8f';
      } else if (s.delta < 0 && seg >= total && seg < s.base) {
        ctx.fillStyle = '#f44';
      } else {
        ctx.fillStyle = 'rgba(50,30,70,0.5)';
      }
      ctx.fillRect(sx, ry, segW, segH);
    }
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(`(${total})`, barX + 7 * (segW + segGap) + 4, ry + segH / 2);
  }

  const engineDeltas = [];
  if (es.spd  !== 0) engineDeltas.push(`${es.spd  > 0 ? '+' : ''}${es.spd}SPD`);
  if (es.rate !== 0) engineDeltas.push(`${es.rate > 0 ? '+' : ''}${es.rate}RATE`);
  if (es.def  !== 0) engineDeltas.push(`${es.def  > 0 ? '+' : ''}${es.def}DEF`);
  if (es.pow  !== 0) engineDeltas.push(`${es.pow  > 0 ? '+' : ''}${es.pow}POW`);
  const deltaStr = engineDeltas.length ? `  ${engineDeltas.join('  ')}` : '  no bonus';
  ctx.fillStyle = '#8af';
  ctx.textAlign = 'center';
  ctx.fillText(`Engine: ${ENGINE_DEFS[playerEngine].name}${deltaStr}`, attrCx, attrPanelY + attrPanelH - 11);

  const leftColBottom = attrPanelY + attrPanelH;

  // ── RIGHT: Hull grid (5 cols × 4 rows) ────────────────────────────────────
  const hullCols = 5, hullRows = 4;
  const thumbGapX = 8, thumbGapY = 8;
  const thumbW = Math.max(72, Math.floor((rightColW - (hullCols - 1) * thumbGapX) / hullCols));
  const thumbH = Math.round(thumbW * 0.62);
  const hullGridW  = hullCols * thumbW + (hullCols - 1) * thumbGapX;
  const thumbStartX = rcx - hullGridW / 2;
  const thumbStartY = topY + 18;

  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillStyle = '#a8f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HULL', rcx, topY);

  for (let i = 0; i < HULL_DEFS.length; i++) {
    const col = i % hullCols;
    const row = Math.floor(i / hullCols);
    const tx  = thumbStartX + col * (thumbW + thumbGapX);
    const ty  = thumbStartY + row * (thumbH + thumbGapY);
    const locked   = !unlockedHulls.includes(i);
    const selected = playerVariant === i && !locked;

    shopButtonRects.push({ x: tx, y: ty, w: thumbW, h: thumbH, key: `variant_${i}` });

    ctx.globalAlpha = locked ? 0.4 : 1;
    ctx.fillStyle   = selected ? 'rgba(40,0,80,0.9)' : 'rgba(10,0,20,0.7)';
    ctx.strokeStyle = selected ? '#a8f' : (locked ? '#334' : '#446');
    ctx.lineWidth   = selected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(tx, ty, thumbW, thumbH, 6);
    ctx.fill();
    ctx.stroke();

    const mw = Math.round(thumbW * 0.33), mh = Math.round(mw * 0.58);
    drawPlayerShip(
      tx + thumbW / 2 - mw / 2,
      ty + thumbH / 2 - mh / 2 - 6,
      mw, mh,
      selected ? playerColor : (locked ? '#445' : '#668'),
      i, 0
    );

    ctx.globalAlpha = 1;
    ctx.font = '9px "Courier New", monospace';
    ctx.textBaseline = 'middle';
    if (locked) {
      ctx.fillStyle = '#fd0';
      ctx.fillText(`🔒 ${HULL_DEFS[i].cost}`, tx + thumbW / 2, ty + thumbH - 8);
    } else {
      ctx.fillStyle = selected ? '#fff' : '#778';
      ctx.fillText(HULL_DEFS[i].name, tx + thumbW / 2, ty + thumbH - 8);
    }
  }

  const hullGridBottom = thumbStartY + hullRows * (thumbH + thumbGapY);

  // ── RIGHT: Engine grid (3 cols × 2 rows) ──────────────────────────────────
  const engCols = 3, engRows = 2;
  const engGapX = 10, engGapY = 10;
  const engW = Math.max(110, Math.floor((rightColW - (engCols - 1) * engGapX) / engCols));
  const engH = 70;
  const engGridW   = engCols * engW + (engCols - 1) * engGapX;
  const engStartX  = rcx - engGridW / 2;
  const engSectionY = hullGridBottom + 30;

  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillStyle = '#a8f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ENGINE', rcx, engSectionY - 14);

  for (let i = 0; i < ENGINE_DEFS.length; i++) {
    const col = i % engCols;
    const row = Math.floor(i / engCols);
    const ex  = engStartX + col * (engW + engGapX);
    const ey  = engSectionY + row * (engH + engGapY);
    const eng = ENGINE_DEFS[i];
    const locked   = !unlockedEngines.includes(i);
    const selected = playerEngine === i && !locked;

    shopButtonRects.push({ x: ex, y: ey, w: engW, h: engH, key: `engine_${i}` });

    ctx.globalAlpha = locked ? 0.4 : 1;
    ctx.fillStyle   = selected ? 'rgba(0,50,20,0.9)' : 'rgba(10,10,20,0.75)';
    ctx.strokeStyle = selected ? '#4f8' : (locked ? '#334' : '#446');
    ctx.lineWidth   = selected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(ex, ey, engW, engH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = selected ? '#4f8' : (locked ? '#667' : '#bbb');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(eng.name, ex + engW / 2, ey + 18);

    if (locked) {
      ctx.font = '10px "Courier New", monospace';
      ctx.fillStyle = '#fd0';
      ctx.fillText(`🔒 ${eng.cost} coins`, ex + engW / 2, ey + engH / 2 + 4);
    } else {
      const parts = [];
      if (eng.spd  !== 0) parts.push({ txt: `${eng.spd  > 0 ? '+' : ''}${eng.spd}SPD`,  col: eng.spd  > 0 ? '#4f8' : '#f44' });
      if (eng.rate !== 0) parts.push({ txt: `${eng.rate > 0 ? '+' : ''}${eng.rate}RATE`, col: eng.rate > 0 ? '#4f8' : '#f44' });
      if (eng.def  !== 0) parts.push({ txt: `${eng.def  > 0 ? '+' : ''}${eng.def}DEF`,  col: eng.def  > 0 ? '#4f8' : '#f44' });
      if (eng.pow  !== 0) parts.push({ txt: `${eng.pow  > 0 ? '+' : ''}${eng.pow}POW`,  col: eng.pow  > 0 ? '#4f8' : '#f44' });

      ctx.font = '10px "Courier New", monospace';
      if (parts.length === 0) {
        ctx.fillStyle = '#556';
        ctx.fillText('balanced', ex + engW / 2, ey + engH / 2 + 4);
      } else {
        const lineW = parts.reduce((a, p) => a + ctx.measureText(p.txt).width + 8, -8);
        let px = ex + engW / 2 - lineW / 2;
        ctx.textAlign = 'left';
        for (const p of parts) {
          ctx.fillStyle = p.col;
          ctx.fillText(p.txt, px, ey + engH / 2 + 4);
          px += ctx.measureText(p.txt).width + 8;
        }
        ctx.textAlign = 'center';
      }
      if (selected) {
        ctx.fillStyle = '#4f8';
        ctx.font = '9px "Courier New", monospace';
        ctx.fillText('EQUIPPED', ex + engW / 2, ey + engH - 9);
      }
    }
  }

  const rightColBottom = engSectionY + engRows * (engH + engGapY);

  // ── Back button (centred, below both columns) ─────────────────────────────
  const backW = 180, backH = 44;
  const backY = Math.max(leftColBottom, rightColBottom) + 20;
  const backX = cx - backW / 2;
  shopButtonRects.push({ x: backX, y: backY, w: backW, h: backH, key: 'back' });
  ctx.shadowColor  = '#a8f';
  ctx.shadowBlur   = 8;
  ctx.fillStyle    = 'rgba(20,0,50,0.85)';
  ctx.strokeStyle  = '#a8f';
  ctx.lineWidth    = 2;
  ctx.beginPath();
  ctx.roundRect(backX, backY, backW, backH, 10);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur   = 0;
  ctx.fillStyle    = '#fff';
  ctx.font         = 'bold 16px "Courier New", monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('← BACK', cx, backY + backH / 2);

  // Clamp scroll to content height
  const totalShopH = backY + backH + 20;
  shopScrollY = Math.min(shopScrollY, Math.max(0, totalShopH - CANVAS_H + 40));

  ctx.restore();  // scroll translate
  ctx.restore();  // outer save
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
  ctx.fillText('Play Options', CANVAS_W / 2, CANVAS_H / 2 - 130);
  ctx.shadowBlur  = 0;

  playModeButtonRects.length = 0;
  const btnW = 380, cx = CANVAS_W / 2, btnH = 88, gap = 20;
  let   btnY = CANVAS_H / 2 - 80;

  // ── ENDLESS MODE button ──────────────────────────────────────────────────
  playModeButtonRects.push({ x: cx - btnW / 2, y: btnY, w: btnW, h: btnH, key: 'endless' });

  ctx.shadowColor = '#4af'; ctx.shadowBlur = 10;
  ctx.fillStyle   = 'rgba(0,40,90,0.85)';
  ctx.strokeStyle = '#4af';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.roundRect(cx - btnW / 2, btnY, btnW, btnH, 12); ctx.fill(); ctx.stroke();
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 22px "Courier New", monospace';
  ctx.fillText('ENDLESS MODE', cx, btnY + 28);
  ctx.font        = '13px "Courier New", monospace';
  ctx.fillStyle   = '#4af';
  ctx.fillText('No end. Survive as long as you can.', cx, btnY + 52);

  btnY += btnH + gap;

  // ── PROGRESS MODE button ─────────────────────────────────────────────────
  playModeButtonRects.push({ x: cx - btnW / 2, y: btnY, w: btnW, h: btnH, key: 'progress' });
  ctx.shadowColor = '#a8f'; ctx.shadowBlur = 10;
  ctx.fillStyle   = 'rgba(25,0,60,0.85)';
  ctx.strokeStyle = '#a8f';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.roundRect(cx - btnW / 2, btnY, btnW, btnH, 12); ctx.fill(); ctx.stroke();
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 22px "Courier New", monospace';
  ctx.fillText('PROGRESS MODE', cx, btnY + 28);
  ctx.font        = '13px "Courier New", monospace';
  ctx.fillStyle   = '#a8f';
  ctx.fillText('9 planets. Fixed challenges. Sequential unlock.', cx, btnY + 52);
  ctx.font        = '11px "Courier New", monospace';
  ctx.fillStyle   = '#886ccc';
  ctx.fillText(`${progressUnlocked} / 9 planets complete`, cx, btnY + 70);

  btnY += btnH + gap;

  // ── Back button ──────────────────────────────────────────────────────────
  const backW = 180, backH = 44;
  const backX = cx - backW / 2, backY = btnY + 16;
  playModeButtonRects.push({ x: backX, y: backY, w: backW, h: backH, key: 'back' });
  ctx.shadowColor = '#48f'; ctx.shadowBlur = 8;
  ctx.fillStyle   = 'rgba(10,20,60,0.85)';
  ctx.strokeStyle = '#48f';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.roundRect(backX, backY, backW, backH, 10); ctx.fill(); ctx.stroke();
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 16px "Courier New", monospace';
  ctx.fillText('← BACK', cx, backY + backH / 2);

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

function renderTutorialOverlay() {
  const slides = tutorialContext === 'shop' ? SHOP_TUTORIAL_SLIDES : TUTORIAL_SLIDES;
  const slide  = slides[tutorialStep];
  if (!slide) return;
  const isLast = tutorialStep === slides.length - 1;
  const cx     = CANVAS_W / 2;

  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // ── Backdrop ───────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,10,0.84)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // ── Card ───────────────────────────────────────────────────────────────────
  const cardW = Math.min(560, CANVAS_W - 48);
  const cardH = 346;
  const cardX = cx - cardW / 2;
  const cardY = (CANVAS_H - cardH) / 2;

  // Colored glow behind card
  ctx.shadowColor = slide.color;
  ctx.shadowBlur  = 40;
  ctx.fillStyle   = '#0a0a1e';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 18);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Card gradient fill
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, '#111132');
  cardGrad.addColorStop(1, '#060616');
  ctx.fillStyle = cardGrad;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 18);
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = slide.color + '50';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 18);
  ctx.stroke();

  // Glowing accent stripe at top
  ctx.shadowColor = slide.color;
  ctx.shadowBlur  = 14;
  ctx.fillStyle   = slide.color;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, 5, [18, 18, 0, 0]);
  ctx.fill();
  ctx.shadowBlur = 0;

  // ── Icon ───────────────────────────────────────────────────────────────────
  ctx.font = '38px monospace';
  ctx.fillText(slide.icon, cx, cardY + 54);

  // ── Title ──────────────────────────────────────────────────────────────────
  ctx.shadowColor = slide.color;
  ctx.shadowBlur  = 16;
  ctx.fillStyle   = '#ffffff';
  ctx.font        = 'bold 20px "Courier New", monospace';
  ctx.fillText(slide.title, cx, cardY + 98);
  ctx.shadowBlur  = 0;

  // Colored accent divider
  ctx.strokeStyle = slide.color + '44';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 50, cardY + 116);
  ctx.lineTo(cardX + cardW - 50, cardY + 116);
  ctx.stroke();

  // ── Body text ──────────────────────────────────────────────────────────────
  ctx.fillStyle = '#aab8d8';
  ctx.font      = '14px "Courier New", monospace';
  const lineH   = 26;
  const bodyTop = cardY + 140;
  for (let i = 0; i < slide.body.length; i++) {
    ctx.fillText(slide.body[i], cx, bodyTop + i * lineH, cardW - 48);
  }

  // ── Progress dots ──────────────────────────────────────────────────────────
  const dotY  = cardY + cardH - 66;
  const dotGap = 22;
  const dotX0  = cx - ((slides.length - 1) * dotGap) / 2;
  for (let i = 0; i < slides.length; i++) {
    const active = i === tutorialStep;
    ctx.beginPath();
    ctx.arc(dotX0 + i * dotGap, dotY, active ? 6 : 4, 0, Math.PI * 2);
    if (active) {
      ctx.shadowColor = slide.color;
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = slide.color;
    } else {
      ctx.fillStyle   = '#252545';
      ctx.shadowBlur  = 0;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── ✕ Close button (top-right corner of card) ─────────────────────────────
  const xr = 18, xbx = cardX + cardW - xr - 10, xby = cardY + xr + 10;
  tutorialCloseRect = { x: xbx - xr, y: xby - xr, w: xr * 2, h: xr * 2 };
  ctx.fillStyle   = 'rgba(255,255,255,0.07)';
  ctx.strokeStyle = '#3a3a60';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.arc(xbx, xby, xr, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#606080';
  ctx.font      = '14px "Courier New", monospace';
  ctx.fillText('✕', xbx, xby);

  // ── Buttons ────────────────────────────────────────────────────────────────
  const btnRowCY = cardY + cardH - 28;

  // ← BACK — previous slide (left), hidden on first slide
  tutorialPrevRect = null;
  if (tutorialStep > 0) {
    const sw = 90, sh = 32;
    const sx = cardX + 24, sy = btnRowCY - sh / 2;
    tutorialPrevRect = { x: sx, y: sy, w: sw, h: sh };
    ctx.shadowColor = slide.color;
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = slide.color + '22';
    ctx.strokeStyle = slide.color + '88';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(sx, sy, sw, sh, 7);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = slide.color;
    ctx.font        = '13px "Courier New", monospace';
    ctx.fillText('← BACK', sx + sw / 2, btnRowCY);
  }

  // NEXT / LET'S GO — solid colored fill, white text always
  const nw = isLast ? 136 : 122;
  const nh = 38;
  const nx = cardX + cardW - nw - 24;
  const ny = btnRowCY - nh / 2;
  tutorialNextRect = { x: nx, y: ny, w: nw, h: nh };

  ctx.shadowColor = slide.color;
  ctx.shadowBlur  = 14;
  ctx.fillStyle   = slide.color;
  ctx.beginPath();
  ctx.roundRect(nx, ny, nw, nh, 8);
  ctx.fill();
  ctx.shadowBlur  = 0;

  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath();
  ctx.roundRect(nx, ny, nw, nh, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font      = 'bold 14px "Courier New", monospace';
  ctx.fillText(isLast ? "LET'S GO!" : 'NEXT  ›', nx + nw / 2, btnRowCY);

  // ── Keyboard hint ──────────────────────────────────────────────────────────
  ctx.fillStyle = '#2a2a4a';
  ctx.font      = '11px "Courier New", monospace';
  ctx.fillText(
    isLast ? 'SPACE / ENTER to begin' : 'SPACE / ENTER = next  •  ESC = close',
    cx, cardY + cardH + 18
  );

  ctx.restore();
}

function renderSolarMap() {
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Background
  ctx.fillStyle = '#05050f';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  renderStars();

  // Title
  ctx.font        = 'bold 28px "Courier New", monospace';
  ctx.fillStyle   = '#fff';
  ctx.shadowColor = '#a8f';
  ctx.shadowBlur  = 14;
  ctx.fillText('SOLAR SYSTEM', CANVAS_W / 2, 40);
  ctx.shadowBlur  = 0;

  solarMapButtonRects.length = 0;

  const mapLeft  = 170;
  const mapRight = CANVAS_W - 130;
  const step     = (mapRight - mapLeft) / (PLANET_DEFS.length - 1);
  const cy       = CANVAS_H * 0.60;
  const now      = performance.now() / 1000;

  // Solar nebula ambient glow near the sun
  const nebGrad = ctx.createRadialGradient(mapLeft, cy, 0, mapLeft, cy, CANVAS_W * 0.38);
  nebGrad.addColorStop(0,   'rgba(255,140,20,0.13)');
  nebGrad.addColorStop(0.5, 'rgba(255,60,0,0.05)');
  nebGrad.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = nebGrad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Orbit line
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth   = 1.5;
  ctx.setLineDash([5, 9]);
  ctx.beginPath();
  ctx.moveTo(mapLeft, cy);
  ctx.lineTo(mapRight, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  // Tiny distance tick marks on the orbit line
  for (let i = 1; i < PLANET_DEFS.length - 1; i++) {
    const tx = mapLeft + i * step;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(tx, cy - 4);
    ctx.lineTo(tx, cy + 4);
    ctx.stroke();
  }

  // Draw planets
  for (let i = 0; i < PLANET_DEFS.length; i++) {
    const p      = PLANET_DEFS[i];
    const px     = mapLeft + i * step;
    const sz     = p.size;
    const locked = i > progressUnlocked;
    const alpha  = locked ? 0.28 : 1;

    ctx.globalAlpha = alpha;

    // ── Sun special rendering ────────────────────────────────────────────────
    if (i === 0) {
      if (!locked) {
        const pulse1 = 0.5 + 0.5 * Math.sin(now * 2.1);
        const pulse2 = 0.5 + 0.5 * Math.sin(now * 1.4 + 1.2);
        const pulse3 = 0.5 + 0.5 * Math.sin(now * 1.8 + 2.5);
        // Outermost corona
        const cg3 = ctx.createRadialGradient(px, cy, sz * 0.9, px, cy, sz * 2.8);
        cg3.addColorStop(0, `rgba(255,120,0,${0.13 + pulse3 * 0.07})`);
        cg3.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.fillStyle = cg3;
        ctx.beginPath(); ctx.arc(px, cy, sz * 2.8, 0, Math.PI * 2); ctx.fill();
        // Middle corona
        const cg2 = ctx.createRadialGradient(px, cy, sz * 0.85, px, cy, sz * 1.9);
        cg2.addColorStop(0, `rgba(255,170,0,${0.22 + pulse2 * 0.12})`);
        cg2.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.fillStyle = cg2;
        ctx.beginPath(); ctx.arc(px, cy, sz * 1.9, 0, Math.PI * 2); ctx.fill();
        // Inner corona
        const cg1 = ctx.createRadialGradient(px, cy, sz * 0.78, px, cy, sz * 1.38);
        cg1.addColorStop(0, `rgba(255,220,80,${0.40 + pulse1 * 0.18})`);
        cg1.addColorStop(1, 'rgba(255,120,0,0)');
        ctx.fillStyle = cg1;
        ctx.beginPath(); ctx.arc(px, cy, sz * 1.38, 0, Math.PI * 2); ctx.fill();
      }
      // Sun core radial gradient
      const sunGrad = ctx.createRadialGradient(px - sz * 0.28, cy - sz * 0.28, sz * 0.05, px, cy, sz);
      sunGrad.addColorStop(0,   '#fff5c0');
      sunGrad.addColorStop(0.25,'#ffe060');
      sunGrad.addColorStop(0.6, '#ff8800');
      sunGrad.addColorStop(1,   '#c82000');
      ctx.fillStyle = sunGrad;
      ctx.beginPath(); ctx.arc(px, cy, sz, 0, Math.PI * 2); ctx.fill();
      // Animated surface hot spots
      if (!locked) {
        const sx1 = px - sz * 0.18 + Math.sin(now * 0.7)  * sz * 0.12;
        const sy1 = cy + sz * 0.08  + Math.cos(now * 0.9)  * sz * 0.10;
        const sx2 = px + sz * 0.22  + Math.sin(now * 1.1 + 2) * sz * 0.10;
        const sy2 = cy - sz * 0.15  + Math.cos(now * 0.8 + 1) * sz * 0.08;
        for (const [spx, spy] of [[sx1, sy1], [sx2, sy2]]) {
          const sg = ctx.createRadialGradient(spx, spy, 0, spx, spy, sz * 0.30);
          sg.addColorStop(0, 'rgba(255,80,0,0.28)');
          sg.addColorStop(1, 'rgba(255,80,0,0)');
          ctx.fillStyle = sg;
          ctx.beginPath(); ctx.arc(spx, spy, sz * 0.30, 0, Math.PI * 2); ctx.fill();
        }
      }
      // Limb darkening
      const limb = ctx.createRadialGradient(px, cy, sz * 0.65, px, cy, sz);
      limb.addColorStop(0, 'rgba(0,0,0,0)');
      limb.addColorStop(1, 'rgba(60,5,0,0.38)');
      ctx.fillStyle = limb;
      ctx.beginPath(); ctx.arc(px, cy, sz, 0, Math.PI * 2); ctx.fill();

    } else {
      // ── Regular planet rendering ─────────────────────────────────────────

      // Atmospheric glow
      const atmColors = {
        Venus:   `rgba(230,200,100,0.18)`,
        Earth:   `rgba(50,120,255,0.22)`,
        Mars:    `rgba(200,70,20,0.18)`,
        Jupiter: `rgba(200,130,60,0.14)`,
        Saturn:  `rgba(220,210,140,0.14)`,
        Uranus:  `rgba(80,220,220,0.18)`,
        Neptune: `rgba(50,70,210,0.18)`,
      };
      if (atmColors[p.name] && !locked) {
        const atmG = ctx.createRadialGradient(px, cy, sz * 0.8, px, cy, sz + 7);
        atmG.addColorStop(0, 'rgba(0,0,0,0)');
        atmG.addColorStop(1, atmColors[p.name]);
        ctx.fillStyle = atmG;
        ctx.beginPath(); ctx.arc(px, cy, sz + 7, 0, Math.PI * 2); ctx.fill();
      }

      // Saturn rings — back half
      if (p.rings) {
        ctx.save();
        ctx.globalAlpha = locked ? 0.28 : 0.50;
        ctx.strokeStyle = 'rgba(230,210,130,0.75)';
        ctx.lineWidth   = 7;
        ctx.beginPath(); ctx.ellipse(px, cy, sz * 2.05, sz * 0.50, 0, Math.PI, 2 * Math.PI); ctx.stroke();
        ctx.strokeStyle = 'rgba(200,180,90,0.55)';
        ctx.lineWidth   = 3;
        ctx.beginPath(); ctx.ellipse(px, cy, sz * 1.58, sz * 0.37, 0, Math.PI, 2 * Math.PI); ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = alpha;
      }

      // Planet base gradient (lit from upper-left — sun is to the left)
      const grad = ctx.createRadialGradient(px - sz * 0.32, cy - sz * 0.32, sz * 0.04, px, cy, sz);
      const fills = {
        Mercury: ['#d8d8d8', '#909090', '#383838'],
        Venus:   ['#f8eda0', '#d4b840', '#6a4808'],
        Earth:   ['#90d8ff', '#3a8fdd', '#082860'],
        Mars:    ['#e06030', '#b03010', '#480c00'],
        Jupiter: ['#ecd090', '#c07030', '#583010'],
        Saturn:  ['#f4e8b0', '#c8a840', '#584800'],
        Uranus:  ['#b8f4f4', '#50caca', '#105454'],
        Neptune: ['#7080fc', '#3040cc', '#080820'],
      };
      const [c0, c1, c2] = fills[p.name] ?? [p.color, '#444', '#111'];
      grad.addColorStop(0,   c0);
      grad.addColorStop(0.5, c1);
      grad.addColorStop(1,   c2);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(px, cy, sz, 0, Math.PI * 2); ctx.fill();

      // Surface details (clipped to planet circle)
      ctx.save();
      ctx.beginPath(); ctx.arc(px, cy, sz, 0, Math.PI * 2); ctx.clip();
      if (p.name === 'Earth') {
        ctx.fillStyle = 'rgba(35,130,55,0.65)';
        ctx.beginPath(); ctx.ellipse(px - sz * 0.10, cy - sz * 0.10, sz * 0.36, sz * 0.26, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(px + sz * 0.28, cy + sz * 0.18, sz * 0.22, sz * 0.30, 0.4, 0, Math.PI * 2);  ctx.fill();
        ctx.fillStyle = 'rgba(230,242,255,0.78)';
        ctx.beginPath(); ctx.ellipse(px, cy - sz * 0.82, sz * 0.44, sz * 0.20, 0, 0, Math.PI * 2); ctx.fill();
      } else if (p.name === 'Jupiter') {
        ctx.fillStyle = 'rgba(140,70,15,0.38)';
        ctx.fillRect(px - sz, cy - sz * 0.12, sz * 2, sz * 0.24);
        ctx.fillStyle = 'rgba(220,160,80,0.32)';
        ctx.fillRect(px - sz, cy + sz * 0.26, sz * 2, sz * 0.18);
        ctx.fillStyle = 'rgba(90,40,8,0.28)';
        ctx.fillRect(px - sz, cy - sz * 0.44, sz * 2, sz * 0.14);
        // Great Red Spot
        ctx.fillStyle = 'rgba(195,55,25,0.62)';
        ctx.beginPath(); ctx.ellipse(px + sz * 0.28, cy + sz * 0.06, sz * 0.20, sz * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      } else if (p.name === 'Saturn') {
        ctx.fillStyle = 'rgba(180,140,55,0.28)';
        ctx.fillRect(px - sz, cy - sz * 0.12, sz * 2, sz * 0.22);
        ctx.fillStyle = 'rgba(140,100,25,0.22)';
        ctx.fillRect(px - sz, cy + sz * 0.24, sz * 2, sz * 0.14);
      } else if (p.name === 'Mars') {
        ctx.fillStyle = 'rgba(215,228,240,0.72)';
        ctx.beginPath(); ctx.ellipse(px, cy - sz * 0.80, sz * 0.36, sz * 0.17, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.beginPath(); ctx.arc(px - sz * 0.22, cy + sz * 0.12, sz * 0.13, 0, Math.PI * 2); ctx.fill();
      } else if (p.name === 'Mercury') {
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath(); ctx.arc(px - sz * 0.28, cy - sz * 0.14, sz * 0.17, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + sz * 0.22, cy + sz * 0.28,  sz * 0.11, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(px + sz * 0.08, cy - sz * 0.32,  sz * 0.08, 0, Math.PI * 2); ctx.fill();
      } else if (p.name === 'Venus') {
        ctx.fillStyle = 'rgba(255,245,185,0.28)';
        ctx.fillRect(px - sz, cy - sz * 0.15, sz * 2, sz * 0.28);
        ctx.fillStyle = 'rgba(200,175,90,0.18)';
        ctx.fillRect(px - sz, cy + sz * 0.28, sz * 2, sz * 0.16);
      } else if (p.name === 'Uranus') {
        ctx.fillStyle = 'rgba(130,250,250,0.18)';
        ctx.fillRect(px - sz, cy - sz * 0.08, sz * 2, sz * 0.18);
      } else if (p.name === 'Neptune') {
        ctx.fillStyle = 'rgba(20,20,190,0.38)';
        ctx.fillRect(px - sz, cy - sz * 0.10, sz * 2, sz * 0.20);
        ctx.fillStyle = 'rgba(50,70,200,0.32)';
        ctx.beginPath(); ctx.arc(px - sz * 0.22, cy, sz * 0.17, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore(); // end clip

      // Shadow overlay (sun is left → shadow falls on right side)
      const shade = ctx.createRadialGradient(px + sz * 0.28, cy + sz * 0.18, 0, px, cy, sz * 1.05);
      shade.addColorStop(0,    'rgba(0,0,0,0)');
      shade.addColorStop(0.50, 'rgba(0,0,0,0)');
      shade.addColorStop(1,    'rgba(0,0,0,0.60)');
      ctx.fillStyle = shade;
      ctx.beginPath(); ctx.arc(px, cy, sz, 0, Math.PI * 2); ctx.fill();

      // Specular highlight (upper-left)
      const spec = ctx.createRadialGradient(px - sz * 0.36, cy - sz * 0.36, 0, px - sz * 0.28, cy - sz * 0.28, sz * 0.52);
      spec.addColorStop(0, 'rgba(255,255,255,0.22)');
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(px, cy, sz, 0, Math.PI * 2); ctx.fill();

      // Saturn rings — front half
      if (p.rings) {
        ctx.save();
        ctx.globalAlpha = locked ? 0.28 : 0.80;
        ctx.strokeStyle = 'rgba(230,210,130,0.88)';
        ctx.lineWidth   = 7;
        ctx.beginPath(); ctx.ellipse(px, cy, sz * 2.05, sz * 0.50, 0, 0, Math.PI); ctx.stroke();
        ctx.strokeStyle = 'rgba(200,180,90,0.68)';
        ctx.lineWidth   = 3;
        ctx.beginPath(); ctx.ellipse(px, cy, sz * 1.58, sz * 0.37, 0, 0, Math.PI); ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = alpha;
      }
    }

    // Selected highlight ring
    if (selectedPlanet === i && !locked) {
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 16;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 2.5;
      ctx.beginPath();
      ctx.arc(px, cy, sz + (i === 0 ? 10 : 6), 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur  = 0;
    }

    // Lock icon
    if (locked) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#777';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(px, cy - sz - 12, 5, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = '#777';
      ctx.fillRect(px - 5, cy - sz - 12, 10, 8);
      ctx.globalAlpha = alpha;
    }

    // Name label
    ctx.globalAlpha = locked ? 0.30 : 1;
    ctx.font        = `bold 11px "Courier New", monospace`;
    ctx.fillStyle   = locked ? '#555' : p.color;
    ctx.shadowColor = locked ? 'transparent' : (p.glowColor || p.color);
    ctx.shadowBlur  = locked ? 0 : 7;
    ctx.fillText(p.name, px, cy + sz + 17);
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;

    // Click rect
    solarMapButtonRects.push({
      x: px - sz - 8, y: cy - sz - 8, w: (sz + 8) * 2, h: (sz + 8) * 2,
      key: `planet_${i}`, cx: px, cy, r: sz + 8, color: p.color,
    });
  }

  // Info panel
  if (selectedPlanet !== null) {
    const p      = PLANET_DEFS[selectedPlanet];
    const locked = selectedPlanet > progressUnlocked;
    const pw = Math.min(420, CANVAS_W - 40), ph = 170;
    const ppx = CANVAS_W / 2 - pw / 2, ppy = 68;

    ctx.shadowColor = p.color; ctx.shadowBlur = 16;
    ctx.fillStyle   = 'rgba(5,5,20,0.96)';
    ctx.strokeStyle = p.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(ppx, ppy, pw, ph, 14); ctx.fill(); ctx.stroke();
    ctx.shadowBlur  = 0;

    // Close button
    const closeSize = 26, closeX = ppx + pw - closeSize - 8, closeY = ppy + 8;
    solarMapButtonRects.push({ x: closeX, y: closeY, w: closeSize, h: closeSize, key: 'close_panel', cx: 0, cy: 0, r: 0 });
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.roundRect(closeX, closeY, closeSize, closeSize, 6); ctx.fill();
    ctx.fillStyle = '#888'; ctx.font = '16px "Courier New", monospace';
    ctx.fillText('✕', closeX + closeSize / 2, closeY + closeSize / 2);

    // Planet name
    ctx.font      = `bold 22px "Courier New", monospace`;
    ctx.fillStyle = p.color;
    ctx.fillText(p.name.toUpperCase(), CANVAS_W / 2, ppy + 28);

    // Description
    ctx.font      = '13px "Courier New", monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText(p.desc, CANVAS_W / 2, ppy + 54, pw - 36);

    // Difficulty pips (1 per planet index + 1)
    const pipCount = selectedPlanet + 1, pipTotal = 9;
    const pipW = 18, pipH = 8, pipGap = 4;
    const pipRowW = pipTotal * pipW + (pipTotal - 1) * pipGap;
    let pipX = CANVAS_W / 2 - pipRowW / 2;
    ctx.font = '11px "Courier New", monospace'; ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText('DIFFICULTY', pipX, ppy + 78);
    ctx.textAlign = 'center';
    for (let k = 0; k < pipTotal; k++) {
      ctx.fillStyle = k < pipCount ? p.color : 'rgba(255,255,255,0.12)';
      ctx.beginPath(); ctx.roundRect(pipX, ppy + 90, pipW, pipH, 3); ctx.fill();
      pipX += pipW + pipGap;
    }

    // Launch / locked indicator
    if (locked) {
      ctx.font = 'bold 14px "Courier New", monospace'; ctx.fillStyle = '#555';
      ctx.fillText('🔒 LOCKED', CANVAS_W / 2, ppy + 140);
    } else {
      const lw = 140, lh = 36, lx = CANVAS_W / 2 - lw / 2, ly = ppy + ph - lh - 10;
      solarMapButtonRects.push({ x: lx, y: ly, w: lw, h: lh, key: 'launch', cx: 0, cy: 0, r: 0 });
      ctx.shadowColor = p.color; ctx.shadowBlur = 10;
      ctx.fillStyle   = 'rgba(0,0,0,0.7)'; ctx.strokeStyle = p.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(lx, ly, lw, lh, 8); ctx.fill(); ctx.stroke();
      ctx.shadowBlur  = 0;
      ctx.fillStyle   = '#fff'; ctx.font = 'bold 15px "Courier New", monospace';
      ctx.fillText('LAUNCH ▶', CANVAS_W / 2, ly + lh / 2);
    }
  }

  // Back button
  const backW = 160, backH = 40, backX = CANVAS_W / 2 - backW / 2, backY = CANVAS_H - 58;
  solarMapButtonRects.push({ x: backX, y: backY, w: backW, h: backH, key: 'map_back', cx: 0, cy: 0, r: 0 });
  ctx.shadowColor = '#48f'; ctx.shadowBlur = 6;
  ctx.fillStyle = 'rgba(10,20,60,0.85)'; ctx.strokeStyle = '#48f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(backX, backY, backW, backH, 10); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = 'bold 15px "Courier New", monospace';
  ctx.fillText('← BACK', CANVAS_W / 2, backY + backH / 2);

  // ── Launch warp animation overlay ────────────────────────────────────────
  if (solarMapLaunchTimer > 0) {
    const LAUNCH_DUR = 1.6;
    const prog  = 1 - solarMapLaunchTimer / LAUNCH_DUR; // 0 → 1

    // Stars warp: draw extra long horizontal streaks
    const streakCount = 40;
    ctx.save();
    for (let si = 0; si < streakCount; si++) {
      const sx = (si / streakCount) * CANVAS_W;
      const sy = 50 + Math.sin(si * 7.3) * (CANVAS_H - 100);
      const len = 60 + Math.sin(si * 3.7) * 40;
      const warpLen = len + prog * CANVAS_W * 1.4;
      const alpha   = 0.1 + prog * 0.7;
      ctx.strokeStyle = `rgba(200,220,255,${alpha})`;
      ctx.lineWidth   = 1 + prog * 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + warpLen, sy);
      ctx.stroke();
    }
    ctx.restore();

    // White flash at end
    const flashAlpha = Math.pow(prog, 2.5);
    ctx.fillStyle = `rgba(255,255,255,${flashAlpha * 0.95})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // "LAUNCHING..." text
    const textAlpha = Math.min(1, prog * 3);
    ctx.globalAlpha = textAlpha;
    ctx.font        = 'bold 28px "Courier New", monospace';
    ctx.fillStyle   = '#4af';
    ctx.shadowColor = '#0af';
    ctx.shadowBlur  = 20;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LAUNCHING...', CANVAS_W / 2, CANVAS_H / 2);
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function renderPowerupBar() {
  if (!collectedPowerups || collectedPowerups.length === 0) return;
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'left';

  const itemW = 108, itemH = 36, gap = 5;
  const barX  = 10;
  const barY  = IS_TOUCH
    ? CANVAS_H - itemH - touchLayout.joystickBaseR * 2 - 48
    : CANVAS_H - itemH - 10;

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

function renderSettings() {
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = 'rgba(0,0,20,0.92)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const cx = CANVAS_W / 2;

  // Title
  ctx.font        = 'bold 38px "Courier New", monospace';
  ctx.fillStyle   = '#fff';
  ctx.shadowColor = '#8af';
  ctx.shadowBlur  = 18;
  ctx.fillText('SETTINGS', cx, CANVAS_H / 2 - 170);
  ctx.shadowBlur  = 0;

  settingsButtonRects.length = 0;
  const btnW = 380, gap = 20;
  let btnY = CANVAS_H / 2 - 110;

  // ── Sound toggle ────────────────────────────────────────────────────────────
  const sndLabel = soundMuted ? '🔇  SOUND  OFF' : '🔊  SOUND  ON';
  const sndColor = soundMuted ? '#f44' : '#4f8';
  const sndBg    = soundMuted ? 'rgba(60,0,0,0.65)' : 'rgba(0,50,20,0.65)';
  settingsButtonRects.push({ x: cx - btnW / 2, y: btnY, w: btnW, h: 54, key: 'sound' });
  ctx.fillStyle   = sndBg;
  ctx.strokeStyle = sndColor;
  ctx.lineWidth   = 2;
  ctx.shadowColor = sndColor;
  ctx.shadowBlur  = 10;
  ctx.beginPath();
  ctx.roundRect(cx - btnW / 2, btnY, btnW, 54, 10);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = sndColor;
  ctx.font        = 'bold 19px "Courier New", monospace';
  ctx.fillText(sndLabel, cx, btnY + 27);
  btnY += 54 + gap;

  // ── Section header: Tutorials ───────────────────────────────────────────────
  ctx.fillStyle    = '#556';
  ctx.font         = '12px "Courier New", monospace';
  ctx.textAlign    = 'left';
  ctx.fillText('TUTORIALS', cx - btnW / 2, btnY + 2);
  ctx.strokeStyle  = '#223';
  ctx.lineWidth    = 1;
  ctx.beginPath();
  ctx.moveTo(cx - btnW / 2 + 86, btnY + 2);
  ctx.lineTo(cx + btnW / 2, btnY + 2);
  ctx.stroke();
  ctx.textAlign    = 'center';
  btnY += 18;

  // ── Replay Progress Tutorial button ────────────────────────────────────────
  settingsButtonRects.push({ x: cx - btnW / 2, y: btnY, w: btnW, h: 54, key: 'replay_tutorial' });
  ctx.fillStyle   = 'rgba(30,0,70,0.65)';
  ctx.strokeStyle = '#a8f';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.roundRect(cx - btnW / 2, btnY, btnW, 54, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 16px "Courier New", monospace';
  ctx.fillText('REPLAY PROGRESS TUTORIAL', cx, btnY + 20);
  ctx.fillStyle = '#a8f';
  ctx.font      = '12px "Courier New", monospace';
  ctx.fillText('Teleports you to the Solar Map', cx, btnY + 38);
  btnY += 54 + gap;

  // ── Replay Shop Tutorial button ─────────────────────────────────────────────
  settingsButtonRects.push({ x: cx - btnW / 2, y: btnY, w: btnW, h: 54, key: 'replay_shop_tutorial' });
  ctx.fillStyle   = 'rgba(0,20,50,0.65)';
  ctx.strokeStyle = '#8af';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.roundRect(cx - btnW / 2, btnY, btnW, 54, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 16px "Courier New", monospace';
  ctx.fillText('REPLAY SHOP TUTORIAL', cx, btnY + 20);
  ctx.fillStyle = '#8af';
  ctx.font      = '12px "Courier New", monospace';
  ctx.fillText('Opens the Shop with tutorial', cx, btnY + 38);
  btnY += 54 + gap + 12;

  // ── Back button ─────────────────────────────────────────────────────────────
  const backW = 180, backH = 44;
  const backX = cx - backW / 2;
  settingsButtonRects.push({ x: backX, y: btnY, w: backW, h: backH, key: 'back' });
  ctx.fillStyle   = 'rgba(10,20,60,0.85)';
  ctx.strokeStyle = '#48f';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.roundRect(backX, btnY, backW, backH, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 16px "Courier New", monospace';
  ctx.fillText('← BACK', cx, btnY + backH / 2);

  ctx.restore();
}

function renderControls() {
  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  // Overlay
  ctx.fillStyle = 'rgba(0,0,20,0.92)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Title
  ctx.font = 'bold 36px "Courier New", monospace';
  ctx.fillStyle = '#4af';
  ctx.shadowColor = '#0af';
  ctx.shadowBlur = 16;
  ctx.fillText('HOW TO PLAY', CANVAS_W / 2, 58);
  ctx.shadowBlur = 0;

  const col1  = CANVAS_W / 2 - 260;
  const col2  = CANVAS_W / 2 + 50;
  const lineH = 26;
  let y = 120;

  function secHead(text, x, color = '#4af') {
    ctx.font      = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
    y += Math.round(lineH * 0.82);
  }

  function row(key, desc, x) {
    ctx.font      = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = '#ff0';
    ctx.textAlign = 'left';
    ctx.fillText(key, x, y);
    ctx.font      = '13px "Courier New", monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText(desc, x + 128, y);
    y += lineH;
  }

  // ── Left column: controls ──────────────────────────────────────────────────
  secHead('MOVEMENT', col1);
  row('W / ↑', 'Move up',    col1);
  row('S / ↓', 'Move down',  col1);
  row('A / ←', 'Move left',  col1);
  row('D / →', 'Move right', col1);
  y += 8;
  secHead('COMBAT', col1);
  row('SPACE',  'Hold to shoot', col1);
  y += 8;
  secHead('MENU', col1);
  row('ESC',  'Pause / back', col1);
  row('R',    'Restart',      col1);
  row('M',    'Main menu',    col1);

  // ── Right column: power-ups + modes + shop ─────────────────────────────────
  y = 120;
  secHead('POWER-UPS', col2);
  y += 4;

  const entries = [
    { color: '#f80', label: 'RAPID FIRE',  desc: 'Shoot 3× faster [10s]'        },
    { color: '#d0f', label: 'TRIPLE SHOT', desc: 'Fire 3 bullets at once [10s]' },
    { color: '#0f8', label: 'SPEED BOOST', desc: 'Move 1.6× faster [10s]'      },
    { color: '#4af', label: 'SHIELD',      desc: 'Invincibility [5s]'           },
    { color: '#f44', label: 'BOMB',        desc: 'Destroys all asteroids'       },
    { color: '#f4f', label: 'EXTRA LIFE',  desc: 'Auto-grants +1 life'          },
  ];
  const entryH = 30;
  for (const e of entries) {
    ctx.beginPath();
    ctx.arc(col2 + 8, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = e.color;
    ctx.fill();
    ctx.font      = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = e.color;
    ctx.textAlign = 'left';
    ctx.fillText(e.label, col2 + 20, y);
    ctx.font      = '12px "Courier New", monospace';
    ctx.fillStyle = '#999';
    ctx.fillText(e.desc, col2 + 20, y + 13);
    y += entryH;
  }

  // ── Game Modes ───────────────────────────────────────────────────────────
  y += 10;
  secHead('GAME MODES', col2);

  // Endless Mode
  ctx.font      = 'bold 15px "Courier New", monospace';
  ctx.fillStyle = '#4af';
  ctx.textAlign = 'left';
  ctx.fillText('ENDLESS MODE', col2, y);
  y += 18;
  ctx.font      = '13px "Courier New", monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Survive infinite waves — asteroids get', col2, y);
  y += 16;
  ctx.fillText('faster and more frequent over time.', col2, y);
  y += 24;

  // Progress Mode
  ctx.font      = 'bold 15px "Courier New", monospace';
  ctx.fillStyle = '#a8f';
  ctx.textAlign = 'left';
  ctx.fillText('PROGRESS MODE', col2, y);
  y += 18;
  ctx.font      = '13px "Courier New", monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Travel through 9 planets. Each has', col2, y);
  y += 16;
  ctx.fillText('unique hazards and a boss to defeat.', col2, y);
  y += 24;

  // Coins & Shop
  secHead('COINS & SHOP', col2, '#fd0');
  ctx.font      = '13px "Courier New", monospace';
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'left';
  ctx.fillText('Collect gold coins during gameplay.', col2, y);
  y += 16;
  ctx.fillText('Spend them in the Shop to unlock new', col2, y);
  y += 16;
  ctx.fillText('ship colors, hulls, and engines.', col2, y);

  // Back button
  const backW = 180, backH = 38;
  const backX = CANVAS_W / 2 - backW / 2;
  const backY = CANVAS_H - backH - 24;
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
  const entryH = 72;

  const totalH = CHANGELOG.length * entryH;
  const maxScroll = Math.max(0, totalH - areaH);
  changelogScrollY = Math.min(changelogScrollY, maxScroll);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, areaY, CANVAS_W, areaH);
  ctx.clip();

  const startY = areaY - changelogScrollY;

  const descMaxW = CANVAS_W - padX * 2 - 72;
  changelogShowMoreRects = [];

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

    // "NEW" badge on the newest entry
    if (i === 0) {
      const titleW  = ctx.measureText(entry.title).width;
      const bx      = padX + 72 + titleW + 10;
      const by      = ey + 8;
      const bw      = 36, bh = 16;
      ctx.fillStyle   = '#4f8';
      ctx.shadowColor = '#0f4';
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 4);
      ctx.fill();
      ctx.shadowBlur  = 0;
      ctx.font        = 'bold 10px "Courier New", monospace';
      ctx.fillStyle   = '#000';
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NEW', bx + bw / 2, by + bh / 2);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'top';
    }

    // Date — dedicated row between title and description
    if (entry.date) {
      ctx.font         = '11px "Courier New", monospace';
      ctx.fillStyle    = '#445';
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(entry.date, CANVAS_W - padX, ey + 27);
      ctx.textAlign    = 'left';
    }

    // Description — wrap to max 2 lines; show "▾ more" button if longer
    ctx.font      = '12px "Courier New", monospace';
    ctx.fillStyle = '#889';
    const lines = wrapText(entry.desc, descMaxW);
    if (lines.length <= 2) {
      ctx.fillText(lines[0] ?? '', padX + 72, ey + 40);
      if (lines[1]) ctx.fillText(lines[1], padX + 72, ey + 54);
    } else {
      ctx.fillText(lines[0], padX + 72, ey + 40);
      // Truncate line 2 to leave room for the "more" button
      const moreLabel = '▾ more';
      const moreLabelW = ctx.measureText('  ' + moreLabel).width;
      const line2MaxW  = descMaxW - moreLabelW;
      const remainWords = lines.slice(1).join(' ').split(' ');
      let line2 = '';
      for (const w of remainWords) {
        const t = line2 ? line2 + ' ' + w : w;
        if (ctx.measureText(t).width > line2MaxW) break;
        line2 = t;
      }
      ctx.fillText(line2 + '…', padX + 72, ey + 54);
      // "more" button
      const moreX = padX + 72 + descMaxW - ctx.measureText(moreLabel).width;
      const moreRect = { x: moreX - 4, y: ey + 47, w: ctx.measureText(moreLabel).width + 8, h: 15, idx: i };
      changelogShowMoreRects.push(moreRect);
      ctx.fillStyle = '#4af';
      ctx.fillText(moreLabel, moreX, ey + 54);
    }
  }

  ctx.restore();

  // Popup overlay for expanded entry
  if (changelogPopupEntry !== null && changelogPopupEntry < entries.length) {
    const pe = entries[changelogPopupEntry];
    ctx.fillStyle = 'rgba(0,0,20,0.82)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const popupW = Math.min(CANVAS_W - 80, 680);
    const popupX = (CANVAS_W - popupW) / 2;
    ctx.font = '13px "Courier New", monospace';
    const popupDescLines = wrapText(pe.desc, popupW - 40);
    const popupH = 64 + popupDescLines.length * 20 + 50;
    const popupY = Math.max(20, (CANVAS_H - popupH) / 2);

    ctx.fillStyle   = 'rgba(0,10,35,0.98)';
    ctx.strokeStyle = '#4af';
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#0af';
    ctx.shadowBlur  = 20;
    ctx.beginPath();
    ctx.roundRect(popupX, popupY, popupW, popupH, 12);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.font         = 'bold 12px "Courier New", monospace';
    ctx.fillStyle    = '#4af';
    ctx.fillText(pe.v, popupX + 20, popupY + 20);
    ctx.font         = 'bold 14px "Courier New", monospace';
    ctx.fillStyle    = '#fff';
    ctx.fillText(pe.title, popupX + 20 + ctx.measureText(pe.v + '   ').width, popupY + 20);

    ctx.font      = '13px "Courier New", monospace';
    ctx.fillStyle = '#aab';
    for (let li = 0; li < popupDescLines.length; li++) {
      ctx.fillText(popupDescLines[li], popupX + 20, popupY + 44 + li * 20);
    }

    // Close button
    const closeW = 90, closeH = 32;
    const closeX = popupX + (popupW - closeW) / 2;
    const closeY = popupY + popupH - closeH - 14;
    changelogPopupCloseRect = { x: closeX, y: closeY, w: closeW, h: closeH };

    ctx.fillStyle   = 'rgba(0,30,70,0.85)';
    ctx.strokeStyle = '#4af';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(closeX, closeY, closeW, closeH, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle    = '#fff';
    ctx.font         = 'bold 13px "Courier New", monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Close', closeX + closeW / 2, closeY + closeH / 2);
  } else {
    changelogPopupCloseRect = null;
  }

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
  const completeBanner = gameMode === 'progress'
    ? `${PLANET_DEFS[currentPlanet]?.name?.toUpperCase() ?? 'PLANET'} COMPLETE!`
    : `LEVEL ${currentLevel} COMPLETE!`;
  ctx.fillText(completeBanner, CANVAS_W / 2, bannerY + bannerH / 2);
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
  const continueLabel = gameMode === 'progress' ? 'Next Planet' : `Continue to Level ${currentLevel + 1}`;
  const buttons = [
    { key: 'continue', label: continueLabel,  hint: '',  color: '#4f8', bg: 'rgba(0,60,25,0.85)', btnH: 58 },
    { key: 'menu',     label: 'Main Menu',     hint: 'M', color: '#4af', bg: 'rgba(0,30,70,0.75)', btnH: 48 },
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

function renderTouchControls() {
  const tl = touchLayout;
  ctx.save();

  // ── Pause button (top-right) ──────────────────────────────────────────────
  ctx.globalAlpha = 0.65;
  ctx.fillStyle   = 'rgba(0,0,40,0.75)';
  ctx.strokeStyle = '#88f';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.roundRect(tl.pauseBtnX, tl.pauseBtnY, tl.pauseBtnW, tl.pauseBtnH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha  = 1;
  ctx.fillStyle    = '#fff';
  ctx.font         = 'bold 14px "Courier New", monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('II', tl.pauseBtnX + tl.pauseBtnW / 2, tl.pauseBtnY + tl.pauseBtnH / 2);

  // ── Joystick ──────────────────────────────────────────────────────────────
  const jbx = touch.joystick.active ? touch.joystick.baseX : tl.joystickCenterX;
  const jby = touch.joystick.active ? touch.joystick.baseY : tl.joystickCenterY;

  // Base ring
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.arc(jbx, jby, tl.joystickBaseR, 0, Math.PI * 2);
  ctx.fillStyle   = 'rgba(0,20,60,0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(100,180,255,0.6)';
  ctx.lineWidth   = 2.5;
  ctx.stroke();

  // Inner guide ring
  ctx.beginPath();
  ctx.arc(jbx, jby, tl.joystickMaxDist, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(100,180,255,0.25)';
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Thumb
  const thumbX = jbx + touch.joystick.dx * tl.joystickMaxDist;
  const thumbY = jby + touch.joystick.dy * tl.joystickMaxDist;
  ctx.globalAlpha = touch.joystick.active ? 0.85 : 0.50;
  ctx.beginPath();
  ctx.arc(thumbX, thumbY, tl.joystickThumbR, 0, Math.PI * 2);
  ctx.fillStyle   = 'rgba(80,160,255,0.5)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,210,255,0.9)';
  ctx.lineWidth   = 2.5;
  ctx.stroke();

  // ── Fire button (bottom-right) ────────────────────────────────────────────
  ctx.globalAlpha = touch.fire.active ? 0.90 : 0.60;
  ctx.beginPath();
  ctx.arc(tl.fireBtnX, tl.fireBtnY, tl.fireBtnR, 0, Math.PI * 2);
  ctx.fillStyle   = touch.fire.active ? 'rgba(255,80,0,0.65)' : 'rgba(60,0,0,0.55)';
  ctx.fill();
  ctx.strokeStyle = touch.fire.active ? '#ff8040' : '#f84';
  ctx.lineWidth   = 3;
  ctx.stroke();
  ctx.globalAlpha  = 1;
  ctx.fillStyle    = '#fff';
  ctx.font         = 'bold 14px "Courier New", monospace';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FIRE', tl.fireBtnX, tl.fireBtnY);

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
  ctx.font      = 'bold 28px "Courier New", monospace';
  ctx.fillStyle = '#f44';
  ctx.shadowColor = '#f00';
  ctx.shadowBlur  = 20;
  ctx.fillText(`⚠ ${boss ? boss.name.toUpperCase() : 'BOSS'} INCOMING ⚠`, CANVAS_W / 2, CANVAS_H / 2);
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
try {
  const c = JSON.parse(localStorage.getItem('astroCustomize'));
  if (c) {
    playerColor     = c.color           ?? '#4af';
    playerVariant   = c.variant         ?? 0;
    spaceCoins      = c.coins           ?? 0;
    unlockedColors  = c.unlockedColors  ?? [0];
    unlockedHulls   = c.unlockedHulls   ?? [0];
    playerEngine    = c.engine          ?? 0;
    unlockedEngines = c.unlockedEngines ?? [0];
    progressUnlocked = c.progressUnlocked ?? 0;
    soundMuted       = c.soundMuted       ?? false;
  }
} catch(e) {}
requestAnimationFrame(gameLoop);
