/* ==========================================================================
   AERUS: REALM OF CHAMPIONS - THREE.JS COMBAT ENGINE
   ========================================================================== */

let scene, camera, renderer;
let p1Mesh, p2Mesh;
let matchTimer = 60;
let timerInterval = null;
let isMatchActive = false;

let p1State = { hp: 100, x: -2.5, y: 0, isJumping: false, vy: 0, isBlocking: false };
let p2State = { hp: 100, x: 2.5, y: 0, isJumping: false, vy: 0, isBlocking: false };

const joystickInput = { x: 0, y: 0 };
let currentSelectedHero = null;
let matchDifficulty = 'NORMAL';

window.start3DMatch = function(selectedHero, settings) {
    currentSelectedHero = selectedHero;
    matchDifficulty = settings.difficulty || 'NORMAL';
    isMatchActive = true;
    
    audio.init();

    const container = document.getElementById('game-canvas-container');
    container.innerHTML = '';

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050b14);
    scene.fog = new THREE.FogExp2(0x050b14, 0.03);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2.5, 8);

    renderer = new THREE.WebGLRenderer({ antialias: settings.graphics !== 'LOW' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = settings.graphics !== 'LOW';
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x00f0ff, 2, 15);
    cyanLight.position.set(-4, 3, 2);
    scene.add(cyanLight);

    const goldLight = new THREE.PointLight(0xffb700, 2, 15);
    goldLight.position.set(4, 3, 2);
    scene.add(goldLight);

    build3DArena();
    buildFighters();
    setupJoystickControls();
    setupActionButtons();
    startMatchTimer();

    animate3DScene();
};

function build3DArena() {
    const floorGeo = new THREE.CylinderGeometry(8, 8, 0.4, 32);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0c1428, roughness: 0.3, metalness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    scene.add(floor);

    const ringGeo = new THREE.TorusGeometry(8.05, 0.08, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
}

function buildFighters() {
    p1State = { hp: 100, x: -2.5, y: 0, isJumping: false, vy: 0, isBlocking: false };
    p2State = { hp: 100, x: 2.5, y: 0, isJumping: false, vy: 0, isBlocking: false };

    const p1Geo = new THREE.CapsuleGeometry(0.5, 1.2, 4, 8);
    const p1Mat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, roughness: 0.2 });
    p1Mesh = new THREE.Mesh(p1Geo, p1Mat);
    p1Mesh.position.set(p1State.x, 1, 0);
    scene.add(p1Mesh);

    const p2Geo = new THREE.CapsuleGeometry(0.5, 1.2, 4, 8);
    const p2Mat = new THREE.MeshStandardMaterial({ color: 0xff0055, roughness: 0.2 });
    p2Mesh = new THREE.Mesh(p2Geo, p2Mat);
    p2Mesh.position.set(p2State.x, 1, 0);
    scene.add(p2Mesh);

    document.getElementById('p1-hp-fill').style.width = '100%';
    document.getElementById('p2-hp-fill').style.width = '100%';
    document.getElementById('p1-hp-num').innerText = '100%';
    document.getElementById('p2-hp-num').innerText = '100%';
    document.getElementById('p1-hud-name').innerText = currentSelectedHero ? currentSelectedHero.name : 'PLAYER 1';
}

function setupJoystickControls() {
    const boundary = document.getElementById('joystick-boundary');
    const knob = document.getElementById('joystick-knob');
    if (!boundary || !knob) return;

    let touchId = null;
    const maxRadius = 35;

    function moveKnob(clientX, clientY) {
        const rect = boundary.getBoundingClientRect();
        let dx = clientX - (rect.left + rect.width / 2);
        let dy = clientY - (rect.top + rect.height / 2);
        let dist = Math.hypot(dx, dy);

        if (dist > maxRadius) {
            dx = (dx / dist) * maxRadius;
            dy = (dy / dist) * maxRadius;
        }

        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        joystickInput.x = dx / maxRadius;
        joystickInput.y = dy / maxRadius;
    }

    boundary.ontouchstart = (e) => {
        const t = e.changedTouches[0];
        touchId = t.identifier;
        moveKnob(t.clientX, t.clientY);
    };

    window.ontouchmove = (e) => {
        for (let t of e.changedTouches) {
            if (t.identifier === touchId) moveKnob(t.clientX, t.clientY);
        }
    };

    const resetKnob = () => {
        touchId = null;
        knob.style.transform = 'translate(0px, 0px)';
        joystickInput.x = 0;
        joystickInput.y = 0;
    };

    window.ontouchend = resetKnob;
    window.ontouchcancel = resetKnob;
}

