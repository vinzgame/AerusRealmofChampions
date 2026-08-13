document.addEventListener('deviceready', function () {
    if (window.AndroidFullScreen) {
        // Hides status bar and bottom navigation bar completely
        AndroidFullScreen.immersiveMode(null, null);
    }
}, false);

// --- AERUS: REALM OF CHAMPIONS - FULL UI & AUTH SYSTEM ---




const appState = {
  currentUser: null,
  coins: 1000,
  selectedCharIndex: 0,
  p1Wins: 0,
  p2Wins: 0,
  currentRound: 1,
  characters: [
    {
      name: "Aerus Skyblade",
      desc: "Agile knight wielding a fast energy blade.",
      color: 0x38bdf8
    },
    {
      name: "Pyra Flamefist",
      desc: "Heavy striking brawler with explosive power.",
      color: 0xf97316
    }
  ]
};

// Screen Registry
const screens = {
  loading: document.getElementById('loading-screen'),
  auth: document.getElementById('auth-screen'),
  home: document.getElementById('home-screen'),
  game: document.getElementById('game-screen')
};

function switchScreen(targetKey) {
  Object.keys(screens).forEach(key => {
    if (screens[key]) {
      if (key === targetKey) {
        screens[key].classList.remove('hidden');
        screens[key].classList.add('active');
      } else {
        screens[key].classList.add('hidden');
        screens[key].classList.remove('active');
      }
    }
  });
}

// 1. INITIALIZATION & LOADING SCREEN
window.addEventListener('DOMContentLoaded', () => {
  let progress = 0;
  const bar = document.getElementById('loading-bar');
  const text = document.getElementById('loading-text');

  // Keep menu modal closed on boot
  const menuModal = document.getElementById('menu-modal');
  if (menuModal) menuModal.classList.add('hidden');

  const timer = setInterval(() => {
    progress += 2;
    if (bar) bar.style.width = progress + '%';
    if (text) text.innerText = `Loading Realm Assets... ${progress}%`;

    if (progress >= 100) {
      clearInterval(timer);
      switchScreen('auth');
    }
  }, 40);
});

// 2. AUTHENTICATION (SIGN IN & SIGN UP)
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignupBtn = document.getElementById('show-signup');
const showLoginBtn = document.getElementById('show-login');

if (showSignupBtn) {
  showSignupBtn.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
  });
}

if (showLoginBtn) {
  showLoginBtn.addEventListener('click', () => {
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });
}

if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const displayName = document.getElementById('signup-displayname').value;
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    const userObj = { displayName, username, password };
    localStorage.setItem(`user_${username}`, JSON.stringify(userObj));
    alert("Account created successfully! Please sign in.");
    
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const stored = localStorage.getItem(`user_${username}`);
    if (!stored) {
      alert("Account not found!");
      return;
    }

    const userObj = JSON.parse(stored);
    if (userObj.password !== password) {
      alert("Invalid credentials!");
      return;
    }

    appState.currentUser = userObj;

    // Set name tag on home screen
    const nameTag = document.getElementById('p1-display-name');
    if (nameTag) nameTag.innerText = userObj.displayName;

    // Transition to Home Screen (ensure menu is closed)
    const menuModal = document.getElementById('menu-modal');
    if (menuModal) menuModal.classList.add('hidden');

    switchScreen('home');
    updateHomeUI();
  });
}

// 3. HOME SCREEN & MENU MODAL TOGGLES
const charName = document.getElementById('char-name');
const charDesc = document.getElementById('char-desc');
const charPrevBtn = document.getElementById('char-prev');
const charNextBtn = document.getElementById('char-next');
const playBtn = document.getElementById('play-btn');

function updateHomeUI() {
  const current = appState.characters[appState.selectedCharIndex];
  if (charName) charName.innerText = current.name;
  if (charDesc) charDesc.innerText = current.desc;
  const coinsTag = document.getElementById('coin-count');
  if (coinsTag) coinsTag.innerText = appState.coins.toLocaleString();
}

