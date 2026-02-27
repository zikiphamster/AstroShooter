// ═══════════════════════════════════════════════════════════════════════════════
// ██  WORLD
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Stars ────────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// Word-wrap text to fit within maxWidth (requires ctx.font already set)
function wrapText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
