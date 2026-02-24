// ═══════════════════════════════════════════════════════════════════════════════
// ██  SETUP
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Canvas ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

function resize() {
  canvas.width  = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  CANVAS_W = canvas.width;
  CANVAS_H = canvas.height;
  initStars();
  if (IS_TOUCH) updateTouchLayout();
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

function playCollectCoin() {
  if (audioCtx.state !== 'running') return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.12);
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
    else if (gameState === 'SOLAR_MAP')  { selectedPlanet = null; gameState = 'PLAY_MODE'; }
    else if (gameState === 'CONTROLS')   gameState = 'MENU';
    else if (gameState === 'CHANGELOG')  gameState = 'MENU';
    else if (gameState === 'SHOP')       { shopScrollY = 0; gameState = 'MENU'; }
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
  if (gameState === 'SHOP') {
    shopScrollY = Math.max(0, shopScrollY + e.deltaY);
  }
}, { passive: true });

function handleCanvasClick(mx, my) {
  if (gameState === 'MENU') {
    for (const btn of menuButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (btn.key === 'play')      gameState = 'PLAY_MODE';
        if (btn.key === 'shop')      gameState = 'SHOP';
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
  } else if (gameState === 'SHOP') {
    const smy = my + shopScrollY;  // adjust for scroll offset
    for (const btn of shopButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && smy >= btn.y && smy <= btn.y + btn.h) {
        if (btn.key.startsWith('color_')) {
          const i = +btn.key.split('_')[1];
          if (unlockedColors.includes(i)) {
            playerColor = SHIP_COLORS[i];
            saveShop();
          } else if (spaceCoins >= COLOR_COSTS[i]) {
            spaceCoins -= COLOR_COSTS[i];
            unlockedColors.push(i);
            playerColor = SHIP_COLORS[i];
            saveShop();
          }
        } else if (btn.key.startsWith('variant_')) {
          const i = +btn.key.split('_')[1];
          if (unlockedHulls.includes(i)) {
            playerVariant = i;
            saveShop();
          } else if (spaceCoins >= HULL_DEFS[i].cost) {
            spaceCoins -= HULL_DEFS[i].cost;
            unlockedHulls.push(i);
            playerVariant = i;
            saveShop();
          }
        } else if (btn.key.startsWith('engine_')) {
          const i = +btn.key.split('_')[1];
          if (unlockedEngines.includes(i)) {
            playerEngine = i;
            saveShop();
          } else if (spaceCoins >= ENGINE_DEFS[i].cost) {
            spaceCoins -= ENGINE_DEFS[i].cost;
            unlockedEngines.push(i);
            playerEngine = i;
            saveShop();
          }
        } else if (btn.key === 'back') {
          shopScrollY = 0;
          gameState = 'MENU';
        }
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
        if (btn.key === 'continue') {
          if (gameMode === 'progress') { selectedPlanet = null; gameState = 'SOLAR_MAP'; }
          else { loadLevel(currentLevel + 1); }
        }
        if (btn.key === 'menu') { gameMode = 'endless'; gameState = 'MENU'; }
      }
    }
  } else if (gameState === 'PLAY_MODE') {
    for (const btn of playModeButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (btn.key === 'endless') {
          gameMode  = 'endless';
          gameState = 'DIFFICULTY';
        } else if (btn.key === 'progress') {
          gameMode  = 'progress';
          gameState = 'SOLAR_MAP';
        } else if (btn.key === 'load') {
          try {
            const save = JSON.parse(localStorage.getItem('astroSave'));
            if (save) {
              gameMode    = 'endless';
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
        } else if (btn.key === 'back') {
          gameState = 'MENU';
        }
        break; // stop after first matched button — prevents overlapping rects from double-firing
      }
    }
  } else if (gameState === 'SOLAR_MAP') {
    for (const btn of solarMapButtonRects) {
      // Circle hit test for planets, rect for UI buttons
      const hit = btn.r > 0
        ? dist(mx, my, btn.cx, btn.cy) <= btn.r
        : mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h;
      if (!hit) continue;
      if (btn.key === 'map_back') {
        selectedPlanet = null;
        gameState = 'PLAY_MODE';
      } else if (btn.key === 'close_panel') {
        selectedPlanet = null;
      } else if (btn.key === 'launch') {
        const p = PLANET_DEFS[selectedPlanet];
        DIFFICULTIES['progress'] = {
          label: p.name.toUpperCase(), color: p.color,
          lives: p.lives, spawnMult: p.spawnMult, speedMult: p.speedMult,
          largeChance: p.largeChance, medChance: p.medChance,
        };
        currentPlanet  = selectedPlanet;
        currentDiff    = 'progress';
        selectedPlanet = null;
        loadGame();
      } else if (btn.key.startsWith('planet_')) {
        const i = +btn.key.split('_')[1];
        selectedPlanet = (selectedPlanet === i) ? null : i;
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
}

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  handleCanvasClick(e.clientX - rect.left, e.clientY - rect.top);
});

function isDown(...codes) {
  return codes.some(c => keys[c]);
}

// ─── Touch Input ──────────────────────────────────────────────────────────────
const touch = {
  joystick: { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0, magnitude: 0 },
  fire:     { active: false, id: null },
  pause:    { active: false, id: null },
};

let touchLayout = {
  joystickBaseR:   60, joystickThumbR: 28, joystickMaxDist: 55,
  joystickCenterX: 0,  joystickCenterY: 0,
  fireBtnR:  55, fireBtnX: 0, fireBtnY: 0,
  pauseBtnW: 70, pauseBtnH: 44, pauseBtnX: 0, pauseBtnY: 0,
};

function updateTouchLayout() {
  const tl = touchLayout;
  tl.joystickCenterX = tl.joystickBaseR + 28;
  tl.joystickCenterY = CANVAS_H - tl.joystickBaseR - 28;
  tl.fireBtnX = CANVAS_W - tl.fireBtnR - 40;
  tl.fireBtnY = CANVAS_H - tl.fireBtnR - 40;
  tl.pauseBtnX = CANVAS_W - tl.pauseBtnW - 14;
  tl.pauseBtnY = 52;
}

if (IS_TOUCH) {
  updateTouchLayout();

  let _scrollId = null, _scrollY0 = 0, _scrollSY0 = 0;

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    for (const t of e.changedTouches) {
      const rect = canvas.getBoundingClientRect();
      const tx = t.clientX - rect.left;
      const ty = t.clientY - rect.top;

      // ── Pause button (top-right) — available in PLAYING and PAUSED ──────
      if (gameState === 'PLAYING' || gameState === 'PAUSED') {
        const tl = touchLayout;
        if (tx >= tl.pauseBtnX && tx <= tl.pauseBtnX + tl.pauseBtnW &&
            ty >= tl.pauseBtnY && ty <= tl.pauseBtnY + tl.pauseBtnH) {
          touch.pause.active = true;
          touch.pause.id     = t.identifier;
          continue;
        }
      }

      if (gameState === 'PLAYING') {
        // ── Joystick zone: left half, bottom 40% ─────────────────────────
        if (tx < CANVAS_W / 2 && ty > CANVAS_H * 0.60) {
          if (!touch.joystick.active) {
            touch.joystick.active = true;
            touch.joystick.id     = t.identifier;
            touch.joystick.baseX  = tx;
            touch.joystick.baseY  = ty;
            touch.joystick.dx     = 0;
            touch.joystick.dy     = 0;
            touch.joystick.magnitude = 0;
          }
          continue;
        }
        // ── Fire zone: right half, bottom 40% ────────────────────────────
        if (tx >= CANVAS_W / 2 && ty > CANVAS_H * 0.60) {
          if (!touch.fire.active) {
            touch.fire.active = true;
            touch.fire.id     = t.identifier;
          }
          continue;
        }
      }

      // ── Scroll anchor for SHOP / CHANGELOG ───────────────────────────────
      if ((gameState === 'SHOP' || gameState === 'CHANGELOG') && _scrollId === null) {
        _scrollId  = t.identifier;
        _scrollY0  = t.clientY;
        _scrollSY0 = gameState === 'SHOP' ? shopScrollY : changelogScrollY;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();

    for (const t of e.changedTouches) {
      // Update joystick thumb position
      if (touch.joystick.active && t.identifier === touch.joystick.id) {
        const rect = canvas.getBoundingClientRect();
        const tx = t.clientX - rect.left;
        const ty = t.clientY - rect.top;
        const rawDx   = tx - touch.joystick.baseX;
        const rawDy   = ty - touch.joystick.baseY;
        const rawDist = Math.sqrt(rawDx * rawDx + rawDy * rawDy) || 1;
        const clamped = Math.min(rawDist, touchLayout.joystickMaxDist);
        touch.joystick.magnitude = clamped / touchLayout.joystickMaxDist;
        touch.joystick.dx = (rawDx / rawDist) * touch.joystick.magnitude;
        touch.joystick.dy = (rawDy / rawDist) * touch.joystick.magnitude;
      }

      // Swipe scroll in SHOP / CHANGELOG
      if (t.identifier === _scrollId) {
        const delta = _scrollY0 - t.clientY;
        const newY  = Math.max(0, _scrollSY0 + delta);
        if (gameState === 'SHOP')      shopScrollY      = newY;
        if (gameState === 'CHANGELOG') changelogScrollY = newY;
      }
    }
  }, { passive: false });

  function onTouchEnd(e) {
    e.preventDefault();

    for (const t of e.changedTouches) {
      const rect = canvas.getBoundingClientRect();
      const tx = t.clientX - rect.left;
      const ty = t.clientY - rect.top;

      // Release joystick
      if (touch.joystick.active && t.identifier === touch.joystick.id) {
        touch.joystick.active    = false;
        touch.joystick.id        = null;
        touch.joystick.dx        = 0;
        touch.joystick.dy        = 0;
        touch.joystick.magnitude = 0;
      }

      // Release fire
      if (touch.fire.active && t.identifier === touch.fire.id) {
        touch.fire.active = false;
        touch.fire.id     = null;
      }

      // Release scroll tracker
      if (t.identifier === _scrollId) _scrollId = null;

      // Pause touch — leave active=true to be consumed by update()
      if (touch.pause.active && t.identifier === touch.pause.id) {
        touch.pause.id = null;
        // touch.pause.active stays true — consumed in update()
      }

      // Non-PLAYING states: treat lift as a click
      if (gameState !== 'PLAYING') {
        handleCanvasClick(tx, ty);
      }
    }
  }
  canvas.addEventListener('touchend',    onTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });
}
