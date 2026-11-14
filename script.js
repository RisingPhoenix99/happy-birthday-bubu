// ---- CONFIG: edit these ----
const CONFIG = {
  name: 'Bubu',
  relationshipStart: '2025-11-14', // the day you met
  winScore: 20,                   // score needed to unlock the surprise
  gameSeconds: 30
};

document.getElementById('name').textContent = CONFIG.name;

// ---- Days together ----
const today = new Date();
document.getElementById('days').textContent =
  Math.max(0, Math.floor((today - new Date(CONFIG.relationshipStart)) / 864e5));

// ---- Flip cards (tap on mobile) ----
document.querySelectorAll('.flip').forEach(c =>
  c.addEventListener('click', () => c.classList.toggle('open')));

// ---- Scroll reveal ----
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('show'); io.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ---- Floating petals / hearts background ----
const floaters = document.getElementById('floaters');
const icons = ['💗', '🌸', '✨', '💖', '🌷', '🤍'];
function spawnFloater() {
  const el = document.createElement('span');
  el.className = 'floater';
  el.textContent = icons[Math.floor(Math.random() * icons.length)];
  el.style.left = Math.random() * 100 + 'vw';
  el.style.fontSize = 12 + Math.random() * 20 + 'px';
  el.style.animationDuration = 9 + Math.random() * 8 + 's';
  floaters.appendChild(el);
  setTimeout(() => el.remove(), 18000);
}
setInterval(spawnFloater, 900);

// ---- Sparkle cursor trail (desktop) ----
let lastSpark = 0;
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || Date.now() - lastSpark < 60) return;
  lastSpark = Date.now();
  const s = document.createElement('span');
  s.className = 'spark';
  s.textContent = '✦';
  s.style.left = e.clientX + 'px';
  s.style.top = e.clientY + 'px';
  s.style.color = ['#ff7eb3', '#cdb4ff', '#ffc857'][Math.floor(Math.random() * 3)];
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 800);
});

// ---- Confetti ----
const canvas = document.getElementById('confetti');
const ctx = canvas.getContext('2d');
let pieces = [];
const colors = ['#ff7eb3', '#ffc857', '#d6457a', '#cdb4ff', '#8ee3c8', '#fff'];
function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
addEventListener('resize', resize); resize();

