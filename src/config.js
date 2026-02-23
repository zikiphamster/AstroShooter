// ═══════════════════════════════════════════════════════════════════════════════
// ██  CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

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

// ─── Difficulty Presets ───────────────────────────────────────────────────────
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

// ─── Customization ────────────────────────────────────────────────────────────
let playerColor    = '#4af';
let playerVariant  = 0;
let spaceCoins     = 0;
let unlockedColors = [0];   // indices into SHIP_COLORS that are unlocked
let unlockedHulls  = [0];   // hull variant indices that are unlocked

const SHIP_COLORS = ['#4af', '#4f8', '#f80', '#f44', '#f4f', '#ff4', '#fff', '#a8f'];
const COLOR_COSTS = [0, 40, 40, 40, 40, 40, 40, 40];

const HULL_DEFS = [
  { name: 'Arrowhead',   cost: 0   },  // 0 — default, free
  { name: 'Wedge',       cost: 20  },  // 1
  { name: 'Dart',        cost: 40  },  // 2
  { name: 'Cruiser',     cost: 60  },  // 3
  { name: 'Delta',       cost: 80  },  // 4
  { name: 'Razor',       cost: 100 },  // 5
  { name: 'Stealth',     cost: 120 },  // 6
  { name: 'Bomber',      cost: 140 },  // 7
  { name: 'Scout',       cost: 160 },  // 8
  { name: 'Interceptor', cost: 180 },  // 9
  { name: 'Hawk',        cost: 200 },  // 10
  { name: 'X-Fighter',   cost: 220 },  // 11
  { name: 'Mantis',      cost: 240 },  // 12
  { name: 'Phantom',     cost: 260 },  // 13
  { name: 'Titan',       cost: 280 },  // 14
  { name: 'Viper',       cost: 300 },  // 15
  { name: 'Raptor',      cost: 320 },  // 16
  { name: 'Javelin',     cost: 340 },  // 17
  { name: 'Cobra',       cost: 360 },  // 18
  { name: 'Omega',       cost: 400 },  // 19
];

// Coins spawned per batch by difficulty
const COIN_BATCH = { easy: 3, medium: 5, hard: 8 };

// ─── Hull Attributes ──────────────────────────────────────────────────────────
// One entry per hull (0–19). Values 1–5: higher = better.
const HULL_STATS = [
  { spd:3, rate:3, def:3, pow:3 },  // 0  Arrowhead  (balanced)
  { spd:4, rate:3, def:2, pow:3 },  // 1  Wedge
  { spd:5, rate:4, def:1, pow:2 },  // 2  Dart       (speed)
  { spd:2, rate:3, def:5, pow:3 },  // 3  Cruiser    (tank)
  { spd:4, rate:2, def:3, pow:4 },  // 4  Delta
  { spd:5, rate:4, def:1, pow:3 },  // 5  Razor
  { spd:4, rate:5, def:2, pow:2 },  // 6  Stealth    (rate)
  { spd:2, rate:2, def:4, pow:5 },  // 7  Bomber     (power tank)
  { spd:5, rate:3, def:2, pow:3 },  // 8  Scout
  { spd:5, rate:4, def:2, pow:4 },  // 9  Interceptor
  { spd:4, rate:5, def:3, pow:3 },  // 10 Hawk
  { spd:3, rate:4, def:4, pow:4 },  // 11 X-Fighter
  { spd:3, rate:5, def:3, pow:4 },  // 12 Mantis
  { spd:4, rate:3, def:5, pow:3 },  // 13 Phantom
  { spd:2, rate:2, def:5, pow:5 },  // 14 Titan      (max tank/power)
  { spd:5, rate:3, def:3, pow:4 },  // 15 Viper
  { spd:4, rate:4, def:4, pow:4 },  // 16 Raptor     (all-rounder)
  { spd:5, rate:5, def:2, pow:3 },  // 17 Javelin    (max speed/rate)
  { spd:3, rate:4, def:4, pow:5 },  // 18 Cobra
  { spd:4, rate:4, def:5, pow:5 },  // 19 Omega      (premium)
];

// ─── Engines ──────────────────────────────────────────────────────────────────
// Stat deltas range −2 to +2. Combined with hull stats → gameplay multipliers.
const ENGINE_DEFS = [
  { name: 'Standard',    cost:   0, spd: 0, rate: 0, def: 0, pow: 0 },  // 0 free/default
  { name: 'Afterburner', cost:  40, spd:+2, rate: 0, def:-1, pow: 0 },  // 1
  { name: 'Pulse Drive', cost:  60, spd: 0, rate:+2, def: 0, pow: 0 },  // 2
  { name: 'Bulwark',     cost:  80, spd:-1, rate: 0, def:+2, pow: 0 },  // 3
  { name: 'Ion Core',    cost: 120, spd:+1, rate: 0, def: 0, pow:+2 },  // 4
  { name: 'Quantum',     cost: 200, spd:+1, rate:+1, def:+1, pow:+1 },  // 5
];

let playerEngine    = 0;
let unlockedEngines = [0];

