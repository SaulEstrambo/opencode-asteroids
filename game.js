'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyS', 'ShiftLeft', 'ShiftRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins ─────────────────────────────────────────────────────────────────────
const SKINS = [
  {
    name: 'CLÁSICA',
    stroke: '#fff',
    glow: null,
    thrustColor: 'rgba(255, 130, 0, 0.85)',
    verts: [[20,0],[-12,-9],[-7,0],[-12,9]],
  },
  {
    name: 'NÉON',
    stroke: '#00E5FF',
    glow: '#00E5FF',
    thrustColor: 'rgba(0, 229, 255, 0.85)',
    verts: [[22,0],[-8,-6],[-14,-10],[-7,0],[-14,10],[-8,6]],
  },
  {
    name: 'FUEGO',
    stroke: '#FF3D00',
    glow: '#FF6D00',
    thrustColor: 'rgba(255, 61, 0, 0.85)',
    verts: [[24,0],[-6,-5],[-10,-11],[-4,-2],[-10,-6],[-7,0],[-10,6],[-4,2],[-10,11],[-6,5]],
  },
  {
    name: 'FANTASMA',
    stroke: '#B388FF',
    glow: '#B388FF',
    thrustColor: 'rgba(179, 136, 255, 0.7)',
    verts: [[18,0],[-10,-7],[-14,-3],[-12,0],[-14,3],[-10,7]],
  },
  {
    name: 'ROBO',
    stroke: '#76FF03',
    glow: '#76FF03',
    thrustColor: 'rgba(118, 255, 3, 0.85)',
    verts: [[20,0],[-4,-4],[-12,-4],[-12,-8],[-8,-8],[-8,-4],[-4,-10],[0,-10],[0,10],[-4,10],[-8,4],[-8,8],[-12,8],[-12,4],[-4,4]],
  },
];

let skinIndex = 0;

function loadSkin() {
  const saved = parseInt(localStorage.getItem('asteroids_skin'));
  if (Number.isInteger(saved) && saved >= 0 && saved < SKINS.length) skinIndex = saved;
}

function saveSkin() {
  localStorage.setItem('asteroids_skin', skinIndex);
}

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Shooting Star (Estrella Fugaz) ───────────────────────────────────────────
class ShootingStar extends Asteroid {
  constructor(x, y) {
    super(x, y, 2);
    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[2] * 2 + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.ttl  = 5;
    this.life = 5;
    this.points = 500;
  }

