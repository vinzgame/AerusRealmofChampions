// --- AERUS: 3D ENGINE WITH FX & AUDIO SYNTHESIS ---

let scene, camera, renderer;
let player1, player2;
let p1Health = 100, p2Health = 100;
let isRoundActive = false;
let audioCtx = null;

const joystickVector = { x: 0, y: 0 };
let isAttacking = false;
let particles = [];

// --- WEBAUDIO SOUND ENGINE (OPEN SOURCE / SYNTHESIZED) ---
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'hit') {
    // Punch / Impact Sound
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'jump') {
    // Woosh Jump Sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.2);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'victory') {
    // Win Fanfare
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(554.37, now + 0.15);
    osc.frequency.setValueAtTime(659.25, now + 0.3);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);
  }
}

// Initialize 3D Arena
window.init3DGame = function(selectedChar) {
  initAudio();
  const container = document.getElementById('game-canvas-container');
  if (!container) return;
  container.innerHTML = '';

  // Scene & Camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050b14);
  scene.fog = new THREE.FogExp2(0x050b14, 0.03);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 3.2, 9.5);

  // WebGL Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  const cyanLight = new THREE.PointLight(0x00f0ff, 2, 20);
  cyanLight.position.set(-5, 4, 3);
  scene.add(cyanLight);

  const magentaLight = new THREE.PointLight(0xff0055, 2, 20);
  magentaLight.position.set(5, 4, 3);
  scene.add(magentaLight);

  // Sci-Fi Cyber Grid Stage
  const groundGeo = new THREE.PlaneGeometry(32, 12);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a1128, roughness: 0.4, metalness: 0.8 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Load 3D Models
  loadHeroCharacters(selectedChar);

  // Mobile Controls
  setupJoystick();
  setupActionButtons();

  isRoundActive = true;
  animate3D();
};

function loadHeroCharacters(selectedChar) {
  const loader = new THREE.GLTFLoader();

  // Public Hosted Hero Models
  let p1Url = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb';
  let p2Url = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb';

  if (selectedChar && selectedChar.id === 'soldier') {
    p1Url = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb';
    p2Url = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb';
  }

  // Load P1
  loader.load(p1Url, (gltf) => {
    player1 = gltf.scene;
    const scale = selectedChar && selectedChar.id === 'soldier' ? 1.2 : 0.4;
    player1.scale.set(scale, scale, scale);
    player1.position.set(-3, 0, 0);
    player1.rotation.y = Math.PI / 2;
    player1.userData = { velocityY: 0, isJumping: false, facingRight: true };
    scene.add(player1);
  });

  // Load P2
  loader.load(p2Url, (gltf) => {
    player2 = gltf.scene;
    const scale = selectedChar && selectedChar.id === 'soldier' ? 0.4 : 1.2;
    player2.scale.set(scale, scale, scale);
    player2.position.set(3, 0, 0);
    player2.rotation.y = -Math.PI / 2;
    player2.userData = { velocityY: 0, isJumping: false, facingRight: false };
    scene.add(player2);
  });
}

