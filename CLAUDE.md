# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

Open `index.html` directly in a browser — no build step, no server required. There are no dependencies, tests, or package manager files.

## Architecture

Plain HTML5 Canvas game. No frameworks, no modules, no bundler. All code is vanilla JS loaded as classic `<script>` tags, sharing a single global scope.

### Load order (index.html)
```
src/config.js → src/setup.js → src/world.js → src/entities.js → src/core.js
```
Each file depends on globals defined by the files before it. Never reorder these.

### File responsibilities

| File | What it owns |
|---|---|
| `src/config.js` | Constants (`CANVAS_W/H`, speeds, timings), `DIFFICULTIES`, `CHANGELOG`, `POWERUP_TYPES` |
| `src/setup.js` | `canvas`, `ctx`, `resize()`, all `play*()` audio functions, all input event listeners, `isDown()` |
| `src/world.js` | Star parallax (`initStars`, `updateStars`, `renderStars`), utility functions (`dist`, `rand`, `hexDarken`, `circleRectDist`) |
| `src/entities.js` | `Player`, `Bullet`, `BossBullet`, `BOSS_DEFS`, `Boss`, `Asteroid`, `Particle`, `PowerUp` classes |
| `src/core.js` | All game state vars, `loadGame()`, `loadLevel()`, `saveGame()`, `update()`, `render()` and all render sub-functions, `gameLoop()`, boot |

### State machine
`gameState` drives everything in `update()` and `render()`:
```
'MENU' | 'PLAY_MODE' | 'DIFFICULTY' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'LEVEL_COMPLETE' | 'CONTROLS' | 'CHANGELOG'
```

### UI / button system
There are no DOM elements for UI — everything is drawn on canvas. Clickable buttons are stored as rect objects `{ x, y, w, h, key }` in arrays (e.g. `menuButtonRects`, `pauseButtonRects`). The canvas `click` handler in `setup.js` checks hits against these arrays. Render functions populate the rect arrays each frame as they draw.

### Boss system
`BOSS_DEFS` in `entities.js` defines per-difficulty boss stats. Easy and medium use arrays (`names[]`, `colors[]`, `variants[]`, `cannonCounts[]`) indexed by `level - 1`. Hard uses scalar fields (`name`, `color`, `variant`, `cannonCount`). Boss hull variants: `0`=arrowhead, `1`=fang, `2`=heavy cruiser, `3`=hammer, `4`=star. Cannon counts `1–3` determine barrel positions as fractions of boss height.

### Save system
`localStorage` key `'astroSave'`: `{ level, diff, score, lives }`. Written by `saveGame()` (called on level complete). Loaded via the Play Options screen.

## Versioning convention
- MINOR bump (e.g. `1.51.0 → 1.52.0`) for new features or significant changes
- PATCH bump (e.g. `1.51.0 → 1.51.1`) for small tweaks, label changes, cosmetic fixes

**Every time the user asks to add or change anything in the game, bump the version.** No exceptions — even single-line tweaks get a PATCH bump.

When bumping the version, add a new entry to the **END** of the `CHANGELOG` array in `src/config.js`. `renderChangelog()` reverses the array, so the last entry appears at the top (newest first). Also update the `verText` string inside `renderMenu()` in `src/core.js`.
