const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRAVITY = 0.6;
const GROUND_Y = 320;
let isAiMode = true;
let gameOver = false;

// --- RETRO SOUND & MUSIC SYNTHESIZER (WEB AUDIO API) ---
let audioCtx = null;
let soundEnabled = true;
let bgmInterval = null;
let bgmNoteIndex = 0;

// Simple 8-bit Background Music Melody Sequence (Frequencies in Hz)
const bgmMelody = [
  164.81, 196.00, 220.00, 196.00, 164.81, 146.83, 164.81, 0,
  130.81, 164.81, 196.00, 164.81, 130.81, 110.00, 130.81, 0
];

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    startBGM();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Procedural Background Music Loop
function startBGM() {
  if (bgmInterval) return;
  bgmInterval = setInterval(() => {
    if (!soundEnabled || !audioCtx || gameOver) return;
    
    const freq = bgmMelody[bgmNoteIndex];
    bgmNoteIndex = (bgmNoteIndex + 1) % bgmMelody.length;

    if (freq > 0) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.04, audioCtx.currentTime); // Soft background volume
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    }
  }, 200);
}

// Sword Swing Sound Effect
function playSwingSound() {
  if (!soundEnabled) return;
  initAudio();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.12);

  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.12);
}

// Hit Impact Sound Effect
function playHitSound() {
  if (!soundEnabled) return;
  initAudio();

  const bufferSize = audioCtx.sampleRate * 0.1;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

  noise.connect(gain);
  gain.connect(audioCtx.destination);

  noise.start();
}

// Victory Arpeggio Tone
function playVictorySound() {
  if (!soundEnabled) return;
  initAudio();

  const notes = [261.63, 329.63, 392.00, 523.25]; // C - E - G - C
  notes.forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime + idx * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + idx * 0.1 + 0.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime + idx * 0.1);
    osc.stop(audioCtx.currentTime + idx * 0.1 + 0.2);
  });
}

// Defeat Low Tone
function playDefeatSound() {
  if (!soundEnabled) return;
  initAudio();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.4);

  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
}