function createHitParticles(x, y, z) {
  for (let i = 0; i < 12; i++) {
    const geo = new THREE.SphereGeometry(0.08, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    const p = new THREE.Mesh(geo, mat);
    p.position.set(x, y, z);
    p.userData = {
      vx: (Math.random() - 0.5) * 0.2,
      vy: Math.random() * 0.2,
      vz: (Math.random() - 0.5) * 0.2,
      life: 1.0
    };
    scene.add(p);
    particles.push(p);
  }
}

function showFloatingDamage(amount, x) {
  const overlay = document.getElementById('damage-overlay');
  if (!overlay) return;

  const el = document.createElement('div');
  el.className = 'floating-dmg';
  el.innerText = `-${amount}`;
  el.style.left = `${(x + 10) * 4.5}%`;
  overlay.appendChild(el);

  setTimeout(() => el.remove(), 800);
}

function setupJoystick() {
  const base = document.getElementById('joystick-base');
  const stick = document.getElementById('joystick-stick');
  if (!base || !stick) return;

  const maxRadius = 35;
  let touchId = null;

  function handleMove(clientX, clientY) {
    const rect = base.getBoundingClientRect();
    let deltaX = clientX - (rect.left + rect.width / 2);
    let deltaY = clientY - (rect.top + rect.height / 2);
    let dist = Math.hypot(deltaX, deltaY);

    if (dist > maxRadius) {
      deltaX = (deltaX / dist) * maxRadius;
      deltaY = (deltaY / dist) * maxRadius;
    }

    stick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    joystickVector.x = deltaX / maxRadius;
  }

  base.addEventListener('touchstart', (e) => {
    initAudio();
    touchId = e.changedTouches[0].identifier;
    handleMove(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  });

  window.addEventListener('touchmove', (e) => {
    for (let t of e.changedTouches) {
      if (t.identifier === touchId) handleMove(t.clientX, t.clientY);
    }
  });

  const reset = () => {
    touchId = null;
    stick.style.transform = `translate(0px, 0px)`;
    joystickVector.x = 0;
  };

  window.addEventListener('touchend', reset);
}

function setupActionButtons() {
  const jumpBtn = document.getElementById('btn-jump');
  const attackBtn = document.getElementById('btn-attack');

  if (jumpBtn) {
    jumpBtn.onclick = () => {
      initAudio();
      if (player1 && !player1.userData.isJumping) {
        playSound('jump');
        player1.userData.velocityY = 0.28;
        player1.userData.isJumping = true;
      }
    };
  }

  if (attackBtn) {
    attackBtn.onclick = () => {
      initAudio();
      if (player1 && !isAttacking) {
        isAttacking = true;
        player1.position.x += 0.6;
        checkHit(player1, player2, 'p2');

        setTimeout(() => {
          if (player1) player1.position.x -= 0.6;
          isAttacking = false;
        }, 150);
      }
    };
  }
}

function checkHit(attacker, defender, targetTag) {
  if (!attacker || !defender) return;
  const dist = attacker.position.distanceTo(defender.position);

  if (dist < 2.2) {
    playSound('hit');
    createHitParticles(defender.position.x, 1.2, defender.position.z);
    showFloatingDamage(15, defender.position.x);

    if (targetTag === 'p2') {
      p2Health = Math.max(0, p2Health - 15);
      document.getElementById('p2-hp-bar').style.width = p2Health + '%';
      document.getElementById('p2-hp-text').innerText = p2Health + '%';
    }

    if (p1Health <= 0 || p2Health <= 0) {
      isRoundActive = false;
      playSound('victory');
      if (window.handleRoundEnd) {
        window.handleRoundEnd(p1Health > 0 ? 'p1' : 'p2');
      }
    }
  }
}

window.restartRound = function() {
  p1Health = 100;
  p2Health = 100;
  document.getElementById('p1-hp-bar').style.width = '100%';
  document.getElementById('p2-hp-bar').style.width = '100%';
  document.getElementById('p1-hp-text').innerText = '100%';
  document.getElementById('p2-hp-text').innerText = '100%';

  if (player1) player1.position.set(-3, 0, 0);
  if (player2) player2.position.set(3, 0, 0);
  isRoundActive = true;
};

function animate3D() {
  if (!renderer) return;
  requestAnimationFrame(animate3D);

  if (isRoundActive && player1 && player2) {
    player1.position.x += joystickVector.x * 0.1;
    player1.position.x = Math.max(-9, Math.min(9, player1.position.x));

    if (player1.userData.isJumping) {
      player1.position.y += player1.userData.velocityY;
      player1.userData.velocityY -= 0.018;
      if (player1.position.y <= 0) {
        player1.position.y = 0;
        player1.userData.isJumping = false;
      }
    }

    // AI logic
    const dist = player1.position.x - player2.position.x;
    if (Math.abs(dist) > 1.6) {
      player2.position.x += dist > 0 ? 0.03 : -0.03;
    } else if (Math.random() < 0.02) {
      checkHit(player2, player1, 'p1');
    }

    camera.position.x = (player1.position.x + player2.position.x) / 2;
  }

  // Animate hit particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.position.x += p.userData.vx;
    p.position.y += p.userData.vy;
    p.position.z += p.userData.vz;
    p.userData.life -= 0.05;
    p.scale.multiplyScalar(0.9);

    if (p.userData.life <= 0) {
      scene.remove(p);
      particles.splice(i, 1);
    }
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});
