// --- AERUS THREE.JS 3D COMBAT & JOYSTICK ENGINE ---

let scene, camera, renderer;
let player1, player2;
let p1Health = 100, p2Health = 100;
let isRoundActive = false;

// Joystick & Virtual Input Vectors
const joystickVector = { x: 0, y: 0 };
let isAttacking = false;

window.init3DGame = function(selectedChar) {
  const container = document.getElementById('game-canvas-container');
  container.innerHTML = ''; // Reset canvas if re-entering

  // Scene & Camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f1d);
  scene.fog = new THREE.FogExp2(0x0a0f1d, 0.02);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 4, 14);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
  dirLight.position.set(5, 12, 8);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Ground Arena
  const groundGeo = new THREE.PlaneGeometry(30, 10);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Spawn Champions
  player1 = create3DFighter(selectedChar.color, -4);
  player2 = create3DFighter(0xe11d48, 4);

  setupJoystick();
  setupButtons();

  isRoundActive = true;
  animate3D();
};

// Create 3D Modular Fighter Mesh
function create3DFighter(colorHex, startX) {
  const group = new THREE.Group();

  // Torso
  const bodyGeo = new THREE.BoxGeometry(1, 1.8, 0.8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 1.4;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 2.6;
  group.add(head);

  // Weapon
  const swordGeo = new THREE.BoxGeometry(0.1, 1.4, 0.1);
  const swordMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 });
  const sword = new THREE.Mesh(swordGeo, swordMat);
  sword.position.set(0.6, 1.4, 0.4);
  group.add(sword);

  group.position.set(startX, 0, 0);
  group.userData = { velocityY: 0, isJumping: false, facingRight: startX < 0 };
  scene.add(group);

  return group;
}

// Round Virtual Joystick Math Setup
function setupJoystick() {
  const base = document.getElementById('joystick-base');
  const stick = document.getElementById('joystick-stick');
  const maxRadius = 35;

  let touchId = null;
  let baseRect = null;

  function handleMove(clientX, clientY) {
    if (!baseRect) baseRect = base.getBoundingClientRect();
    const centerX = baseRect.left + baseRect.width / 2;
    const centerY = baseRect.top + baseRect.height / 2;

    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;
    let distance = Math.hypot(deltaX, deltaY);

    if (distance > maxRadius) {
      deltaX = (deltaX / distance) * maxRadius;
      deltaY = (deltaY / distance) * maxRadius;
    }

    stick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    joystickVector.x = deltaX / maxRadius;
    joystickVector.y = deltaY / maxRadius;
  }

  base.addEventListener('touchstart', (e) => {
    const touch = e.changedTouches[0];
    touchId = touch.identifier;
    baseRect = base.getBoundingClientRect();
    handleMove(touch.clientX, touch.clientY);
  });

  window.addEventListener('touchmove', (e) => {
    for (let touch of e.changedTouches) {
      if (touch.identifier === touchId) {
        handleMove(touch.clientX, touch.clientY);
      }
    }
  });

  const resetJoystick = () => {
    touchId = null;
    stick.style.transform = `translate(0px, 0px)`;
    joystickVector.x = 0;
    joystickVector.y = 0;
  };

  window.addEventListener('touchend', resetJoystick);
  window.addEventListener('touchcancel', resetJoystick);
}

// Action Button Listeners
function setupButtons() {
  const jumpBtn = document.getElementById('btn-jump');
  const attackBtn = document.getElementById('btn-attack');

  jumpBtn.onclick = () => {
    if (player1 && !player1.userData.isJumping) {
      player1.userData.velocityY = 0.35;
      player1.userData.isJumping = true;
    }
  };

  attackBtn.onclick = () => {
    if (player1 && !isAttacking) {
      isAttacking = true;
      // Quick Attack Translation
      player1.position.x += player1.userData.facingRight ? 0.6 : -0.6;
      checkHit(player1, player2, 'p2');

      setTimeout(() => {
        if (player1) player1.position.x -= player1.userData.facingRight ? 0.6 : -0.6;
        isAttacking = false;
      }, 150);
    }
  };
}

// Hit Box Range Check
function checkHit(attacker, defender, targetTag) {
  const dist = attacker.position.distanceTo(defender.position);
  if (dist < 2.2) {
    if (targetTag === 'p2') {
      p2Health = Math.max(0, p2Health - 15);
      document.getElementById('p2-hp-bar').style.width = p2Health + '%';
      document.getElementById('p2-hp-text').innerText = p2Health + '%';
    } else {
      p1Health = Math.max(0, p1Health - 12);
      document.getElementById('p1-hp-bar').style.width = p1Health + '%';
      document.getElementById('p1-hp-text').innerText = p1Health + '%';
    }

    if (p1Health <= 0 || p2Health <= 0) {
      isRoundActive = false;
      window.handleRoundEnd(p1Health > 0 ? 'p1' : 'p2');
    }
  }
}

// Reset positions between rounds
window.restartRound = function() {
  p1Health = 100;
  p2Health = 100;
  document.getElementById('p1-hp-bar').style.width = '100%';
  document.getElementById('p2-hp-bar').style.width = '100%';
  document.getElementById('p1-hp-text').innerText = '100%';
  document.getElementById('p2-hp-text').innerText = '100%';

  if (player1) player1.position.set(-4, 0, 0);
  if (player2) player2.position.set(4, 0, 0);
  isRoundActive = true;
};

// Main 3D Animation Loop
function animate3D() {
  if (!renderer) return;
  requestAnimationFrame(animate3D);

  if (isRoundActive && player1 && player2) {
    // Player 1 Joystick Movement
    player1.position.x += joystickVector.x * 0.12;
    player1.position.x = Math.max(-12, Math.min(12, player1.position.x));

    // Player 1 Jumping Physics
    if (player1.userData.isJumping) {
      player1.position.y += player1.userData.velocityY;
      player1.userData.velocityY -= 0.02; // Gravity
      if (player1.position.y <= 0) {
        player1.position.y = 0;
        player1.userData.isJumping = false;
      }
    }

    // AI Opponent Logic
    const distToPlayer = player1.position.x - player2.position.x;
    if (Math.abs(distToPlayer) > 1.8) {
      player2.position.x += distToPlayer > 0 ? 0.04 : -0.04;
    } else if (Math.random() < 0.03) {
      // AI Random Attack
      checkHit(player2, player1, 'p1');
    }

    // Camera follow midpoint
    camera.position.x = (player1.position.x + player2.position.x) / 2;
  }

  renderer.render(scene, camera);
}

// Window Resize Handling
window.addEventListener('resize', () => {
  if (camera && renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});