if (charPrevBtn) {
  charPrevBtn.addEventListener('click', () => {
    appState.selectedCharIndex = (appState.selectedCharIndex - 1 + appState.characters.length) % appState.characters.length;
    updateHomeUI();
  });
}

if (charNextBtn) {
  charNextBtn.addEventListener('click', () => {
    appState.selectedCharIndex = (appState.selectedCharIndex + 1) % appState.characters.length;
    updateHomeUI();
  });
}

// Top-Left Menu Trigger & Modal Buttons
const menuBtn = document.getElementById('menu-btn');
const menuModal = document.getElementById('menu-modal');
const closeMenuBtn = document.getElementById('close-menu-btn');
const logoutBtn = document.getElementById('logout-btn');

if (menuBtn && menuModal) {
  menuBtn.addEventListener('click', () => menuModal.classList.remove('hidden'));
}

if (closeMenuBtn && menuModal) {
  closeMenuBtn.addEventListener('click', () => menuModal.classList.add('hidden'));
}

if (logoutBtn && menuModal) {
  logoutBtn.addEventListener('click', () => {
    menuModal.classList.add('hidden');
    appState.currentUser = null;
    switchScreen('auth');
  });
}

// 4. MATCH ENGINE LIFECYCLE
if (playBtn) {
  playBtn.addEventListener('click', () => {
    switchScreen('game');
    resetFullMatch();
    if (window.init3DGame) {
      window.init3DGame(appState.characters[appState.selectedCharIndex]);
    }
  });
}

function resetFullMatch() {
  appState.p1Wins = 0;
  appState.p2Wins = 0;
  appState.currentRound = 1;
  updateRoundUI();
}

function updateRoundUI() {
  const roundTag = document.getElementById('round-indicator');
  if (roundTag) roundTag.innerText = `ROUND ${appState.currentRound}`;

  const p1Dots = document.querySelectorAll('#p1-dots .dot');
  const p2Dots = document.querySelectorAll('#p2-dots .dot');

  p1Dots.forEach((dot, i) => dot.classList.toggle('won', i < appState.p1Wins));
  p2Dots.forEach((dot, i) => dot.classList.toggle('won', i < appState.p2Wins));
}

// Global Round Interceptor for game3d.js
window.handleRoundEnd = function(winner) {
  const roundModal = document.getElementById('round-result-modal');
  const roundImg = document.getElementById('round-result-img');

  if (winner === 'p1') {
    appState.p1Wins++;
    if (roundImg) roundImg.src = 'image/victory.png';
  } else {
    appState.p2Wins++;
    if (roundImg) roundImg.src = 'image/defeat.png';
  }

  updateRoundUI();
  if (roundModal) roundModal.classList.remove('hidden');

  setTimeout(() => {
    if (roundModal) roundModal.classList.add('hidden');

    if (appState.p1Wins >= 2 || appState.p2Wins >= 2) {
      handleMatchEnd(appState.p1Wins >= 2);
    } else {
      appState.currentRound++;
      updateRoundUI();
      if (window.restartRound) window.restartRound();
    }
  }, 2000);
};

function handleMatchEnd(playerWon) {
  const matchModal = document.getElementById('match-over-modal');
  const matchImg = document.getElementById('match-result-img');

  if (playerWon) {
    if (matchImg) matchImg.src = 'image/youwin.png';
    appState.coins += 250;
  } else {
    if (matchImg) matchImg.src = 'image/youlose.png';
  }

  if (matchModal) matchModal.classList.remove('hidden');
}

const rematchBtn = document.getElementById('rematch-btn');
const homeReturnBtn = document.getElementById('home-return-btn');

if (rematchBtn) {
  rematchBtn.addEventListener('click', () => {
    document.getElementById('match-over-modal').classList.add('hidden');
    resetFullMatch();
    if (window.restartRound) window.restartRound();
  });
}

if (homeReturnBtn) {
  homeReturnBtn.addEventListener('click', () => {
    document.getElementById('match-over-modal').classList.add('hidden');
    switchScreen('home');
    updateHomeUI();
  });
}



