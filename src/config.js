// ═══════════════════════════════════════════════════════════════════════════════
// ██  CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Constants ────────────────────────────────────────────────────────────────
let CANVAS_W = window.innerWidth;
let CANVAS_H = window.innerHeight;
const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
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
const diffButtonRects    = [];
const menuButtonRects    = [];
const gameOverButtonRects = [];
const settingsButtonRects = [];
let controlsBackRect    = null;
let soundMuted          = false;
let solarMapLaunchTimer = 0;   // countdown before entering PLAYING after launch
// Universal button click animation — one active at a time
const btnAnim = { active: false, cx: 0, cy: 0, w: 0, h: 0, r: 0, color: '#fff', timer: 0, dur: 0.32, onComplete: null };
// ─── Planet Obstacles (Story Mode) ─────────────────────────────────────────
let planetObstacles    = [];
let planetObstacleTimer = 0;
const planetDebuffs    = { iceslow: 0 };   // seconds remaining per debuff

// ─── Dialogue State ───────────────────────────────────────────────────────────
let dialogueActive       = false;
let dialogueStep         = 0;
let dialogueNextRect     = null;
let currentDialogueLines = [];   // randomly chosen script for the current launch

// ─── Boss Dialogue State ───────────────────────────────────────────────────────
let bossDialogueActive       = false;
let bossDialogueStep         = 0;
let bossDialogueNextRect     = null;
let currentBossDialogueLines = [];   // randomly chosen script for the current boss

// ─── Tutorial State ───────────────────────────────────────────────────────────
let tutorialActive    = false;
let tutorialStep      = 0;
let tutorialContext   = 'progress'; // 'progress' | 'shop'
let tutorialNextRect  = null;
let tutorialPrevRect  = null;
let tutorialCloseRect = null;
const TUTORIAL_SLIDES = [
  {
    icon: '🚀', title: 'STORY MODE',
    color: '#a8f',
    body: [
      'Journey through all 9 planets of the Solar System,',
      'starting from the Sun and working your way out to Neptune.',
      'Defeat each planet\'s boss to unlock the next world.',
    ],
  },
  {
    icon: '🪐', title: 'THE SOLAR MAP',
    color: '#4af',
    body: [
      'Click any unlocked planet to view its details,',
      'then press LAUNCH to begin. Locked planets must',
      'be cleared in order from left to right.',
    ],
  },
  {
    icon: '⚡', title: 'PLANET HAZARDS',
    color: '#f84',
    body: [
      'Every planet spawns a unique hazard — solar flares,',
      'toxic clouds, ice shards, gravity wells, and more.',
      'Stay alert: the environment will try to stop you!',
    ],
  },
  {
    icon: '💀', title: 'BOSS BATTLES',
    color: '#f55',
    body: [
      'Each planet ends with a powerful boss fight.',
      'Destroying the boss grants bonus lives and unlocks',
      'the next planet on the Solar Map.',
    ],
  },
  {
    icon: '💰', title: 'COINS & SHOP',
    color: '#fc0',
    body: [
      'Collect gold coins during gameplay. Visit the Shop',
      'from the main menu to unlock hull shapes, colors,',
      'and engines that improve your stats.',
    ],
  },
];
const SHOP_TUTORIAL_SLIDES = [
  {
    icon: '🏪', title: 'WELCOME TO THE SHOP',
    color: '#8af',
    body: [
      'Spend your SpaceCoins to customize your ship.',
      'Coins are earned by destroying asteroids in-game.',
      'Your coin balance is shown in the top-right corner.',
    ],
  },
  {
    icon: '🎨', title: 'COLORS & HULL SHAPES',
    color: '#f8a',
    body: [
      'Click a color swatch to repaint your ship.',
      'Click a hull shape to change your ship\'s form.',
      'Locked items show their coin cost — buy to unlock.',
    ],
  },
  {
    icon: '📊', title: 'SHIP ATTRIBUTES',
    color: '#4af',
    body: [
      'Each hull has four stats shown in the Attributes panel.',
      'SPD: movement speed  •  RATE: fire rate',
      'DEF: invincibility time after a hit  •  POW: bullet speed',
    ],
  },
  {
    icon: '⚙️', title: 'ENGINES',
    color: '#f84',
    body: [
      'Engines modify your hull\'s base stats.',
      'Green values boost a stat; red values reduce it.',
      'Mix hulls + engines to build your ideal loadout.',
    ],
  },
];
let changelogScrollY       = 0;
let changelogBackRect      = null;
let changelogShowMoreRects = [];
let changelogPopupEntry    = null;
let changelogPopupCloseRect = null;

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