// ─── Changelog ────────────────────────────────────────────────────────────────
// NOTE: Add NEW entries at the END of this array. renderChangelog() reverses it
//       so the last entry appears at the top (newest first).
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
  { v: 'v1.40.0', title: 'Changelog NEW Badge',      desc: 'The newest entry in the changelog now shows a green NEW badge next to its title.' },
  { v: 'v1.41.0', title: 'Title Renamed',            desc: 'Main menu title changed from "ASTEROID BLASTER" to "AstroShooter".' },
  { v: 'v1.42.0', title: 'Play Options Renamed',     desc: 'Play mode screen title changed from "HOW DO YOU WANT TO PLAY?" to "Play Options".' },
  { v: 'v1.43.0', title: 'Clickable Version Number', desc: 'The version number in the bottom-right of the main menu is now clickable and opens the changelog. The standalone Changelog button has been removed.' },
  { v: 'v1.44.0', title: 'Easy Mode Boss Names',     desc: 'Each level in easy mode now has a unique boss name: Iron Fang, Void King, Night Hammer, Black Nova, Space Tyrant, War Pulse, Rift Lord, Dark Core.' },
  { v: 'v1.45.0', title: 'Boss AI Scaling',          desc: 'Bosses now scale with level: more HP, faster movement, quicker charges, and predictive aiming. Bullet count stays fixed. Fixed a crash caused by the boss warning banner referencing an undefined name for easy mode.' },
  { v: 'v1.46.0', title: 'Boss Visual Variants',     desc: 'Easy mode bosses now each have a unique color, hull shape (arrowhead, fang, cruiser, hammer, or star), and cannon count (1–3 barrels) that varies per level. Medium and hard keep their existing single design.' },
  { v: 'v1.47.0', title: 'Unique Boss Designs',      desc: 'Medium (Galaxy Warden) now uses the Heavy Cruiser hull with 2 cannons. Hard (Omega Devourer) uses the Star hull with 3 cannons. Every boss across all difficulties now has a completely unique shape and cannon configuration.' },
  { v: 'v1.48.0', title: 'Medium Boss Names',        desc: 'Each level in medium mode now has a unique boss name: Starcrusher, Voidstorm, Ironclad, Nightfall, Warbringer, Skybreaker, Darkstar, Dreadcore, Stormlord.' },
  { v: 'v1.49.0', title: 'Medium Boss Visuals',      desc: 'Every medium boss now has a unique color, hull shape, and cannon count. No two bosses in medium mode share the same design.' },
  { v: 'v1.50.0', title: 'Play Options Back Button', desc: 'Play Options screen now has a clickable Back button in addition to the ESC shortcut.' },
  { v: 'v1.51.0', title: 'Back Button Arrow',        desc: 'The Back button on the Play Options screen now shows a ← arrow.' },
  { v: 'v1.52.0', title: 'Ship Customization',       desc: 'New Customize screen from the main menu. Choose from 8 hull colors and 4 ship shapes (Arrowhead, Wedge, Dart, Cruiser). Your choice is saved between sessions.' },
  { v: 'v1.53.0', title: 'SpaceCoins & Unlocks',    desc: 'Coins spawn on the map during gameplay — fly over them to collect. Spend SpaceCoins to unlock 19 hull shapes and 7 colors in the Customize screen. Higher difficulty spawns more coins per batch.' },
  { v: 'v1.53.1', title: 'Customize Renamed to Shop', desc: 'The Customize button and screen have been renamed to Shop.' },
  { v: 'v1.54.0', title: 'Hull Attributes & Engines', desc: 'Every hull now has Speed, Fire Rate, Defense, and Bullet Power ratings shown as stat bars in the Shop. Buy one of 6 engines (Standard through Quantum) to boost or trade off stats. Combined hull + engine values scale real gameplay: movement speed, fire rate, invincibility time, and bullet speed.' },
  { v: 'v1.54.1', title: 'Shop Two-Column Layout',   desc: 'Shop screen reorganised into two columns: attributes on the left alongside ship preview and colour swatches, hull grid and engine grid on the right.' },
  { v: 'v1.54.2', title: 'Price Reductions',         desc: 'All shop items are cheaper: hull colors reduced by ~20%, hull shapes now scale from 20 to 400 coins, and engines range from 40 to 200 coins.' },
  { v: 'v1.54.3', title: 'Flat Color Pricing',       desc: 'All unlockable colors now cost a flat 40 coins each.' },
  { v: 'v1.54.4', title: 'Coin HUD & Visual Polish', desc: 'In-game coins now match the shop icon style (solid gold with dark inner circle). SpaceCoins balance shown in the bottom-right corner during gameplay.' },
];

// ─── Power-Ups ────────────────────────────────────────────────────────────────
const POWERUP_TYPES = {
  rapidfire:  { label: 'RAPID FIRE',  color: '#f80', symbol: 'RF', duration: 10, desc: 'Shoot 3x faster'      },
  tripleshot: { label: 'TRIPLE SHOT', color: '#d0f', symbol: '|||',duration: 10, desc: 'Fire 3 bullets at once'},
  speedboost: { label: 'SPEED BOOST', color: '#0f8', symbol: '>>',  duration: 10, desc: 'Move 1.6x faster'    },
  shield:     { label: 'SHIELD',      color: '#4af', symbol: 'SH',  duration: 0,  desc: '5s of invincibility' },
  bomb:       { label: 'BOMB',        color: '#f44', symbol: 'BM',  duration: 0,  desc: 'Clears all asteroids' },
  extralife:  { label: 'EXTRA LIFE',  color: '#f4f', symbol: '+1',  duration: 0,  desc: '+1 life'             },
};
const POWERUP_IDS = Object.keys(POWERUP_TYPES);