// Load Animated Sprite Sheets using embedded Data URIs
function createWarriorSprite(colorHex, glowHex) {
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <defs>
      <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect x="75" y="60" width="50" height="70" rx="8" fill="${colorHex}" stroke="#0f172a" stroke-width="4"/>
    <circle cx="100" cy="40" r="24" fill="${colorHex}" stroke="#0f172a" stroke-width="4"/>
    <rect x="85" y="32" width="30" height="8" rx="3" fill="#0f172a"/>
    <rect x="90" y="34" width="20" height="4" rx="2" fill="${glowHex}" filter="url(#glow)"/>
    <path d="M130 50 L180 20 L170 10 L120 40 Z" fill="#e2e8f0" stroke="#0f172a" stroke-width="2"/>
    <rect x="118" y="38" width="12" height="6" fill="#f59e0b"/>
  </svg>`;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
  return img;
}

const p1Sprite = createWarriorSprite('#38bdf8', '#7dd3fc');
const p2Sprite = createWarriorSprite('#f43f5e', '#fda4af');

// Fighter Class
class Fighter {
  constructor({ position, velocity, sprite, attackBoxOffset, name, healthBarId }) {
    this.position = position;
    this.velocity = velocity;
    this.width = 60;
    this.height = 100;
    this.sprite = sprite;
    this.name = name;
    this.health = 100;
    this.healthBar = document.getElementById(healthBarId);
    
    this.isAttacking = false;
    this.attackBox = {
      position: { x: this.position.x, y: this.position.y },
      offset: attackBoxOffset,
      width: 90,
      height: 50
    };
    this.facing = 'right';
    this.animTimer = 0;
  }

  draw() {
    ctx.save();

    if (this.facing === 'left') {
      ctx.translate(this.position.x + this.width, this.position.y);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(this.position.x, this.position.y);
    }

    let yOffset = 0;
    let rotation = 0;

    if (Math.abs(this.velocity.x) > 0) {
      this.animTimer += 0.2;
      yOffset = Math.sin(this.animTimer) * 4;
    }

    if (this.velocity.y !== 0) {
      rotation = 0.08;
    }

    if (this.isAttacking) {
      ctx.translate(10, 0);
      rotation = -0.15;
    }

    ctx.rotate(rotation);
    ctx.drawImage(this.sprite, 0, yOffset, this.width, this.height);

    if (this.isAttacking) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(this.width / 2 + 30, this.height / 2, 45, -Math.PI / 4, Math.PI / 4);
      ctx.fill();
    }

    ctx.restore();
  }

  update() {
    this.draw();

    if (this.facing === 'right') {
      this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
    } else {
      this.attackBox.position.x = this.position.x - this.attackBox.width + 20;
    }
    this.attackBox.position.y = this.position.y + this.attackBox.offset.y;

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    if (this.position.y + this.height + this.velocity.y >= GROUND_Y) {
      this.velocity.y = 0;
      this.position.y = GROUND_Y - this.height;
    } else {
      this.velocity.y += GRAVITY;
    }

    if (this.position.x < 0) this.position.x = 0;
    if (this.position.x + this.width > canvas.width) this.position.x = canvas.width - this.width;
  }

  attack() {
    if (this.isAttacking || gameOver) return;
    this.isAttacking = true;
    playSwingSound();
    setTimeout(() => {
      this.isAttacking = false;
    }, 150);
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health < 0) this.health = 0;
    this.healthBar.style.width = this.health + '%';
    playHitSound();
  }

  reset(xPos) {
    this.health = 100;
    this.healthBar.style.width = '100%';
    this.position.x = xPos;
    this.position.y = 100;
    this.velocity = { x: 0, y: 0 };
    this.isAttacking = false;
  }
}

// Instantiate Champions
const player1 = new Fighter({
  position: { x: 100, y: 100 },
  velocity: { x: 0, y: 0 },
  sprite: p1Sprite,
  attackBoxOffset: { x: 40, y: 20 },
  name: 'Aerus',
  healthBarId: 'p1-health'
});

const player2 = new Fighter({
  position: { x: 640, y: 100 },
  velocity: { x: 0, y: 0 },
  sprite: p2Sprite,
  attackBoxOffset: { x: 0, y: 20 },
  name: 'Rival',
  healthBarId: 'p2-health'
});
player2.facing = 'left';

const keys = {
  a: { pressed: false },
  d: { pressed: false },
  ArrowLeft: { pressed: false },
  ArrowRight: { pressed: false }
};

// UI & Buttons
const modeBtn = document.getElementById('mode-toggle');
const soundBtn = document.getElementById('sound-toggle');
const p2Label = document.getElementById('p2-label');
const gameOverOverlay = document.getElementById('game-over-overlay');
const resultBanner = document.getElementById('result-banner');
const restartBtn = document.getElementById('restart-btn');

modeBtn.addEventListener('click', () => {
  isAiMode = !isAiMode;
  modeBtn.innerText = isAiMode ? 'VS Computer' : '2P Local';
  p2Label.innerText = isAiMode ? 'CPU (Rival AI)' : 'Champion 2 (P2)';
});

soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundBtn.innerText = soundEnabled ? '🔊 Audio: ON' : '🔇 Audio: OFF';
});

// Keyboard Input
window.addEventListener('keydown', (event) => {
  if (gameOver) return;
  initAudio();
  switch (event.key) {
    case 'a': case 'A': keys.a.pressed = true; player1.facing = 'left'; break;
    case 'd': case 'D': keys.d.pressed = true; player1.facing = 'right'; break;
    case 'w': case 'W': if (player1.velocity.y === 0) player1.velocity.y = -14; break;
    case ' ': player1.attack(); break;

    case 'ArrowLeft': if (!isAiMode) { keys.ArrowLeft.pressed = true; player2.facing = 'left'; } break;
    case 'ArrowRight': if (!isAiMode) { keys.ArrowRight.pressed = true; player2.facing = 'right'; } break;
    case 'ArrowUp': if (!isAiMode && player2.velocity.y === 0) player2.velocity.y = -14; break;
    case 'Enter': if (!isAiMode) player2.attack(); break;
  }
});

window.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'a': case 'A': keys.a.pressed = false; break;
    case 'd': case 'D': keys.d.pressed = false; break;
    case 'ArrowLeft': keys.ArrowLeft.pressed = false; break;
    case 'ArrowRight': keys.ArrowRight.pressed = false; break;
  }
});

// Touch Event Listeners
function bindTouchButton(btnId, onPress, onRelease) {
  const btn = document.getElementById(btnId);
  btn.addEventListener('touchstart', (e) => { e.preventDefault(); initAudio(); if (!gameOver) onPress(); });
  btn.addEventListener('touchend', (e) => { e.preventDefault(); if (onRelease) onRelease(); });
}

bindTouchButton('btn-left', () => { keys.a.pressed = true; player1.facing = 'left'; }, () => { keys.a.pressed = false; });
bindTouchButton('btn-right', () => { keys.d.pressed = true; player1.facing = 'right'; }, () => { keys.d.pressed = false; });
bindTouchButton('btn-jump', () => { if (player1.velocity.y === 0) player1.velocity.y = -14; });
bindTouchButton('btn-attack', () => { player1.attack(); });

// AI Logic
function updateComputerAI() {
  if (!isAiMode || player2.health <= 0 || gameOver) return;

  const distanceToPlayer = player1.position.x - player2.position.x;
  player2.facing = distanceToPlayer > 0 ? 'right' : 'left';

  if (Math.abs(distanceToPlayer) > 60) {
    player2.velocity.x = distanceToPlayer > 0 ? 3.5 : -3.5;
  } else {
    player2.velocity.x = 0;
    if (Math.random() < 0.05) {
      player2.attack();
    }
  }

  if (player1.position.y < GROUND_Y - 120 && player2.velocity.y === 0 && Math.random() < 0.08) {
    player2.velocity.y = -14;
  }
}

function rectangularCollision({ rectangle1, rectangle2 }) {
  return (
    rectangle1.attackBox.position.x + rectangle1.attackBox.width >= rectangle2.position.x &&
    rectangle1.attackBox.position.x <= rectangle2.position.x + rectangle2.width &&
    rectangle1.attackBox.position.y + rectangle1.attackBox.height >= rectangle2.position.y &&
    rectangle1.attackBox.position.y <= rectangle2.position.y + rectangle2.height
  );
}

function checkGameOver() {
  if (gameOver) return;

  if (player2.health <= 0) {
    gameOver = true;
    resultBanner.src = 'image/victory.png';
    gameOverOverlay.style.display = 'flex';
    playVictorySound();
  } else if (player1.health <= 0) {
    gameOver = true;
    resultBanner.src = 'image/defeat.png';
    gameOverOverlay.style.display = 'flex';
    playDefeatSound();
  }
}

restartBtn.addEventListener('click', () => {
  gameOver = false;
  gameOverOverlay.style.display = 'none';
  player1.reset(100);
  player2.reset(640);
  player2.facing = 'left';
});

// Game Loop
function animate() {
  window.requestAnimationFrame(animate);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

  player1.velocity.x = 0;
  if (!isAiMode) player2.velocity.x = 0;

  if (!gameOver) {
    if (keys.a.pressed) player1.velocity.x = -5;
    else if (keys.d.pressed) player1.velocity.x = 5;

    if (!isAiMode) {
      if (keys.ArrowLeft.pressed) player2.velocity.x = -5;
      else if (keys.ArrowRight.pressed) player2.velocity.x = 5;
    } else {
      updateComputerAI();
    }
  }

  player1.update();
  player2.update();

  if (!gameOver) {
    if (rectangularCollision({ rectangle1: player1, rectangle2: player2 }) && player1.isAttacking) {
      player1.isAttacking = false;
      player2.takeDamage(10);
    }

    if (rectangularCollision({ rectangle1: player2, rectangle2: player1 }) && player2.isAttacking) {
      player2.isAttacking = false;
      player1.takeDamage(10);
    }

    checkGameOver();
  }
}

animate();