// ─── Story Mode — Solar System ─────────────────────────────────────────────
// 9 bodies: Sun + 8 planets. Difficulty scales from easy (Sun) to brutal (Neptune).
const PLANET_DEFS = [
  { name: 'Sun',     color: '#ff8000', glowColor: '#ff4', size: 56, rings: false,
    desc: 'The blazing heart of the solar system. An easy warm-up.',
    lives: 6, spawnMult: 2.4,  speedMult: 0.50, largeChance: 0.22, medChance: 0.38,
    dialogueSets: [
      [
        { speaker: 'CTRL',  text: 'Earth Control Tower, online. I\'ll be your guide through this mission, Pilot.' },
        { speaker: 'PILOT', text: 'Good to have someone on comms. What am I dealing with?' },
        { speaker: 'CTRL',  text: 'Your objective: neutralize every boss terrorizing the solar system. Starting here at the Sun.' },
        { speaker: 'PILOT', text: 'One at a time. Heading into the Sun\'s orbit now.' },
        { speaker: 'CTRL',  text: 'Be advised — these threats appear coordinated. Something bigger may be pulling the strings.' },
        { speaker: 'PILOT', text: 'Then I\'ll find out what it is. One boss at a time.' },
      ],
      [
        { speaker: 'CTRL',  text: 'Pilot, this is Earth Control. We\'ve been waiting for someone like you.' },
        { speaker: 'PILOT', text: 'Control, I\'m reading you. Brief me.' },
        { speaker: 'CTRL',  text: 'The solar system is under siege. Bosses everywhere. Your job is to end it.' },
        { speaker: 'PILOT', text: 'Understood. Starting with the Sun.' },
        { speaker: 'CTRL',  text: 'One warning — these attacks feel deliberate. Something is orchestrating all of this.' },
        { speaker: 'PILOT', text: 'I\'ll worry about that after I\'ve dealt with the first one.' },
      ],
    ],
    bossDialogueSets: [
      [
        { speaker: 'BOSS',  text: 'You dare approach the heart of the Sun? You will be ash.' },
        { speaker: 'PILOT', text: 'Big words from something I can\'t even see yet.' },
        { speaker: 'BOSS',  text: 'Your ship is nothing. Your courage is nothing. Turn back.' },
        { speaker: 'PILOT', text: 'I don\'t turn back. Let\'s dance.' },
      ],
      [
        { speaker: 'BOSS',  text: 'The Tyrant rules this star. Trespassers are incinerated.' },
        { speaker: 'PILOT', text: 'Good thing I run hot.' },
        { speaker: 'BOSS',  text: 'I have burned greater pilots than you.' },
        { speaker: 'PILOT', text: 'Name one.' },
      ],
    ],
  },
  { name: 'Mercury', color: '#a0a0a0', glowColor: null,   size: 11, rings: false,
    desc: 'Cratered and airless. A gentle step up.',
    lives: 6, spawnMult: 2.1,  speedMult: 0.60, largeChance: 0.28, medChance: 0.38,
    dialogueSets: [
      [
        { speaker: 'CTRL',  text: 'Heads up — surface temperature out there will cook unshielded tech.' },
        { speaker: 'PILOT', text: 'Already accounting for it. What else?' },
        { speaker: 'CTRL',  text: 'Crater fields make asteroid density unpredictable. Stay mobile.' },
        { speaker: 'PILOT', text: 'Staying mobile is what I do.' },
        { speaker: 'PILOT', text: 'Any intel on what\'s running the operation out here?' },
        { speaker: 'CTRL',  text: 'Not much. Just that it\'s bad. Good luck out there.' },
      ],
      [
        { speaker: 'PILOT', text: 'Control, approaching Mercury. This place is not exactly welcoming.' },
        { speaker: 'CTRL',  text: 'Never is. Radiation storms incoming — your shields will hold, barely.' },
        { speaker: 'PILOT', text: 'Barely is fine.' },
        { speaker: 'CTRL',  text: 'The asteroids here are fast and dense. Trust your reflexes.' },
        { speaker: 'PILOT', text: 'That\'s all I\'ve got out here.' },
        { speaker: 'CTRL',  text: 'Then you\'re better equipped than anyone. Make it count.' },
      ],
    ],
    bossDialogueSets: [
      [
        { speaker: 'BOSS',  text: 'Another pilot chasing ghosts. Mercury will be your graveyard.' },
        { speaker: 'PILOT', text: 'It hasn\'t been anyone\'s graveyard yet.' },
        { speaker: 'BOSS',  text: 'You will be the first. The Iron Revenant does not lose.' },
        { speaker: 'PILOT', text: 'First time for everything.' },
      ],
      [
        { speaker: 'BOSS',  text: 'I have stood on this wasteland since before you were born. Leave.' },
        { speaker: 'PILOT', text: 'I\'ve got orders. And they say you have to go.' },
        { speaker: 'BOSS',  text: 'Orders mean nothing out here. Only iron.' },
        { speaker: 'PILOT', text: 'Then I\'ll just have to bend it.' },
      ],
    ],
  },
  { name: 'Venus',   color: '#e8c87a', glowColor: null,   size: 19, rings: false,
    desc: 'Toxic clouds, but nothing too dangerous yet.',
    lives: 5, spawnMult: 1.85, speedMult: 0.68, largeChance: 0.34, medChance: 0.36,
    dialogueSets: [
      [
        { speaker: 'CTRL',  text: 'Venus is a nightmare under those clouds. Keep your velocity up.' },
        { speaker: 'PILOT', text: 'Understood. Flying by the numbers.' },
        { speaker: 'CTRL',  text: 'Toxic pockets in the upper atmosphere will mess with your readings.' },
        { speaker: 'PILOT', text: 'I trust my instruments over my eyes anyway.' },
        { speaker: 'PILOT', text: 'This place feels hostile even before the shooting starts.' },
        { speaker: 'CTRL',  text: 'Welcome to Venus. Try not to breathe.' },
      ],
      [
        { speaker: 'PILOT', text: 'Venus on approach. Visibility near zero — using sensors only.' },
        { speaker: 'CTRL',  text: 'Good. The clouds will hide threats until they\'re close. React fast.' },
        { speaker: 'PILOT', text: 'Fast is relative in a soup this thick.' },
        { speaker: 'CTRL',  text: 'Just keep moving. The worst thing you can do out here is stop.' },
        { speaker: 'CTRL',  text: 'There\'s something big lurking in those upper cloud layers.' },
        { speaker: 'PILOT', text: 'I\'ll flush it out. One way or another.' },
      ],
    ],
    bossDialogueSets: [
      [
        { speaker: 'BOSS',  text: 'You cannot see me in these clouds. You cannot find me.' },
        { speaker: 'PILOT', text: 'I don\'t need to see you. I just need to hit you.' },
        { speaker: 'BOSS',  text: 'Brave. You will burn like all the others.' },
        { speaker: 'PILOT', text: 'I\'ve heard that before. Still here.' },
      ],
      [
        { speaker: 'BOSS',  text: 'The clouds are my armor. You will suffocate before you find me.' },
        { speaker: 'PILOT', text: 'Then I\'ll work fast.' },
        { speaker: 'BOSS',  text: 'Nothing fast survives Venus.' },
        { speaker: 'PILOT', text: 'Watch me.' },
      ],
    ],
  },
  { name: 'Earth',   color: '#4af',    glowColor: null,   size: 21, rings: false,
    desc: 'Home. Keep it safe — things are heating up.',
    lives: 5, spawnMult: 1.65, speedMult: 0.76, largeChance: 0.40, medChance: 0.34,
    dialogueSets: [
      [
        { speaker: 'CTRL',  text: 'We\'re defending our own backyard now. Don\'t let anything through.' },
        { speaker: 'PILOT', text: 'Nothing\'s getting past me. Not here.' },
        { speaker: 'CTRL',  text: 'Civilian orbital platforms are active. Collateral damage is not acceptable.' },
        { speaker: 'PILOT', text: 'Surgical. I know.' },
        { speaker: 'PILOT', text: 'Something targeting Earth is looking for a fight.' },
        { speaker: 'CTRL',  text: 'Then give it one. Earth\'s counting on you.' },
      ],
      [
        { speaker: 'PILOT', text: 'Home. Didn\'t expect my first look at Earth from this angle to be through a combat visor.' },
        { speaker: 'CTRL',  text: 'Whatever is out there came here to send a message.' },
        { speaker: 'PILOT', text: 'It\'ll get one. Just not the one it\'s expecting.' },
        { speaker: 'CTRL',  text: 'Orbital debris fields are active and shifting. Stay sharp.' },
        { speaker: 'PILOT', text: 'Move fast, clean shots. Platforms stay intact.' },
        { speaker: 'CTRL',  text: 'We trust you. Don\'t make us regret it.' },
      ],
    ],
    bossDialogueSets: [
      [
        { speaker: 'BOSS',  text: 'Earth was unprotected. It was easy. You... are not.' },
        { speaker: 'PILOT', text: 'Good observation. Let\'s keep going.' },
        { speaker: 'BOSS',  text: 'I am a fortress. You are one ship. The math is simple.' },
        { speaker: 'PILOT', text: 'I\'ve never been good at math.' },
      ],
      [
        { speaker: 'BOSS',  text: 'This planet is already mine. You are just the last obstacle.' },
        { speaker: 'PILOT', text: 'I\'m the only obstacle that matters.' },
        { speaker: 'BOSS',  text: 'Bold claim. Prove it, pilot.' },
        { speaker: 'PILOT', text: 'That\'s exactly what I\'m about to do.' },
      ],
    ],
  },
  { name: 'Mars',    color: '#c1440e', glowColor: null,   size: 16, rings: false,
    desc: 'The red planet pushes back. Stay focused.',
    lives: 4, spawnMult: 1.45, speedMult: 0.84, largeChance: 0.46, medChance: 0.32,
    dialogueSets: [
      [
        { speaker: 'CTRL',  text: 'Colony\'s been dark for six hours. Something\'s jamming their signal.' },
        { speaker: 'PILOT', text: 'I\'ll find out what. Approaching the red planet now.' },
        { speaker: 'CTRL',  text: 'Dust storms are active — your radar will be spotty.' },
        { speaker: 'PILOT', text: 'I don\'t need radar. I need targets.' },
        { speaker: 'CTRL',  text: 'Careful. Whatever got here before you has dug in.' },
        { speaker: 'PILOT', text: 'Then I\'ll dig it out.' },
      ],
      [
        { speaker: 'PILOT', text: 'Mars looks quiet from here. Too quiet.' },
        { speaker: 'CTRL',  text: 'It\'s not. We\'ve lost three patrols in the last cycle. Watch yourself.' },
        { speaker: 'PILOT', text: 'Understood. What\'s the surface situation?' },
        { speaker: 'CTRL',  text: 'Asteroid debris everywhere — dust storms moving it unpredictably.' },
        { speaker: 'PILOT', text: 'Controlled chaos. I can work with that.' },
        { speaker: 'CTRL',  text: 'The colony needs you to. No pressure.' },
      ],
    ],
    bossDialogueSets: [
      [
        { speaker: 'BOSS',  text: 'You\'ve come to Mars looking for war. You found the Warlord.' },
        { speaker: 'PILOT', text: 'Perfect. Saves me the trouble of looking.' },
        { speaker: 'BOSS',  text: 'You\'re going to regret coming here alone.' },
        { speaker: 'PILOT', text: 'I\'m not alone. I\'ve got guns.' },
      ],
      [
        { speaker: 'BOSS',  text: 'Every pilot who challenged me is now part of this dust.' },
        { speaker: 'PILOT', text: 'I\'m not much for sightseeing. Let\'s get this done.' },
        { speaker: 'BOSS',  text: 'Mars runs red for a reason. Your ship will add to the color.' },
        { speaker: 'PILOT', text: 'Poetic. Too bad you won\'t be around to see it.' },
      ],
    ],
  },
  { name: 'Jupiter', color: '#c8883a', glowColor: null,   size: 36, rings: false,
    desc: 'Massive gravity drags more rocks your way.',
    lives: 4, spawnMult: 1.28, speedMult: 0.90, largeChance: 0.50, medChance: 0.30,
    dialogueSets: [
      [
        { speaker: 'CTRL',  text: 'Jupiter\'s magnetosphere is playing havoc with long-range comms. Stay in range.' },
        { speaker: 'PILOT', text: 'Copy. Keeping this channel open.' },
        { speaker: 'CTRL',  text: 'Gravity wells near the cloud bands will pull debris toward you faster than expected.' },
        { speaker: 'PILOT', text: 'Gravity\'s just another weapon if you use it right.' },
        { speaker: 'CTRL',  text: 'Something\'s been circling the Great Red Spot for days. No one\'s gone in to check.' },
        { speaker: 'PILOT', text: 'I\'ll check.' },
      ],
      [
        { speaker: 'PILOT', text: 'Jupiter looks alive from here. I can see the storm bands rotating.' },
        { speaker: 'CTRL',  text: 'Don\'t let the view distract you. That system is extremely hostile.' },
        { speaker: 'PILOT', text: 'I\'m focused. What am I flying into?' },
        { speaker: 'CTRL',  text: 'A mess. Magnetic interference, dense fields, and something evading our sensors.' },
        { speaker: 'PILOT', text: 'Evading ends today.' },
        { speaker: 'CTRL',  text: 'That\'s what we like to hear. Stay sharp.' },
      ],
    ],
    bossDialogueSets: [
      [
        { speaker: 'BOSS',  text: 'The storm has raged here longer than your civilization has existed.' },
        { speaker: 'PILOT', text: 'And yet here I am. Right in the eye of it.' },
        { speaker: 'BOSS',  text: 'You are nothing before the Colossus.' },
        { speaker: 'PILOT', text: 'Funny. You look like a target to me.' },
      ],
      [
        { speaker: 'BOSS',  text: 'Jupiter\'s fury is mine to command. You fly into your own destruction.' },
        { speaker: 'PILOT', text: 'The gravity\'s pulling me in anyway. Might as well fight.' },
        { speaker: 'BOSS',  text: 'You are too small to understand what you face.' },
        { speaker: 'PILOT', text: 'Small things hit hard when aimed right.' },
      ],
    ],
  },
  { name: 'Saturn',  color: '#e4d191', glowColor: null,   size: 28, rings: true,
    desc: 'Ring debris in your path. Keep moving.',
    lives: 4, spawnMult: 1.12, speedMult: 0.96, largeChance: 0.54, medChance: 0.28,
    dialogueSets: [
      [
        { speaker: 'CTRL',  text: 'The ring plane is more dangerous than it looks. Shards move at orbital speed.' },
        { speaker: 'PILOT', text: 'I\'ll treat every piece like a bullet.' },
        { speaker: 'PILOT', text: 'Something\'s been using the rings as cover, hasn\'t it.' },
        { speaker: 'CTRL',  text: 'We think so. It knows the terrain better than we do.' },
        { speaker: 'CTRL',  text: 'Fly unpredictably. Don\'t give it a pattern to track.' },
        { speaker: 'PILOT', text: 'Unpredictable is my default setting.' },
      ],
      [
        { speaker: 'PILOT', text: 'Saturn is beautiful. Shame about the job.' },
        { speaker: 'CTRL',  text: 'The rings are a minefield. Watch your angles.' },
        { speaker: 'CTRL',  text: 'We\'ve had ships go silent in there. None came back to say why.' },
        { speaker: 'PILOT', text: 'They didn\'t have me.' },
        { speaker: 'PILOT', text: 'I\'ll cut through and draw it into open space. My advantage.' },
        { speaker: 'CTRL',  text: 'Solid plan. Execute.' },
      ],
    ],
    bossDialogueSets: [
      [
        { speaker: 'BOSS',  text: 'These rings are my domain. You have no advantage here.' },
        { speaker: 'PILOT', text: 'You\'ve been hiding long enough. Time to come out.' },
        { speaker: 'BOSS',  text: 'I do not hide. I wait. And you have walked into my trap.' },
        { speaker: 'PILOT', text: 'Every ring has a crack in it.' },
      ],
      [
        { speaker: 'BOSS',  text: 'The Dominion has ruled these rings for centuries. Your intrusion is noted.' },
        { speaker: 'PILOT', text: 'So is your threat level. Medium at best.' },
        { speaker: 'BOSS',  text: 'You speak carelessly for someone surrounded by shards.' },
        { speaker: 'PILOT', text: 'I\'ll watch the rocks. You watch for my shots.' },
      ],
    ],
  },
  { name: 'Uranus',  color: '#7de8e8', glowColor: null,   size: 23, rings: false,
    desc: 'An ice giant with a mean streak. Nearly there.',
    lives: 3, spawnMult: 1.00, speedMult: 1.02, largeChance: 0.57, medChance: 0.26,
    dialogueSets: [
      [
        { speaker: 'CTRL',  text: 'This far out, we\'re running on the edge of our support range.' },
        { speaker: 'PILOT', text: 'Understood. I\'ll handle whatever I find.' },
        { speaker: 'CTRL',  text: 'Ice storm systems are dense out here. Visibility drops fast.' },
        { speaker: 'PILOT', text: 'I\'ve flown in worse.' },
        { speaker: 'CTRL',  text: 'Whatever\'s out here doesn\'t want to be followed.' },
        { speaker: 'PILOT', text: 'Tough. I\'m persistent.' },
      ],
      [
        { speaker: 'PILOT', text: 'Uranus. Funny name for such a cold, serious place.' },
        { speaker: 'CTRL',  text: 'Gets colder. Save the chatter — you\'ll need the focus.' },
        { speaker: 'PILOT', text: 'Fair enough. What do we know about the threat here?' },
        { speaker: 'CTRL',  text: 'Not much. It went dark after the last recon sweep. Assume hostile.' },
        { speaker: 'CTRL',  text: 'One more after this and it\'s over. Hold it together.' },
        { speaker: 'PILOT', text: 'I haven\'t come this far to stop now.' },
      ],
    ],
    bossDialogueSets: [
      [
        { speaker: 'BOSS',  text: 'Ice and silence — that is all that waits for you beyond this point.' },
        { speaker: 'PILOT', text: 'Not all. There\'s you.' },
        { speaker: 'BOSS',  text: 'The Monarch has frozen better pilots solid. You are no different.' },
        { speaker: 'PILOT', text: 'I don\'t freeze. I adapt.' },
      ],
      [
        { speaker: 'BOSS',  text: 'Turn back, pilot. Neptune is not worth your life.' },
        { speaker: 'PILOT', text: 'I disagree. Keep moving.' },
        { speaker: 'BOSS',  text: 'Then you are a fool. A determined one, I\'ll grant you that.' },
        { speaker: 'PILOT', text: 'Determination\'s free. And I\'m well stocked.' },
      ],
    ],
  },
  { name: 'Neptune', color: '#5060e0', glowColor: null,   size: 22, rings: false,
    desc: 'The edge of the solar system. A worthy finale.',
    lives: 3, spawnMult: 0.90, speedMult: 1.08, largeChance: 0.60, medChance: 0.25,
    dialogueSets: [
      [
        { speaker: 'CTRL',  text: 'Pilot... Neptune. The end of the line.' },
        { speaker: 'PILOT', text: 'Feels further than I thought.' },
        { speaker: 'CTRL',  text: 'No backup out here. No second chances. You know what\'s at stake.' },
        { speaker: 'PILOT', text: 'I\'ve known since the Sun.' },
        { speaker: 'CTRL',  text: 'Whatever was pulling the strings... we think it ends here.' },
        { speaker: 'PILOT', text: 'Then let\'s end it. For good.' },
      ],
      [
        { speaker: 'PILOT', text: 'Edge of the solar system. I can almost see the dark.' },
        { speaker: 'CTRL',  text: 'Don\'t look too long. You\'ve got one more fight in front of you.' },
        { speaker: 'CTRL',  text: 'If you can finish this, the solar system is safe. That\'s not nothing.' },
        { speaker: 'PILOT', text: 'It\'s everything.' },
        { speaker: 'PILOT', text: 'I\'m going in. Whatever\'s waiting — it\'s mine.' },
        { speaker: 'CTRL',  text: 'We\'ll be cheering from here. All of us. Good luck.' },
      ],
    ],
    bossDialogueSets: [
      [
        { speaker: 'BOSS',  text: 'You reached the end. Impressive. Pointless, but impressive.' },
        { speaker: 'PILOT', text: 'Nothing\'s pointless if it works. And this is going to work.' },
        { speaker: 'BOSS',  text: 'Behind me is nothing. In front of me — nothing survives.' },
        { speaker: 'PILOT', text: 'Not true. I will.' },
      ],
      [
        { speaker: 'BOSS',  text: 'The system sends one pilot to face me. How flattering.' },
        { speaker: 'PILOT', text: 'One was all it took for the others. You\'re no different.' },
        { speaker: 'BOSS',  text: 'I am nothing like the others. I am the storm that swallows stars.' },
        { speaker: 'PILOT', text: 'Every storm ends. Starting yours now.' },
      ],
    ],
  },
];

