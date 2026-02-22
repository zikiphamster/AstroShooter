// ═══════════════════════════════════════════════════════════════════════════════
// ██  CORE
// ═══════════════════════════════════════════════════════════════════════════════

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
    { key: 'play',     label: 'PLAY',       hint: 'SPACE', color: '#4af', bg: 'rgba(0,40,90,0.75)', btnH: 58 },
    { key: 'controls', label: 'HOW TO PLAY', hint: 'C',    color: '#4af', bg: 'rgba(0,30,70,0.65)', btnH: 48 },
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

  // Version (clickable — opens changelog)
  ctx.font         = '15px "Courier New", monospace';
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'bottom';
  const verText = 'v1.51.0';
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
  ctx.fillText('Play Options', CANVAS_W / 2, CANVAS_H / 2 - 100);
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
      sub: hasSave ? `Level ${save.level}  ·  ${DIFFICULTIES[save.diff].label}  ·  ${save.lives} lives` : 'No save found',
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

  // Back button
  const backW = 180, backH = 44;
  const backX = cx - backW / 2, backY = btnY + 16;
  playModeButtonRects.push({ x: backX, y: backY, w: backW, h: backH, key: 'back' });
  ctx.shadowColor = '#48f';
  ctx.shadowBlur  = 8;
  ctx.fillStyle   = 'rgba(10,20,60,0.85)';
  ctx.strokeStyle = '#48f';
  ctx.lineWidth   = 2;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.roundRect(backX, backY, backW, backH, 10);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 16px "Courier New", monospace';
  ctx.fillText('← BACK', cx, backY + backH / 2);

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
requestAnimationFrame(gameLoop);
