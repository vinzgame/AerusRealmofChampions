// --- AERUS: REALM OF CHAMPIONS - 3D HERO MODEL ENGINE ---

let scene, camera, renderer;
let player1, player2;
let p1Health = 100, p2Health = 100;
let isRoundActive = false;

const joystickVector = { x: 0, y: 0 };
let isAttacking = false;

// Initialize 3D Scene
window.init3DGame = function(selectedChar) {
  const container = document.getElementById('game-canvas-container');
  if (!container) return;
  container.innerHTML = '';

  // Scene & Camera Setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0f1d);
  scene.fog = new THREE.FogExp2(0x0a0f1d, 0.02);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 3, 10);

  // WebGL Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Scene Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
  dirLight.position.set(5, 12, 8);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Arena Floor
  const groundGeo = new THREE.PlaneGeometry(30, 10);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Load 3D Character Models from Public Hosted Links
  loadHeroCharacters(selectedChar);

  // Setup Mobile Controls
  setupJoystick();
  setupActionButtons();

  isRoundActive = true;
  animate3D();
};

function loadHeroCharacters(selectedChar) {
  const loader = new THREE.GLTFLoader();

  // Hosted public 3D character links (No local downloads needed)
  const p1ModelUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb';
  const p2ModelUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb';

  // Load Player 1 Hero (Robot Champion)
  loader.load(
    p1ModelUrl,
    (gltf) => {
      player1 = gltf.scene;
      player1.scale.set(0.4, 0.4, 0.4);
      player1.position.set(-3, 0, 0);
      player1.rotation.y = Math.PI / 2;
      player1.userData = { velocityY: 0, isJumping: false, facingRight: true };

      player1.traverse(child => { if (child.isMesh) child.castShadow = true; });
      scene.add(player1);
    },
    undefined,
    (error) => {
      console.warn("Failed loading P1 model, loading fallback mesh.", error);
      player1 = createFallbackHeroMesh(0x38bdf8, -3, true);
    }
  );

  // Load Player 2 Hero (Enemy Soldier)
  loader.load(
    p2ModelUrl,
    (gltf) => {
      player2 = gltf.scene;
      player2.scale.set(1.2, 1.2, 1.2);
      player2.position.set(3, 0, 0);
      player2.rotation.y = -Math.PI / 2;
      player2.userData = { velocityY: 0, isJumping: false, facingRight: false };

      player2.traverse(child => { if (child.isMesh) child.castShadow = true; });
      scene.add(player2);
    },
    undefined,
    (error) => {
      console.warn("Failed loading P2 model, loading fallback mesh.", error);
      player2 = createFallbackHeroMesh(0xe11d48, 3, false);
    }
  );
}

// Fallback Mesh if Connection Fails
function createFallbackHeroMesh(colorHex, startX, facingRight) {
  const group = new THREE.Group();

  const torsoGeo = new THREE.CylinderGeometry(0.4, 0.25, 1.4, 8);
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3 });
  const torso = new THREE.Mesh(torsoGeo, mat);
  torso.position.y = 1.3;
  group.add(torso);

  const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
  const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
  head.position.y = 2.2;
  group.add(head);

  group.position.set(startX, 0, 0);
  if (!facingRight) group.rotation.y = Math.PI;
  group.userData = { velocityY: 0, isJumping: false, facingRight: facingRight };
  scene.add(group);
  return group;
}

// Touch Joystick Movement
function setupJoystick() {
  const base = document.getElementById('joystick-base');
  const stick = document.getElementById('joystick-stick');
  if (!base || !stick) return;

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
  };

  window.addEventListener('touchend', resetJoystick);
  window.addEventListener('touchcancel', resetJoystick);
}

// Action Buttons
function setupActionButtons() {
  const jumpBtn = document.getElementById('btn-jump');
  const attackBtn = document.getElementById('btn-attack');

  if (jumpBtn) {
    jumpBtn.onclick = () => {
      if (player1 && !player1.userData.isJumping) {
        player1.userData.velocityY = 0.3;
        player1.userData.isJumping = true;
      }
    };
  }

  if (attackBtn) {
    attackBtn.onclick = () => {
      if (player1 && !isAttacking) {
        isAttacking = true;
        // Attack displacement forward
        player1.position.x += player1.userData.facingRight ? 0.5 : -0.5;
        checkHit(player1, player2, 'p2');

        setTimeout(() => {
          if (player1) player1.position.x -= player1.userData.facingRight ? 0.5 : -0.5;
          isAttacking = false;
        }, 150);
      }
    };
  }
}

// Damage & Hit Logic
function checkHit(attacker, defender, targetTag) {
  if (!attacker || !defender) return;
  const dist = attacker.position.distanceTo(defender.position);
  
  if (dist < 2.2) {
    if (targetTag === 'p2') {
      p2Health = Math.max(0, p2Health - 15);
      const bar = document.getElementById('p2-hp-bar');
      const text = document.getElementById('p2-hp-text');
      if (bar) bar.style.width = p2Health + '%';
      if (text) text.innerText = p2Health + '%';
    } else {
      p1Health = Math.max(0, p1Health - 12);
      const bar = document.getElementById('p1-hp-bar');
      const text = document.getElementById('p1-hp-text');
      if (bar) bar.style.width = p1Health + '%';
      if (text) text.innerText = p1Health + '%';
    }

    if (p1Health <= 0 || p2Health <= 0) {
      isRoundActive = false;
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

// Game Loop
function animate3D() {
  if (!renderer) return;
  requestAnimationFrame(animate3D);

  if (isRoundActive && player1 && player2) {
    // Player Joystick Movement
    player1.position.x += joystickVector.x * 0.1;
    player1.position.x = Math.max(-10, Math.min(10, player1.position.x));

    // Jump Gravity Physics
    if (player1.userData.isJumping) {
      player1.position.y += player1.userData.velocityY;
      player1.userData.velocityY -= 0.018;
      if (player1.position.y <= 0) {
        player1.position.y = 0;
        player1.userData.isJumping = false;
      }
    }

    // AI Enemy Behavior
    const dist = player1.position.x - player2.position.x;
    if (Math.abs(dist) > 1.6) {
      player2.position.x += dist > 0 ? 0.035 : -0.035;
    } else if (Math.random() < 0.025) {
      checkHit(player2, player1, 'p1');
    }

    // Dynamic Camera Tracking
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