  update(dt) {
    super.update(dt);
    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.dead = true;
      explode(this.x, this.y, 6);
    }
  }

  split() { return []; }

  draw() {
    const alpha = Math.max(0, this.ttl / this.life);
    const flash = this.ttl < 1.5 && Math.floor(this.ttl * 8) % 2 === 0;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.globalAlpha = flash ? alpha * 0.5 : alpha;

    // Brillo
    ctx.strokeStyle = '#FFD700';
    ctx.fillStyle   = 'rgba(255,215,0,0.12)';
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur  = 16;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoostTimer = 0;
    this.tripleShotTimer = 0;
    this.shieldActive      = false;
    this.shieldEnergy      = 100;
    this.shieldMaxEnergy   = 100;
    this.shieldDrainRate   = 20;
    this.shieldRechargeRate = 8;
    this.shieldHitDrain    = 10;
    this.shieldCooldown    = 0;
    this.shieldCooldownTime = 3;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

    if (this.speedBoostTimer > 0) this.speedBoostTimer -= dt;
    if (this.tripleShotTimer > 0) this.tripleShotTimer -= dt;

    const wantsShield = keys['ShiftLeft'] || keys['ShiftRight'];
    if (this.shieldCooldown > 0) {
      this.shieldActive = false;
      this.shieldCooldown -= dt;
      if (this.shieldCooldown <= 0) {
        this.shieldCooldown = 0;
        this.shieldEnergy = 0;
      }
    } else if (wantsShield && this.shieldEnergy > 0) {
      this.shieldActive = true;
      this.shieldEnergy = Math.max(0, this.shieldEnergy - this.shieldDrainRate * dt);
    } else {
      this.shieldActive = false;
      this.shieldEnergy = Math.min(this.shieldMaxEnergy, this.shieldEnergy + this.shieldRechargeRate * dt);
    }

    if (this.shieldEnergy <= 0 && this.shieldCooldown <= 0 && this.shieldActive) {
      this.shieldActive = false;
      this.shieldCooldown = this.shieldCooldownTime;
    }

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      const thrust = this.speedBoostTimer > 0 ? THRUST * 2 : THRUST;
      this.vx += Math.cos(this.angle) * thrust * dt;
      this.vy += Math.sin(this.angle) * thrust * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShotTimer > 0) {
      return [
        new Bullet(ox, oy, this.angle - 0.15),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + 0.15),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[skinIndex];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.stroke;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    if (skin.glow) {
      ctx.shadowColor = skin.glow;
      ctx.shadowBlur = 10;
    }

    if (this.speedBoostTimer > 0) {
      ctx.strokeStyle = '#00E5FF';
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 10;
    } else if (this.tripleShotTimer > 0) {
      ctx.strokeStyle = '#FF6B00';
      ctx.shadowColor = '#FF6B00';
      ctx.shadowBlur = 10;
    }

    // Silueta según la skin activa
    ctx.beginPath();
    ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
    for (let i = 1; i < skin.verts.length; i++)
      ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = this.speedBoostTimer > 0
        ? 'rgba(0, 229, 255, 0.85)'
        : this.tripleShotTimer > 0
          ? 'rgba(255, 107, 0, 0.85)'
          : skin.thrustColor;
      ctx.stroke();
    }

    if (this.speedBoostTimer > 0 || this.tripleShotTimer > 0) ctx.shadowBlur = 0;

    ctx.restore();

    if (this.shieldActive) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 180, 255, 0.6)';
      ctx.fillStyle   = 'rgba(0, 180, 255, 0.18)';
      ctx.lineWidth   = 2;
      ctx.shadowColor = '#00B4FF';
      ctx.shadowBlur  = 18;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── PowerUp ──────────────────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = 10;
    this.ttl = 8;
    this.dead = false;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(15, 35);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const isTriple = this.type === 'triple';
    const color = isTriple ? '#FF6B00' : '#FFD700';
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    if (isTriple) {
      // Tres puntos representando triple shot
      ctx.beginPath();
      ctx.arc(-4, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -5, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Rayo para velocidad
      ctx.beginPath();
      ctx.moveTo(-2, -8);
      ctx.lineTo(3, -2);
      ctx.lineTo(-1, -2);
      ctx.lineTo(2, 8);
      ctx.lineTo(-3, 1);
      ctx.lineTo(1, 1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'menu' | 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function startGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'menu') {
    if (pressed('ArrowLeft'))  { skinIndex = (skinIndex - 1 + SKINS.length) % SKINS.length; saveSkin(); }
    if (pressed('ArrowRight')) { skinIndex = (skinIndex + 1) % SKINS.length; saveSkin(); }
    if (pressed('Space')) startGame();
    return;
  }

  if (state === 'gameover') {
    if (pressed('Space')) state = 'menu';
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Cambiar skin
  if (pressed('KeyS')) { skinIndex = (skinIndex + 1) % SKINS.length; saveSkin(); }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        if (a instanceof ShootingStar) {
          score += 500;
        } else {
          score += POINTS[a.size];
          if (Math.random() < 0.12)
            newAsteroids.push(new ShootingStar(a.x, a.y));
        }
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        if (Math.random() < 0.2) {
          const type = Math.random() < 0.5 ? 'speed' : 'triple';
          powerUps.push(new PowerUp(a.x, a.y, type));
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shieldActive) {
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (Math.random() < 0.2) powerUps.push(new PowerUp(a.x, a.y));
          ship.shieldEnergy = Math.max(0, ship.shieldEnergy - ship.shieldHitDrain);
          if (ship.shieldEnergy <= 0) {
            ship.shieldActive = false;
            ship.shieldCooldown = ship.shieldCooldownTime;
          }
        } else {
          killShip();
          break;
        }
      }
    }
  }

  // Bala enemiga vs escudo
  if (ship.shieldActive) {
    for (const b of bullets) {
      if (!b.dead && dist(ship, b) < 22 + b.radius) {
        b.dead = true;
        ship.shieldEnergy = Math.max(0, ship.shieldEnergy - ship.shieldHitDrain);
        if (ship.shieldEnergy <= 0) {
          ship.shieldActive = false;
          ship.shieldCooldown = ship.shieldCooldownTime;
        }
      }
    }
  }

  // Nave vs power-up
  for (const pu of powerUps) {
    if (!pu.dead && dist(ship, pu) < ship.radius + pu.radius) {
      if (pu.type === 'speed') {
        ship.speedBoostTimer = Math.min(ship.speedBoostTimer + 5, 10);
      } else if (pu.type === 'triple') {
        ship.tripleShotTimer = Math.min(ship.tripleShotTimer + 5, 10);
      }
      pu.dead = true;
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Menu ──────────────────────────────────────────────────────────────────────
let menuTime = 0;

function drawSkinPreview(x, y, skin, scale, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = skin.stroke;
  ctx.lineWidth = 1.5 / scale;
  ctx.lineJoin = 'round';

  if (skin.glow) {
    ctx.shadowColor = skin.glow;
    ctx.shadowBlur = 12;
  }

  ctx.beginPath();
  ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
  for (let i = 1; i < skin.verts.length; i++)
    ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
  ctx.closePath();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawMenu() {
  menuTime += 0.016;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px monospace';
  ctx.fillText('ASTEROIDS', W / 2, 80);

  const spacing = 120;
  const startX = W / 2 - ((SKINS.length - 1) / 2) * spacing;
  const y = H / 2 + 10;

  for (let i = 0; i < SKINS.length; i++) {
    const sx = startX + i * spacing;
    const selected = i === skinIndex;
    const scale = selected ? 1.6 : 1.1;
    const alpha = selected ? 1 : 0.45;
    drawSkinPreview(sx, y, SKINS[i], scale, alpha);

    ctx.textAlign = 'center';
    ctx.font = selected ? 'bold 13px monospace' : '11px monospace';
    ctx.fillStyle = selected ? SKINS[i].stroke : 'rgba(255,255,255,0.5)';
    ctx.fillText(SKINS[i].name, sx, y + 60);

    if (selected) {
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(menuTime * 3));
      ctx.fillStyle = `rgba(255,255,255,${pulse.toFixed(2)})`;
      ctx.font = '11px monospace';
      ctx.fillText('▼', sx, y - 30);
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '14px monospace';
  ctx.fillText('← → SELECCIONAR   ·   ESPACIO JUGAR', W / 2, H - 50);
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SKINS[skinIndex];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(0.45, 0.45);
  ctx.strokeStyle = skin.stroke;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';

  if (skin.glow) {
    ctx.shadowColor = skin.glow;
    ctx.shadowBlur = 6;
  }

  ctx.beginPath();
  ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
  for (let i = 1; i < skin.verts.length; i++)
    ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
  ctx.closePath();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (ship.speedBoostTimer > 0) {
    ctx.fillStyle = '#00E5FF';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`VELOCIDAD  ${ship.speedBoostTimer.toFixed(1)}s`, 14, 50);
  }
  if (ship.tripleShotTimer > 0) {
    ctx.fillStyle = '#FF6B00';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`TRIPLE SHOT  ${ship.tripleShotTimer.toFixed(1)}s`, 14, ship.speedBoostTimer > 0 ? 66 : 50);
  }

  {
    const hudY = 50
      + (ship.speedBoostTimer > 0 ? 16 : 0)
      + (ship.tripleShotTimer > 0 ? 16 : 0);
    if (ship.shieldEnergy < ship.shieldMaxEnergy || ship.shieldActive || ship.shieldCooldown > 0) {
      const barW = 100;
      const barH = 8;
      const pct  = ship.shieldEnergy / ship.shieldMaxEnergy;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(14, hudY, barW, barH);
      ctx.fillStyle = ship.shieldActive ? '#00E5FF' : '#0088CC';
      ctx.fillRect(14, hudY, barW * pct, barH);
      ctx.strokeStyle = 'rgba(0,180,255,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(14, hudY, barW, barH);
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      if (ship.shieldCooldown > 0) {
        ctx.fillStyle = '#FF4444';
        ctx.fillText(`ESCUDO  RECARGANDO  ${ship.shieldCooldown.toFixed(1)}s`, 120, hudY + 7);
      } else {
        ctx.fillText(`ESCUDO  ${Math.ceil(pct * 100)}%`, 120, hudY + 7);
      }
    }
  }
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  if (state === 'menu') {
    drawMenu();
    return;
  }

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  powerUps.forEach(p => p.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA VOLVER AL MENÚ`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

loadSkin();
state = 'menu';
requestAnimationFrame(loop);
