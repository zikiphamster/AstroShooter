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
  if (audioCtx.state !== 'running' || soundMuted) return;
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
  if (audioCtx.state !== 'running' || soundMuted) return;
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
  if (audioCtx.state !== 'running' || soundMuted) return;
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
  if (audioCtx.state !== 'running' || soundMuted) return;
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
  if (audioCtx.state !== 'running' || soundMuted) return;
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
  if (audioCtx.state !== 'running' || soundMuted) return;
  [0, 120, 260].forEach(delayMs => {
    setTimeout(() => playExplosion(0), delayMs);
  });
}

function playCollectCoin() {
  if (audioCtx.state !== 'running' || soundMuted) return;
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
    else if (gameState === 'PLAY_MODE')  { gameState = 'MENU'; }
    else if (gameState === 'SOLAR_MAP')  { selectedPlanet = null; gameState = 'PLAY_MODE'; }
    else if (gameState === 'CONTROLS')   gameState = 'MENU';
    else if (gameState === 'CHANGELOG')  gameState = 'MENU';
    else if (gameState === 'SHOP')       { shopScrollY = 0; shopPreviewKey = null; shopCoinSecret = false; gameState = 'MENU'; }
    else if (gameState === 'SETTINGS')   gameState = 'MENU';
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
  if (btnAnim.active) return; // block clicks during animation

  // Neptune death cutscene intercepts all clicks during dialogue phases
  if (neptuneDeathActive && (neptuneDeathStep === 0 || neptuneDeathStep === 2)) {
    const hit = (r) => r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
    if (hit(neptuneDeathNextRect)) advanceNeptuneDeath();
    return;
  }

  // Boss dialogue intercepts all clicks while active (checked before pre-launch dialogue)
  if (bossDialogueActive) {
    const hit = (r) => r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
    if (hit(bossDialogueNextRect)) advanceBossDialogue();
    return;
  }

  // Dialogue intercepts all clicks while active
  if (dialogueActive) {
    const hit = (r) => r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
    if (hit(dialogueNextRect)) advanceDialogue();
    return;
  }

  // Tutorial overlay intercepts all clicks while active
  if (tutorialActive) {
    const hit = (r) => r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
    if (hit(tutorialCloseRect))      completeTutorial();
    else if (hit(tutorialNextRect))  advanceTutorial();
    else if (hit(tutorialPrevRect))  { if (tutorialStep > 0) tutorialStep--; }
    return; // swallow all other clicks while tutorial is open
  }

  if (gameState === 'MENU') {
    for (const btn of menuButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        const colors = { play: '#4f8', shop: '#fa5', controls: '#4af', changelog: '#a8f' };
        const c = colors[btn.key] ?? '#fff';
        if (btn.key === 'play')
          startBtnAnim(btn, c, () => { gameState = 'PLAY_MODE'; });
        else if (btn.key === 'shop')
          startBtnAnim(btn, c, () => {
            gameState = 'SHOP';
            let seen = false;
            try { seen = !!localStorage.getItem('shopTutorialSeen'); } catch(_) {}
            if (!seen) { tutorialContext = 'shop'; tutorialActive = true; tutorialStep = 0; }
          });
        else if (btn.key === 'controls')
          startBtnAnim(btn, c, () => { gameState = 'CONTROLS'; });
        else if (btn.key === 'settings')
          startBtnAnim(btn, c, () => { gameState = 'SETTINGS'; });
        else if (btn.key === 'changelog')
          startBtnAnim(btn, c, () => { gameState = 'CHANGELOG'; changelogScrollY = 0; });
      }
    }

  } else if (gameState === 'CONTROLS') {
    if (controlsBackRect) {
      const r = controlsBackRect;
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h)
        startBtnAnim(r, '#4af', () => { gameState = 'MENU'; });
    }

  } else if (gameState === 'SETTINGS') {
    for (const btn of settingsButtonRects) {
      if (!(mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h)) continue;
      if (btn.key === 'sound')
        startBtnAnim(btn, soundMuted ? '#4f8' : '#f44', () => { soundMuted = !soundMuted; saveShop(); });
      else if (btn.key === 'replay_tutorial')
        startBtnAnim(btn, '#a8f', () => {
          tutorialContext = 'progress';
          gameMode        = 'progress';
          gameState       = 'SOLAR_MAP';
          tutorialActive  = true;
          tutorialStep    = 0;
        });
      else if (btn.key === 'replay_shop_tutorial')
        startBtnAnim(btn, '#8af', () => {
          tutorialContext = 'shop';
          gameState       = 'SHOP';
          tutorialActive  = true;
          tutorialStep    = 0;
        });
      else if (btn.key === 'back')
        startBtnAnim(btn, '#4af', () => { gameState = 'MENU'; });
      break;
    }

  } else if (gameState === 'SHOP') {
    // Secret overlay intercepts all clicks
    if (shopCoinSecret) {
      const r = shopSecretRect;
      const rr = shopSecretResetRect;
      if (r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        spaceCoins += 1000;
        saveShop();
      } else if (rr && mx >= rr.x && mx <= rr.x + rr.w && my >= rr.y && my <= rr.y + rr.h) {
        unlockedHulls   = [0];
        unlockedEngines = [0];
        unlockedColors  = [0];
        playerVariant   = 0;
        playerEngine    = 0;
        playerColor     = SHIP_COLORS[0];
        shopPreviewKey  = null;
        saveShop();
      }
      shopCoinSecret = false;
      return;
    }

    const smy = my + shopScrollY;
    for (const btn of shopButtonRects) {
      if (!(mx >= btn.x && mx <= btn.x + btn.w && smy >= btn.y && smy <= btn.y + btn.h)) continue;
      if (btn.key === 'coin_secret') {
        shopCoinSecret = true;
      } else if (btn.key.startsWith('color_')) {
        const i = +btn.key.split('_')[1];
        shopPreviewKey = null;
        if (unlockedColors.includes(i)) {
          startBtnAnim({ x: btn.x, y: btn.y - shopScrollY, w: btn.w, h: btn.h }, SHIP_COLORS[i], () => { playerColor = SHIP_COLORS[i]; saveShop(); });
        } else if (spaceCoins >= COLOR_COSTS[i]) {
          startBtnAnim({ x: btn.x, y: btn.y - shopScrollY, w: btn.w, h: btn.h }, '#fa0', () => { spaceCoins -= COLOR_COSTS[i]; unlockedColors.push(i); playerColor = SHIP_COLORS[i]; saveShop(); });
        }
      } else if (btn.key.startsWith('variant_')) {
        // Toggle preview on first click; re-click to deselect
        shopPreviewKey = shopPreviewKey === btn.key ? null : btn.key;
      } else if (btn.key.startsWith('engine_')) {
        shopPreviewKey = shopPreviewKey === btn.key ? null : btn.key;
      } else if (btn.key === 'preview_action') {
        if (shopPreviewKey) {
          if (shopPreviewKey.startsWith('variant_')) {
            const i = +shopPreviewKey.split('_')[1];
            if (unlockedHulls.includes(i) && playerVariant !== i) {
              startBtnAnim({ x: btn.x, y: btn.y - shopScrollY, w: btn.w, h: btn.h }, '#4af', () => { playerVariant = i; shopPreviewKey = null; saveShop(); });
            } else if (!unlockedHulls.includes(i) && spaceCoins >= HULL_DEFS[i].cost) {
              startBtnAnim({ x: btn.x, y: btn.y - shopScrollY, w: btn.w, h: btn.h }, '#fa0', () => { spaceCoins -= HULL_DEFS[i].cost; unlockedHulls.push(i); playerVariant = i; shopPreviewKey = null; saveShop(); });
            }
          } else if (shopPreviewKey.startsWith('engine_')) {
            const i = +shopPreviewKey.split('_')[1];
            if (unlockedEngines.includes(i) && playerEngine !== i) {
              startBtnAnim({ x: btn.x, y: btn.y - shopScrollY, w: btn.w, h: btn.h }, '#4af', () => { playerEngine = i; shopPreviewKey = null; saveShop(); });
            } else if (!unlockedEngines.includes(i) && spaceCoins >= ENGINE_DEFS[i].cost) {
              startBtnAnim({ x: btn.x, y: btn.y - shopScrollY, w: btn.w, h: btn.h }, '#fa0', () => { spaceCoins -= ENGINE_DEFS[i].cost; unlockedEngines.push(i); playerEngine = i; shopPreviewKey = null; saveShop(); });
            }
          }
        }
      } else if (btn.key === 'back') {
        shopPreviewKey = null;
        shopCoinSecret = false;
        startBtnAnim(btn, '#4af', () => { shopScrollY = 0; gameState = 'MENU'; });
      }
      break;
    }

  } else if (gameState === 'CHANGELOG') {
    if (changelogPopupEntry !== null && changelogPopupCloseRect) {
      const r = changelogPopupCloseRect;
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h)
        startBtnAnim(r, '#4af', () => { changelogPopupEntry = null; });
      else
        changelogPopupEntry = null;
      return;
    }
    for (const r of changelogShowMoreRects) {
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        changelogPopupEntry = r.idx;
        return;
      }
    }
    if (changelogBackRect) {
      const r = changelogBackRect;
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h)
        startBtnAnim(r, '#4af', () => { gameState = 'MENU'; });
    }

  } else if (gameState === 'PAUSED') {
    for (const btn of pauseButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        const colors = { resume: '#4f8', restart: '#f44', menu: '#4af' };
        const c = colors[btn.key] ?? '#fff';
        if (btn.key === 'resume')
          startBtnAnim(btn, c, () => { gameState = 'PLAYING'; });
        else if (btn.key === 'restart')
          startBtnAnim(btn, c, () => { gameState = 'PLAYING'; loadGame(); });
        else if (btn.key === 'menu')
          startBtnAnim(btn, c, () => { gameState = 'MENU'; });
        break;
      }
    }

  } else if (gameState === 'GAME_OVER') {
    for (const btn of gameOverButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (btn.key === 'play')
          startBtnAnim(btn, '#4f8', () => { gameState = 'PLAYING'; loadGame(); });
        else if (btn.key === 'menu')
          startBtnAnim(btn, '#4af', () => { gameState = 'MENU'; });
        break;
      }
    }

  } else if (gameState === 'LEVEL_COMPLETE') {
    for (const btn of levelCompleteButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (btn.key === 'continue')
          startBtnAnim(btn, '#4f8', () => {
            if (gameMode === 'progress') { selectedPlanet = null; gameState = 'SOLAR_MAP'; }
            else { loadLevel(currentLevel + 1); }
          });
        else if (btn.key === 'menu')
          startBtnAnim(btn, '#4af', () => { gameMode = 'endless'; gameState = 'MENU'; });
        break;
      }
    }

  } else if (gameState === 'PLAY_MODE') {
    for (const btn of playModeButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        if (btn.key === 'endless')
          startBtnAnim(btn, '#4af', () => { gameMode = 'endless'; gameState = 'DIFFICULTY'; });
        else if (btn.key === 'progress')
          startBtnAnim(btn, '#a8f', () => {
            gameMode = 'progress';
            gameState = 'SOLAR_MAP';
            let seen = false;
            try { seen = !!localStorage.getItem('progressTutorialSeen'); } catch(_) {}
            if (!seen) { tutorialContext = 'progress'; tutorialActive = true; tutorialStep = 0; }
          });
        else if (btn.key === 'back')
          startBtnAnim(btn, '#4af', () => { gameState = 'MENU'; });
        break;
      }
    }

  } else if (gameState === 'SOLAR_MAP') {
    for (const btn of solarMapButtonRects) {
      const hit = btn.r > 0
        ? dist(mx, my, btn.cx, btn.cy) <= btn.r
        : mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h;
      if (!hit) continue;
      if (btn.key === 'galaxy_prev') {
        startBtnAnim(btn, '#a8f', () => { currentGalaxy--; selectedPlanet = null; });
      } else if (btn.key === 'galaxy_next') {
        startBtnAnim(btn, '#a8f', () => { currentGalaxy++; selectedPlanet = null; });
      } else if (btn.key === 'map_back') {
        startBtnAnim(btn, '#4af', () => { selectedPlanet = null; gameState = 'PLAY_MODE'; });
      } else if (btn.key === 'close_panel') {
        startBtnAnim(btn, '#f88', () => { selectedPlanet = null; });
      } else if (btn.key === 'launch' && solarMapLaunchTimer === 0) {
        const activePlanets = currentGalaxy === 0 ? PLANET_DEFS : VEIL_PLANET_DEFS;
        const p = activePlanets[selectedPlanet];
        DIFFICULTIES['progress'] = {
          label: p.name.toUpperCase(), color: p.color,
          lives: p.lives, spawnMult: p.spawnMult, speedMult: p.speedMult,
          largeChance: p.largeChance, medChance: p.medChance,
        };
        currentPlanet       = selectedPlanet;
        currentDiff         = 'progress';
        solarMapLaunchTimer = 1.6;
      } else if (btn.key.startsWith('planet_')) {
        const i = +btn.key.split('_')[1];
        const col = btn.color ?? '#fff';
        startBtnAnim(btn, col, () => { selectedPlanet = (selectedPlanet === i) ? null : i; });
      }
      break;
    }

  } else if (gameState === 'DIFFICULTY') {
    for (const btn of diffButtonRects) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        currentDiff = btn.key;
        startBtnAnim(btn, DIFFICULTIES[btn.key]?.color ?? '#fff', () => { gameState = 'PLAYING'; loadGame(); });
        break;
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

// ─── Dialogue Functions ───────────────────────────────────────────────────────
function advanceDialogue() {
  dialogueStep++;
  if (dialogueStep >= currentDialogueLines.length) {
    dialogueActive       = false;
    dialogueStep         = 0;
    currentDialogueLines = [];
    loadGame();
    gameState = 'PLAYING';
  }
}

function advanceBossDialogue() {
  bossDialogueStep++;
  if (bossDialogueStep >= currentBossDialogueLines.length) {
    bossDialogueActive       = false;
    bossDialogueStep         = 0;
    currentBossDialogueLines = [];
  }
}

function advanceNeptuneDeath() {
  if (neptuneDeathStep === 0) {
    neptuneDeathLineStep++;
    if (neptuneDeathLineStep >= NEPTUNE_DEATH_LINES.length) {
      neptuneDeathStep = 1; // start portal cinematic
      portalTimer      = 0;
    }
  } else if (neptuneDeathStep === 2) {
    neptuneDeathLineStep++;
    if (neptuneDeathLineStep >= VEIL_ARRIVAL_LINES.length) {
      neptuneDeathActive = false;
      gameState          = 'SOLAR_MAP';
      selectedPlanet     = null;
    }
  }
}

// ─── Tutorial Functions ───────────────────────────────────────────────────────
function advanceTutorial() {
  const slides = tutorialContext === 'shop' ? SHOP_TUTORIAL_SLIDES : TUTORIAL_SLIDES;
  tutorialStep++;
  if (tutorialStep >= slides.length) {
    completeTutorial();
  }
}

function completeTutorial() {
  tutorialActive = false;
  tutorialStep   = 0;
  const key = tutorialContext === 'shop' ? 'shopTutorialSeen' : 'progressTutorialSeen';
  try { localStorage.setItem(key, '1'); } catch(_) {}
}

// Start the universal button click animation; callback fires when animation ends
function startBtnAnim(rect, color, callback, dur = 0.32) {
  if (btnAnim.active) return;
  btnAnim.active     = true;
  btnAnim.cx         = rect.r > 0 ? rect.cx : rect.x + rect.w / 2;
  btnAnim.cy         = rect.r > 0 ? rect.cy : rect.y + rect.h / 2;
  btnAnim.w          = rect.w ?? 0;
  btnAnim.h          = rect.h ?? 0;
  btnAnim.r          = rect.r ?? 0;
  btnAnim.color      = color;
  btnAnim.dur        = dur;
  btnAnim.timer      = dur;
  btnAnim.onComplete = callback;
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
