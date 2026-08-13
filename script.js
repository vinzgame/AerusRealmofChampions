// --- AERUS GAME STATE & UI NAVIGATION ENGINE ---

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

// DOM References
const screens = {
  loading: document.getElementById('loading-screen'),
  auth: document.getElementById('auth-screen'),
  home: document.getElementById('home-screen'),
  game: document.getElementById('game-screen')
};

function switchScreen(screenKey) {
  Object.keys(screens).forEach(key => {
    if (key === screenKey) {
      screens[key].classList.remove('hidden');
      screens[key].classList.add('active');
    } else {
      screens[key].classList.add('hidden');
      screens[key].classList.remove('active');
    }
  });
}

// 1. LOADING SCREEN LOGIC (4-5 Seconds)
window.addEventListener('DOMContentLoaded', () => {
  let progress = 0;
  const bar = document.getElementById('loading-bar');
  const text = document.getElementById('loading-text');

  const interval = setInterval(() => {
    progress += 2;
    bar.style.width = progress + '%';
    text.innerText = `Loading Realm Assets... ${progress}%`;

    if (progress >= 100) {
      clearInterval(interval);
      switchScreen('auth');
    }
  }, 90); // ~4.5 Seconds Total
});

// 2. AUTHENTICATION LOGIC (Client Storage)
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');

showSignup.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  signupForm.classList.remove('hidden');
});

showLogin.addEventListener('click', () => {
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const displayName = document.getElementById('signup-displayname').value;
  const username = document.getElementById('signup-username').value;
  const password = document.getElementById('signup-password').value;
  const repeatPassword = document.getElementById('signup-repeat-password').value;

  if (password !== repeatPassword) {
    alert("Passwords do not match!");
    return;
  }

  const userObj = { displayName, username, password };
  localStorage.setItem(`user_${username}`, JSON.stringify(userObj));
  alert("Account created successfully! Please sign in.");
  signupForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  const stored = localStorage.getItem(`user_${username}`);
  if (!stored) {
    alert("User not found!");
    return;
  }

  const userObj = JSON.parse(stored);
  if (userObj.password !== password) {
    alert("Incorrect password!");
    return;
  }

  appState.currentUser = userObj;
  document.getElementById('p1-display-name').innerText = userObj.displayName;
  switchScreen('home');
  updateHomeUI();
});

// 3. HOME SCREEN & CHARACTER SELECTION
const charName = document.getElementById('char-name');
const charDesc = document.getElementById('char-desc');
const charPrevBtn = document.getElementById('char-prev');
const charNextBtn = document.getElementById('char-next');
const playBtn = document.getElementById('play-btn');

function updateHomeUI() {
  const current = appState.characters[appState.selectedCharIndex];
  charName.innerText = current.name;
  charDesc.innerText = current.desc;
  document.getElementById('coin-count').innerText = appState.coins.toLocaleString();
}

charPrevBtn.addEventListener('click', () => {
  appState.selectedCharIndex = (appState.selectedCharIndex - 1 + appState.characters.length) % appState.characters.length;
  updateHomeUI();
});

charNextBtn.addEventListener('click', () => {
  appState.selectedCharIndex = (appState.selectedCharIndex + 1) % appState.characters.length;
  updateHomeUI();
});

// Home Menu Modal Toggle
const menuBtn = document.getElementById('menu-btn');
const menuModal = document.getElementById('menu-modal');
const closeMenuBtn = document.getElementById('close-menu-btn');
const logoutBtn = document.getElementById('logout-btn');

menuBtn.addEventListener('click', () => menuModal.classList.remove('hidden'));
closeMenuBtn.addEventListener('click', () => menuModal.classList.add('hidden'));
logoutBtn.addEventListener('click', () => {
  menuModal.classList.add('hidden');
  appState.currentUser = null;
  switchScreen('auth');
});

// 4. MATCH START & ROUND SYSTEM
playBtn.addEventListener('click', () => {
  switchScreen('game');
  resetFullMatch();
  if (window.init3DGame) {
    window.init3DGame(appState.characters[appState.selectedCharIndex]);
  }
});

function resetFullMatch() {
  appState.p1Wins = 0;
  appState.p2Wins = 0;
  appState.currentRound = 1;
  updateRoundUI();
}

function updateRoundUI() {
  document.getElementById('round-indicator').innerText = `ROUND ${appState.currentRound}`;
  
  // Update Score Dots
  const p1Dots = document.querySelectorAll('#p1-dots .dot');
  const p2Dots = document.querySelectorAll('#p2-dots .dot');

  p1Dots.forEach((dot, idx) => dot.classList.toggle('won', idx < appState.p1Wins));
  p2Dots.forEach((dot, idx) => dot.classList.toggle('won', idx < appState.p2Wins));
}

// Global Round/Match Handlers invoked by 3D Engine
window.handleRoundEnd = function(winner) {
  const roundModal = document.getElementById('round-result-modal');
  const roundImg = document.getElementById('round-result-img');

  if (winner === 'p1') {
    appState.p1Wins++;
    roundImg.src = 'image/victory.png';
  } else {
    appState.p2Wins++;
    roundImg.src = 'image/defeat.png';
  }

  updateRoundUI();
  roundModal.classList.remove('hidden');

  setTimeout(() => {
    roundModal.classList.add('hidden');

    // Check if someone won 2 rounds total
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
    matchImg.src = 'image/youwin.png';
    appState.coins += 250; // Reward coins on win
  } else {
    matchImg.src = 'image/youlose.png';
  }

  matchModal.classList.remove('hidden');
}

document.getElementById('rematch-btn').addEventListener('click', () => {
  document.getElementById('match-over-modal').classList.add('hidden');
  resetFullMatch();
  if (window.restartRound) window.restartRound();
});

document.getElementById('home-return-btn').addEventListener('click', () => {
  document.getElementById('match-over-modal').classList.add('hidden');
  switchScreen('home');
  updateHomeUI();
});