function setupActionButtons() {
    document.getElementById('btn-light').onclick = () => performAttack('light');
    document.getElementById('btn-heavy').onclick = () => performAttack('heavy');
    document.getElementById('btn-special').onclick = () => performAttack('special');

    document.getElementById('btn-jump').onclick = () => {
        if (!p1State.isJumping) {
            audio.playJump();
            p1State.isJumping = true;
            p1State.vy = 0.22;
        }
    };

    const blockBtn = document.getElementById('btn-block');
    blockBtn.ontouchstart = () => { p1State.isBlocking = true; };
    blockBtn.ontouchend = () => { p1State.isBlocking = false; };
    blockBtn.onmousedown = () => { p1State.isBlocking = true; };
    blockBtn.onmouseup = () => { p1State.isBlocking = false; };
}

function performAttack(type) {
    if (!isMatchActive || p1State.hp <= 0) return;

    let damage = 8;
    if (type === 'heavy') damage = 16;
    if (type === 'special') damage = 25;

    p1Mesh.position.x += 0.4;
    setTimeout(() => { if (p1Mesh) p1Mesh.position.x = p1State.x; }, 100);

    const dist = Math.abs(p1State.x - p2State.x);
    if (dist < 1.8) {
        audio.playHit();
        let finalDamage = damage;
        if (p2State.isBlocking) finalDamage *= 0.2;

        p2State.hp = Math.max(0, p2State.hp - finalDamage);
        document.getElementById('p2-hp-fill').style.width = `${p2State.hp}%`;
        document.getElementById('p2-hp-num').innerText = `${Math.ceil(p2State.hp)}%`;

        if (p2State.hp <= 0) {
            endMatch('VICTORY');
        }
    }
}

function startMatchTimer() {
    matchTimer = 60;
    document.getElementById('match-timer').innerText = matchTimer;
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (!isMatchActive) return;
        matchTimer--;
        document.getElementById('match-timer').innerText = matchTimer;

        if (matchTimer <= 0) {
            clearInterval(timerInterval);
            endMatch(p1State.hp >= p2State.hp ? 'VICTORY' : 'DEFEAT');
        }
    }, 1000);
}

function updateCpuAI() {
    if (!isMatchActive || p2State.hp <= 0 || p1State.hp <= 0) return;

    const dist = p1State.x - p2State.x;
    const speed = matchDifficulty === 'HARD' ? 0.05 : 0.03;

    if (Math.abs(dist) > 1.4) {
        p2State.x += dist > 0 ? speed : -speed;
    } else {
        if (Math.random() < 0.03) {
            p2Mesh.position.x -= 0.3;
            setTimeout(() => { if (p2Mesh) p2Mesh.position.x = p2State.x; }, 100);

            let dmg = matchDifficulty === 'HARD' ? 12 : 7;
            if (p1State.isBlocking) dmg *= 0.2;

            p1State.hp = Math.max(0, p1State.hp - dmg);
            audio.playHit();
            document.getElementById('p1-hp-fill').style.width = `${p1State.hp}%`;
            document.getElementById('p1-hp-num').innerText = `${Math.ceil(p1State.hp)}%`;

            if (p1State.hp <= 0) {
                endMatch('DEFEAT');
            }
        }
    }
}

function animate3DScene() {
    if (!renderer || !isMatchActive) return;
    requestAnimationFrame(animate3DScene);

    p1State.x += joystickInput.x * 0.08;
    p1State.x = Math.max(-6, Math.min(6, p1State.x));

    if (p1State.isJumping) {
        p1State.y += p1State.vy;
        p1State.vy -= 0.015;
        if (p1State.y <= 0) {
            p1State.y = 0;
            p1State.isJumping = false;
        }
    }

    if (p1Mesh) {
        p1Mesh.position.x = p1State.x;
        p1Mesh.position.y = 1 + p1State.y;
    }

    updateCpuAI();
    if (p2Mesh) {
        p2Mesh.position.x = p2State.x;
    }

    if (camera && p1Mesh && p2Mesh) {
        camera.position.x = (p1State.x + p2State.x) / 2;
    }

    renderer.render(scene, camera);
}

function endMatch(result) {
    isMatchActive = false;
    if (timerInterval) clearInterval(timerInterval);
    if (window.onMatchComplete) {
        window.onMatchComplete(result);
    }
}

window.restart3DMatch = function() {
    if (currentSelectedHero) {
        window.start3DMatch(currentSelectedHero, { difficulty: matchDifficulty });
    }
};

window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});