let progressUnlocked = 0;   // index of furthest unlocked planet (0 = Sun only)

// ─── Changelog ────────────────────────────────────────────────────────────────
// NOTE: Add NEW entries at the END of this array. renderChangelog() reverses it
//       so the last entry appears at the top (newest first).
const CHANGELOG = [
  { v: 'v1.1.0',  date: '1:58 PM, 21 Feb 2026', title: 'Initial Release',           desc: 'Space shooter with asteroids, bullets, lives, score, and parallax star background.' },
  { v: 'v1.2.0',  date: '1:58 PM, 21 Feb 2026', title: 'Fullscreen',                desc: 'Game now fills the entire browser window and dynamically adapts to resize.' },
  { v: 'v1.3.0',  date: '1:58 PM, 21 Feb 2026', title: 'Pause Menu',                desc: 'Press ESC to pause with options to resume, restart, or return to the main menu.' },
  { v: 'v1.4.0',  date: '1:58 PM, 21 Feb 2026', title: 'Sound Effects',             desc: 'Added Web Audio API sounds for asteroid explosions, shooting, and player hit.' },
  { v: 'v1.5.0',  date: '1:58 PM, 21 Feb 2026', title: 'Louder Explosions',         desc: 'Asteroid explosion volume increased for better feedback.' },
  { v: 'v1.6.0',  date: '1:58 PM, 21 Feb 2026', title: 'Doubled Explosion Volume',  desc: 'Explosion sounds doubled in volume again for extra impact.' },
  { v: 'v1.7.0',  date: '1:58 PM, 21 Feb 2026', title: 'Main Menu from Pause',      desc: 'Added a Main Menu option to the pause screen.' },
  { v: 'v1.8.0',  date: '1:58 PM, 21 Feb 2026', title: 'Difficulty Modes',          desc: 'Easy, Medium, and Hard modes selectable before each game.' },
  { v: 'v1.9.0',  date: '1:58 PM, 21 Feb 2026', title: 'Difficulty Tuning',         desc: 'Medium has bigger and more frequent asteroids. Hard has constant fast barrages.' },
  { v: 'v1.10.0', date: '1:58 PM, 21 Feb 2026', title: 'Button Text Fix',           desc: 'Fixed text alignment inside Medium and Hard difficulty buttons.' },
  { v: 'v1.11.0', date: '1:58 PM, 21 Feb 2026', title: 'Difficulty Descriptions',   desc: 'Difficulty buttons now show specific stats: speed, lives, and spawn rate.' },
  { v: 'v1.12.0', date: '1:58 PM, 21 Feb 2026', title: 'Power-Up System',           desc: '6 power-up types (Rapid Fire, Triple Shot, Speed Boost, Shield, Bomb, Extra Life) spawn in pairs. Active effects shown in a bottom-left bar.' },
  { v: 'v1.13.0', date: '1:58 PM, 21 Feb 2026', title: 'Removed Notification Banner', desc: 'Removed the flashing "Power-Up Available" banner from the top of the screen.' },
  { v: 'v1.14.0', date: '1:58 PM, 21 Feb 2026', title: 'Power-Up Bar Colors',       desc: 'Each power-up pill uses its own color with a matching dark background.' },
  { v: 'v1.15.0', date: '1:58 PM, 21 Feb 2026', title: 'Instant Power-Ups',         desc: 'Power-ups apply immediately on touch. Timed ones fade out when they expire.' },
  { v: 'v1.16.0', date: '1:58 PM, 21 Feb 2026', title: 'How to Play Screen',        desc: 'New screen accessible from the main menu showing all controls and power-up info.' },
  { v: 'v1.17.0', date: '1:58 PM, 21 Feb 2026', title: 'Duration Brackets',         desc: 'Power-up durations shown in brackets at the end of each description.' },
  { v: 'v1.18.0', date: '1:58 PM, 21 Feb 2026', title: 'Random Power-Up Spawns',    desc: 'Power-ups now spawn at random time intervals instead of every 1000 points.' },
  { v: 'v1.19.0', date: '1:58 PM, 21 Feb 2026', title: 'Button Overflow Fix',       desc: 'Fixed text overflowing outside difficulty button borders on Medium and Hard.' },
  { v: 'v1.20.0', date: '1:58 PM, 21 Feb 2026', title: 'Power-Up Interval',         desc: 'Power-up spawn interval set to 15–30 seconds.' },
  { v: 'v1.21.0', date: '1:58 PM, 21 Feb 2026', title: 'Main Menu Buttons',         desc: 'Added styled PLAY and HOW TO PLAY buttons to the main menu.' },
  { v: 'v1.22.0', date: '1:58 PM, 21 Feb 2026', title: 'Blue Button Styling',       desc: 'Main menu buttons redesigned with blue border and dark blue background.' },
  { v: 'v1.23.0', date: '1:58 PM, 21 Feb 2026', title: 'Back Button',               desc: 'Added a clickable ← Back button to the How to Play screen.' },
  { v: 'v1.24.0', date: '1:58 PM, 21 Feb 2026', title: 'Back Button Spacing',       desc: 'Fixed Back button overlapping the instructions text in How to Play.' },
  { v: 'v1.25.0', date: '1:58 PM, 21 Feb 2026', title: 'Game Over Buttons',         desc: 'Added Play Again and Main Menu buttons to the Game Over screen.' },
  { v: 'v1.26.0', date: '1:58 PM, 21 Feb 2026', title: 'Difficulty Selection Fix',  desc: 'Fixed a bug where difficulty selection was skipped after returning from pause.' },
  { v: 'v1.27.0', date: '1:58 PM, 21 Feb 2026', title: 'Version Number',            desc: 'Added version number display to the bottom-right corner of the main menu.' },
  { v: 'v1.28.0', date: '1:58 PM, 21 Feb 2026', title: 'Changelog',                 desc: 'Added Changelog screen with a scrollable list of every improvement made to the game.' },
  { v: 'v1.29.0', date: '1:58 PM, 21 Feb 2026', title: 'Changelog Newest First',    desc: 'Changelog now displays the most recent version at the top.' },
  { v: 'v1.30.0', date: '1:58 PM, 21 Feb 2026', title: 'Power-Up Bar Overlap Fix',  desc: 'Fixed the countdown timer overlapping the power-up label. Label and timer are now stacked on separate lines.' },
  { v: 'v1.31.0', date: '1:58 PM, 21 Feb 2026', title: 'Boss Fight',                desc: 'At 10,000 points a boss spawns with a health bar, AI movement, bullet attacks, and charge attacks. Difficulty scales the boss stats and name: Easy = Spaceship Eater 450, Medium = Galaxy Warden, Hard = Omega Devourer.' },
  { v: 'v1.32.0', date: '5:26 PM, 21 Feb 2026', title: 'Boss Defeat Crash Fix',    desc: 'Fixed a crash where defeating the boss caused the game to freeze. A null reference in the bullet loop was stopping the game loop.' },
  { v: 'v1.33.0', date: '5:26 PM, 21 Feb 2026', title: 'Button-Only Navigation',   desc: 'Removed SPACE key shortcut from Game Over and Level Complete screens. Buttons must now be clicked to continue.' },
  { v: 'v1.34.0', date: '5:51 PM, 21 Feb 2026', title: 'How to Play Text Color',   desc: 'Improved visibility of the objective blurb text at the bottom of the How to Play screen.' },
  { v: 'v1.35.0', date: '5:51 PM, 21 Feb 2026', title: 'Save System',              desc: 'Game auto-saves when a level is completed. PLAY now shows New Game and Load Game options. Load Game resumes from the highest completed level with your saved score and lives.' },
  { v: 'v1.36.0', date: '5:51 PM, 21 Feb 2026', title: 'Delete Save Button',       desc: 'Added a red trash can button beside Load Game that deletes the saved game. Only visible when a save exists.' },
  { v: 'v1.37.0', date: '5:51 PM, 21 Feb 2026', title: 'Delete Save Confirmation', desc: 'Clicking the trash button now shows a confirmation popup before erasing the save file.' },
  { v: 'v1.38.0', date: '5:51 PM, 21 Feb 2026', title: 'Pause Menu Buttons',       desc: 'Replaced pause menu keyboard hints with clickable Resume, Restart, and Main Menu buttons.' },
  { v: 'v1.39.0', date: '5:51 PM, 21 Feb 2026', title: 'Pause Button Colors',      desc: 'Pause menu buttons are now green (Resume), red (Restart), and blue (Main Menu).' },
  { v: 'v1.40.0', date: '5:54 PM, 21 Feb 2026', title: 'Changelog NEW Badge',      desc: 'The newest entry in the changelog now shows a green NEW badge next to its title.' },
  { v: 'v1.41.0', date: '6:21 PM, 21 Feb 2026', title: 'Title Renamed',            desc: 'Main menu title changed from "ASTEROID BLASTER" to "AstroShooter".' },
  { v: 'v1.42.0', date: '10:41 AM, 22 Feb 2026', title: 'Play Options Renamed',    desc: 'Play mode screen title changed from "HOW DO YOU WANT TO PLAY?" to "Play Options".' },
  { v: 'v1.43.0', date: '10:41 AM, 22 Feb 2026', title: 'Clickable Version Number', desc: 'The version number in the bottom-right of the main menu is now clickable and opens the changelog. The standalone Changelog button has been removed.' },
  { v: 'v1.44.0', date: '10:41 AM, 22 Feb 2026', title: 'Easy Mode Boss Names',    desc: 'Each level in easy mode now has a unique boss name: Iron Fang, Void King, Night Hammer, Black Nova, Space Tyrant, War Pulse, Rift Lord, Dark Core.' },
  { v: 'v1.45.0', date: '10:41 AM, 22 Feb 2026', title: 'Boss AI Scaling',         desc: 'Bosses now scale with level: more HP, faster movement, quicker charges, and predictive aiming. Bullet count stays fixed. Fixed a crash caused by the boss warning banner referencing an undefined name for easy mode.' },
  { v: 'v1.46.0', date: '10:41 AM, 22 Feb 2026', title: 'Boss Visual Variants',    desc: 'Easy mode bosses now each have a unique color, hull shape (arrowhead, fang, cruiser, hammer, or star), and cannon count (1–3 barrels) that varies per level. Medium and hard keep their existing single design.' },
  { v: 'v1.47.0', date: '10:41 AM, 22 Feb 2026', title: 'Unique Boss Designs',     desc: 'Medium (Galaxy Warden) now uses the Heavy Cruiser hull with 2 cannons. Hard (Omega Devourer) uses the Star hull with 3 cannons. Every boss across all difficulties now has a completely unique shape and cannon configuration.' },
  { v: 'v1.48.0', date: '10:41 AM, 22 Feb 2026', title: 'Medium Boss Names',       desc: 'Each level in medium mode now has a unique boss name: Starcrusher, Voidstorm, Ironclad, Nightfall, Warbringer, Skybreaker, Darkstar, Dreadcore, Stormlord.' },
  { v: 'v1.49.0', date: '10:41 AM, 22 Feb 2026', title: 'Medium Boss Visuals',     desc: 'Every medium boss now has a unique color, hull shape, and cannon count. No two bosses in medium mode share the same design.' },
  { v: 'v1.50.0', date: '2:18 PM, 22 Feb 2026',  title: 'Play Options Back Button', desc: 'Play Options screen now has a clickable Back button in addition to the ESC shortcut.' },
  { v: 'v1.51.0', date: '2:18 PM, 22 Feb 2026',  title: 'Back Button Arrow',        desc: 'The Back button on the Play Options screen now shows a ← arrow.' },
  { v: 'v1.52.0', date: '6:18 PM, 22 Feb 2026',  title: 'Ship Customization',       desc: 'New Customize screen from the main menu. Choose from 8 hull colors and 4 ship shapes (Arrowhead, Wedge, Dart, Cruiser). Your choice is saved between sessions.' },
  { v: 'v1.53.0', date: '6:18 PM, 22 Feb 2026',  title: 'SpaceCoins & Unlocks',    desc: 'Coins spawn on the map during gameplay — fly over them to collect. Spend SpaceCoins to unlock 19 hull shapes and 7 colors in the Customize screen. Higher difficulty spawns more coins per batch.' },
  { v: 'v1.53.1', date: '6:18 PM, 22 Feb 2026',  title: 'Customize Renamed to Shop', desc: 'The Customize button and screen have been renamed to Shop.' },
  { v: 'v1.54.0', date: '6:18 PM, 22 Feb 2026',  title: 'Hull Attributes & Engines', desc: 'Every hull now has Speed, Fire Rate, Defense, and Bullet Power ratings shown as stat bars in the Shop. Buy one of 6 engines (Standard through Quantum) to boost or trade off stats. Combined hull + engine values scale real gameplay: movement speed, fire rate, invincibility time, and bullet speed.' },
  { v: 'v1.54.1', date: '4:41 PM, 23 Feb 2026',  title: 'Shop Two-Column Layout',   desc: 'Shop screen reorganised into two columns: attributes on the left alongside ship preview and colour swatches, hull grid and engine grid on the right.' },
  { v: 'v1.54.2', date: '4:41 PM, 23 Feb 2026',  title: 'Price Reductions',         desc: 'All shop items are cheaper: hull colors reduced by ~20%, hull shapes now scale from 20 to 400 coins, and engines range from 40 to 200 coins.' },
  { v: 'v1.54.3', date: '4:41 PM, 23 Feb 2026',  title: 'Flat Color Pricing',       desc: 'All unlockable colors now cost a flat 40 coins each.' },
  { v: 'v1.54.4', date: '4:41 PM, 23 Feb 2026',  title: 'Coin HUD & Visual Polish', desc: 'In-game coins now match the shop icon style (solid gold with dark inner circle). SpaceCoins balance shown in the bottom-right corner during gameplay.' },
  { v: 'v1.54.5', date: '7:48 PM, 23 Feb 2026',  title: 'Coin Spawn Tuning',        desc: 'Coins now spawn in batches of 2–4 every 10–15 seconds regardless of difficulty.' },
  { v: 'v1.55.0', date: '7:48 PM, 23 Feb 2026',  title: 'Story Mode',            desc: 'New Story Mode: fight through the solar system from Sun to Neptune. Each of the 9 planets has a fixed, escalating difficulty. Planets unlock sequentially — beat one to reveal the next. Click any unlocked planet on the solar map to read its description and launch. Progress is saved between sessions.' },
  { v: 'v1.55.1', date: '7:48 PM, 23 Feb 2026',  title: 'Planet Difficulty Tuning', desc: 'Outer planets (Jupiter through Neptune) are now significantly less punishing. Neptune now sits between Medium and Hard difficulty rather than beyond Hard.' },
  { v: 'v1.55.2', date: '7:48 PM, 23 Feb 2026',  title: 'Play Mode Bug Fixes',      desc: 'Fixed Story Mode being unclickable (SOLAR_MAP state was falling through into game update logic). Fixed load/delete chip overlapping the Endless Mode sub-text.' },
  { v: 'v1.55.3', date: '7:48 PM, 23 Feb 2026',  title: 'Button Overlap Fix',       desc: 'Fixed the delete/load buttons triggering the Endless Mode button simultaneously. Smaller buttons now take priority and clicks stop at the first match.' },
  { v: 'v1.55.4', date: '7:48 PM, 23 Feb 2026',  title: 'Solar Map Margin Fix',     desc: 'Increased horizontal margins on the solar system map so Sun and Neptune labels no longer clip near the screen edges.' },
  { v: 'v1.56.0', date: '7:48 PM, 23 Feb 2026',  title: 'Touchscreen Support',      desc: 'Full touchscreen support added. Tap any button or menu to navigate. During gameplay a floating virtual joystick (bottom-left) controls movement and a large FIRE button (bottom-right) fires continuously while held. Swipe up/down in the Shop and Changelog. A PAUSE button appears top-right during play. Keyboard and mouse controls are unchanged.' },
  { v: 'v1.56.1', date: '7:00 PM, 24 Feb 2026',  title: 'Remove Endless Saves',    desc: 'Endless Mode no longer saves progress between sessions. Each run starts fresh. Story Mode continues to save planet unlocks as before.' },
  { v: 'v1.56.2', date: '7:00 PM, 24 Feb 2026',  title: 'Story Mode Boss Fix',   desc: 'Fixed a crash where the boss would freeze the game in Story Mode. The boss now correctly draws from easy/medium/hard templates based on planet index (Sun–Venus = easy, Earth–Jupiter = medium, Saturn–Neptune = hard).' },
  { v: 'v1.57.0', date: '8:14 PM, 26 Feb 2026',  title: 'Planet Bosses',            desc: 'Each planet in Story Mode now has a unique boss: Solar Tyrant (Sun), Iron Revenant (Mercury), Veiled Inferno (Venus), Living Bastion (Earth), Red Warlord (Mars), Storm Colossus (Jupiter), Ringed Dominion (Saturn), Ice Monarch (Uranus), Deep Tempest (Neptune). Every boss has a distinct hull shape, color, and stats tuned to its planet.' },
  { v: 'v1.57.1', date: '8:14 PM, 26 Feb 2026',  title: 'Changelog Show More',      desc: 'Long changelog descriptions are now capped at two lines. A small "▾ more" button appears at the end of truncated entries — tap or click it to open a popup showing the full text.' },
  { v: 'v1.57.2', date: '8:14 PM, 26 Feb 2026',  title: 'Play Options Animation',   desc: 'Clicking Endless Mode or Story Mode in the Play Options screen now triggers a brief animated ripple and glow effect on the selected button before transitioning.' },
  { v: 'v1.57.3', date: '8:14 PM, 26 Feb 2026',  title: 'Launch Warp Animation',    desc: 'Clicking Launch on the Solar Map now plays a short warp animation — star streaks accelerate across the screen and the display flashes white before the level begins.' },
  { v: 'v1.57.4', date: '8:14 PM, 26 Feb 2026',  title: 'Difficulty Click Animation', desc: 'Selecting a difficulty in Endless Mode now triggers an animated glow, fill flash, and expanding ripple on the chosen button before the game starts. Works for both mouse clicks and keyboard (1/2/3).' },
  { v: 'v1.57.5', date: '8:14 PM, 26 Feb 2026',  title: 'Universal Button Animations', desc: 'Every clickable button in the game now plays a ripple, glow, and fill-flash animation when pressed — covering the menu, shop, pause screen, game over, level complete, controls, changelog, solar map, play options, and difficulty screens.' },
  { v: 'v1.57.6', date: '8:14 PM, 26 Feb 2026',  title: 'Planet Name on Level Complete', desc: 'In Story Mode the level complete banner now shows the planet name (e.g. "MARS COMPLETE!") instead of a generic level number.' },
  { v: 'v1.57.7', date: '8:14 PM, 26 Feb 2026',  title: 'Solar Map Visual Overhaul',    desc: 'The Solar System map is now much more detailed. The Sun is larger with an animated pulsing corona. Each planet has a radial gradient fill, atmospheric glow, and unique surface features: Earth shows continents and a polar cap, Jupiter has bands and a Great Red Spot, Mars has a polar cap and craters, Saturn has dual rings, and more. A solar nebula glow and orbit tick marks complete the look.' },
  { v: 'v1.57.8', date: '8:14 PM, 26 Feb 2026',  title: 'Solar System Difficulty Tuned', desc: 'Story Mode difficulty re-balanced. The Solar System is now designed as Galaxy 1 of 5 — an approachable introduction. All planets give more lives, rocks are slower and sparser, and bosses have lower HP and slower bullets. Neptune now tops out around medium difficulty, leaving plenty of room for future galaxies.' },
  { v: 'v1.58.0', date: '8:14 PM, 26 Feb 2026',  title: 'Planet Obstacles',             desc: 'Each planet in Story Mode now spawns a unique themed hazard. Sun: solar flare beams. Mercury: radiation zones (1 heart/6s). Venus: toxic clouds (1 heart/5s). Earth: satellite debris. Mars: dust devils that push you. Jupiter: gravity wells that pull you. Saturn: ring shards. Uranus: ice shards that slow you to half speed for 5s. Neptune: wind gusts that push you sideways.' },
  { v: 'v1.58.1', date: '8:14 PM, 26 Feb 2026',  title: 'How to Play Expanded',         desc: 'The How to Play screen now includes descriptions of Endless Mode, Story Mode, and the Coins & Shop system alongside the existing controls and power-up reference.' },
  { v: 'v1.58.2', date: '8:14 PM, 26 Feb 2026',  title: 'How to Play Text Size',        desc: 'Game mode titles (Endless Mode, Story Mode, Coins & Shop) in the How to Play screen are now larger and easier to read.' },
  { v: 'v1.59.0', date: '8:25 PM, 26 Feb 2026',  title: 'Story Mode Tutorial',       desc: 'A 5-slide tutorial overlay appears the first time you enter Story Mode. It covers the Solar Map, planet hazards, boss battles, and the coins/shop system. Use NEXT or SPACE to advance, SKIP or ESC to dismiss. Never shown again after the first visit.' },
  { v: 'v1.59.1', date: '8:37 PM, 26 Feb 2026',  title: 'Tutorial & Progress Polish',   desc: 'Tutorial overlay redesigned with a gradient card, per-slide emoji icon, colored accent stripe, glow effects, and cleaner button styles. The Next/Done button now always uses white text so it is readable on any slide color. The Story Mode button now correctly shows planets completed (0–9) instead of planets unlocked.' },
  { v: 'v1.60.0', date: '8:46 PM, 26 Feb 2026',  title: 'Settings Screen',              desc: 'New Settings button on the main menu. The Settings screen lets you toggle sound on/off (saved between sessions) and replay the Story Mode tutorial (which brings you directly to the Solar Map).' },
  { v: 'v1.60.1', date: '8:46 PM, 26 Feb 2026',  title: 'Settings Freeze Fix',          desc: 'Fixed a freeze when opening the Settings screen. The game update loop was missing an early return for the SETTINGS state, causing it to fall through into gameplay logic with uninitialized objects.' },
  { v: 'v1.60.2', date: '8:50 PM, 26 Feb 2026',  title: 'Tutorial Back Button',         desc: 'Added a permanent ← BACK button to the tutorial overlay. Previously the Skip button was hidden on the last slide, leaving no way to exit without clicking Next.' },
  { v: 'v1.60.3', date: '8:52 PM, 26 Feb 2026',  title: 'Tutorial Navigation Rework',   desc: 'Tutorial overlay now has a ✕ close button in the top-right corner of the card to exit at any time, and a ← BACK button at the bottom-left to return to the previous slide (hidden on the first slide).' },
  { v: 'v1.60.4', date: '2:45 PM, 28 Feb 2026',  title: 'Tutorial Back Button Glow',    desc: 'The ← BACK button in the tutorial now glows with the current slide color, matching the visual style of the NEXT button.' },
  { v: 'v1.60.5', date: '2:59 PM, 28 Feb 2026',  title: 'Changelog Dates',              desc: 'Each changelog entry now shows the time, day, month, and year it was released, sourced from the git commit history.' },
  { v: 'v1.60.6', date: '3:00 PM, 28 Feb 2026',  title: 'Changelog Layout Fix',         desc: 'Fixed the "NEW" badge overlapping the date label in changelog entries. The date is now rendered on its own dedicated row, separate from the version title and badge.' },
  { v: 'v1.60.7', date: '3:00 PM, 28 Feb 2026',  title: 'Changelog Date Spacing Fix',   desc: 'Fixed the date label overlapping description text in changelog entries. Entry height increased and the date, first description line, and second description line now each occupy a distinct row.' },
  { v: 'v1.61.0', date: '3:12 PM, 28 Feb 2026',  title: 'Shop Tutorial',                desc: 'A 4-slide tutorial overlay now appears the first time you open the Shop. It explains how to earn coins, how to change colors and hull shapes, what each ship attribute does (SPD, RATE, DEF, POW), and how engines modify your stats. Can be replayed from the Settings screen.' },
  { v: 'v1.61.1', date: '3:16 PM, 28 Feb 2026',  title: 'Story Mode Lives Fix',      desc: 'Defeating a boss in Story Mode no longer grants +2 lives. The bonus only applies in Endless Mode.' },
  { v: 'v1.62.0', date: '6:16 PM, 28 Feb 2026',  title: 'Planet Launch Dialogue',    desc: 'Each Story Mode planet now opens with a short radio conversation between the Pilot and Earth Control Tower. The dialogue plays over scrolling stars after the warp animation. Press SPACE or click NEXT to advance; the final line launches the level.' },
  { v: 'v1.62.1', date: '6:26 PM, 28 Feb 2026',  title: 'Dialogue Upgrade',          desc: 'The destination planet is now displayed large in the upper-center of the screen during dialogue. A 64×64 avatar appears in the panel — the player\'s ship when the Pilot speaks, a space command tower when Control speaks. All planets now have 6 lines of dialogue.' },
  { v: 'v1.63.0', date: '7:38 PM, 28 Feb 2026',  title: 'Dialogue Overhaul',         desc: 'All 9 planets now have 2 randomized pre-launch dialogue scripts picked at random on each visit, with varied speaker order and unique content. The Sun features a special intro from Earth Control Tower explaining the mission and hinting at a larger threat. Each boss encounter now opens with a 4-line exchange between the boss and the pilot, rendered over the live game world with a skull avatar in the boss\'s color. Endless Mode is unaffected.' },
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