function burst(count = 150) {
  const wasEmpty = pieces.length === 0;
  for (let i = 0; i < count; i++) {
    pieces.push({
      x: innerWidth / 2, y: innerHeight / 3,
      vx: (Math.random() - .5) * 14, vy: Math.random() * -12 - 2,
      size: Math.random() * 8 + 4, rot: Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
  if (wasEmpty) animate();
}
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  pieces.forEach(p => {
    p.vy += .25; p.x += p.vx; p.y += p.vy; p.rot += .1;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
    ctx.restore();
  });
  pieces = pieces.filter(p => p.y < canvas.height + 20);
  if (pieces.length) requestAnimationFrame(animate);
  else ctx.clearRect(0, 0, canvas.width, canvas.height);
}
document.getElementById('confettiBtn').addEventListener('click', () => burst());
addEventListener('load', () => setTimeout(() => burst(120), 500));

// ---- Candle ----
document.getElementById('cake').addEventListener('click', () => {
  const flame = document.getElementById('flame');
  const text = document.getElementById('wishText');
  if (flame.classList.toggle('out')) {
    text.textContent = 'Wish made! May all of them come true 💖';
    burst(200);
  } else {
    text.textContent = 'Click the candle to blow it out 🕯️';
  }
});

// =====================================================
//  GAME: Catch the Hearts
// =====================================================
(() => {
  const gc = document.getElementById('gameCanvas');
  const g = gc.getContext('2d');
  const W = gc.width, H = gc.height;
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const bestEl = document.getElementById('best');
  const overlay = document.getElementById('gameOverlay');
  const oTitle = document.getElementById('overlayTitle');
  const oText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const surprise = document.getElementById('surprise');

  const TYPES = [
    { emoji: '💖', points: 1, weight: 60 },
    { emoji: '🎁', points: 3, weight: 15 },
    { emoji: '💔', points: -2, weight: 25 }
  ];
  const player = { x: W / 2, y: H - 40, w: 64 };
  let items = [], score = 0, timeLeft = 0, running = false;
  let spawnTimer = 0, last = 0, tickAcc = 0, keys = {};
  let best = Number(localStorage.getItem('hbdBest') || 0);
  bestEl.textContent = best;

  function pickType() {
    let r = Math.random() * 100;
    for (const t of TYPES) { if ((r -= t.weight) < 0) return t; }
    return TYPES[0];
  }

  function movePlayer(clientX) {
    const rect = gc.getBoundingClientRect();
    player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, (clientX - rect.left) * (W / rect.width)));
  }
  gc.addEventListener('pointermove', e => movePlayer(e.clientX));
  gc.addEventListener('pointerdown', e => movePlayer(e.clientX));
  addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys[e.key] = true; if (running) e.preventDefault(); }
  });
  addEventListener('keyup', e => { delete keys[e.key]; });

  function start() {
    items = []; score = 0; timeLeft = CONFIG.gameSeconds; tickAcc = 0; spawnTimer = 0;
    scoreEl.textContent = 0; timeEl.textContent = timeLeft;
    overlay.classList.add('hidden');
    running = true; last = performance.now();
    requestAnimationFrame(loop);
  }

  function end() {
    running = false;
    const won = score >= CONFIG.winScore;
    if (score > best) { best = score; localStorage.setItem('hbdBest', best); bestEl.textContent = best; }
    oTitle.textContent = won ? 'You did it! 🎉' : 'Time\'s up!';
    oText.textContent = won
      ? `You scored ${score}. Your surprise is unlocked below!`
      : `You scored ${score}. Reach ${CONFIG.winScore} to unlock the surprise.`;
    startBtn.textContent = 'Play Again';
    overlay.classList.remove('hidden');
    if (won) { surprise.hidden = false; burst(220); setTimeout(() => surprise.scrollIntoView({ behavior: 'smooth', block: 'center' }), 600); }
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;

    if (keys.ArrowLeft) player.x -= 380 * dt;
    if (keys.ArrowRight) player.x += 380 * dt;
    player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x));

    tickAcc += dt;
    if (tickAcc >= 1) { tickAcc -= 1; timeLeft--; timeEl.textContent = timeLeft; if (timeLeft <= 0) { draw(); end(); return; } }

    // Spawn faster as time runs out
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      const t = pickType();
      items.push({ ...t, x: 24 + Math.random() * (W - 48), y: -20, vy: 120 + Math.random() * 90 + (CONFIG.gameSeconds - timeLeft) * 4 });
      spawnTimer = 0.75 - (CONFIG.gameSeconds - timeLeft) * 0.01;
    }

    for (const it of items) it.y += it.vy * dt;

    // Collisions
    items = items.filter(it => {
      const hit = Math.abs(it.x - player.x) < player.w / 2 + 6 && Math.abs(it.y - player.y) < 28;
      if (hit) {
        score = Math.max(0, score + it.points);
        scoreEl.textContent = score;
        pops.push({ x: it.x, y: it.y, text: (it.points > 0 ? '+' : '') + it.points, life: 0.7 });
        return false;
      }
      return it.y < H + 30;
    });

    draw();
    requestAnimationFrame(loop);
  }

  const pops = [];
  function draw() {
    g.clearRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '30px serif';
    for (const it of items) g.fillText(it.emoji, it.x, it.y);
    g.font = '52px serif';
    g.fillText('🎂', player.x, player.y);
    g.font = 'bold 18px Poppins, sans-serif';
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i]; p.life -= 0.016; p.y -= 0.8;
      if (p.life <= 0) { pops.splice(i, 1); continue; }
      g.globalAlpha = Math.max(p.life, 0);
      g.fillStyle = p.text.startsWith('-') ? '#6a4c93' : '#d6457a';
      g.fillText(p.text, p.x, p.y - 20);
      g.globalAlpha = 1;
    }
  }

  startBtn.addEventListener('click', start);
  draw();
})();
