/* ==========================================================================
   AERUS: REALM OF CHAMPIONS - APPLICATION ENGINE & STATE MANAGER
   ========================================================================== */

// --- GLOBAL AUDIO SYNTHESIZER ---
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.musicVol = 0.7;
        this.sfxVol = 0.8;
        this.isMuted = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, volMultiplier = 1) {
        if (this.isMuted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            
            const finalVol = this.sfxVol * volMultiplier;
            gain.gain.setValueAtTime(finalVol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    }

    playHit() { this.playTone(120, 'sawtooth', 0.15, 1.0); }
    playJump() { this.playTone(300, 'sine', 0.2, 0.5); }
    playClick() { this.playTone(600, 'triangle', 0.05, 0.3); }

    playVictory() {
        if (this.isMuted || !this.ctx) return;
        [440, 554, 659, 880].forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'sine', 0.4, 0.8), idx * 120);
        });
    }
}

const audio = new AudioEngine();

// --- GAME DATA & ROSTER ---
const CHAMPIONS_ROSTER = [
    { id: 'vanguard', name: 'VANGUARD', archetype: 'BALANCED WARRIOR', power: 7, speed: 7, defense: 7, desc: 'A versatile fighter skilled in balanced offensive and defensive combat style.' },
    { id: 'aura', name: 'AURA', archetype: 'FAST MAGICAL FIGHTER', power: 6, speed: 9, defense: 5, desc: 'Channels ethereal energy to strike enemies with immense speed.' },
    { id: 'titan', name: 'TITAN', archetype: 'HEAVY STRENGTH', power: 10, speed: 4, defense: 9, desc: 'A towering juggernaut dealing crushing physical strikes.' },
    { id: 'zephyr', name: 'ZEPHYR', archetype: 'EXTREMELY FAST', power: 5, speed: 10, defense: 4, desc: 'Swift wind assassin capable of endless aerial combos.' },
    { id: 'pyra', name: 'PYRA', archetype: 'FIRE WARRIOR', power: 9, speed: 6, defense: 6, desc: 'Burns opponents with flame-infused aggressive combos.' },
    { id: 'frost', name: 'FROST', archetype: 'ICE DEFENDER', power: 6, speed: 5, defense: 10, desc: 'Controls space with icy defense barriers and heavy counters.' },
    { id: 'volt', name: 'VOLT', archetype: 'LIGHTNING SPEED', power: 8, speed: 8, defense: 5, desc: 'Surges across the battlefield in thunderous quick bursts.' },
    { id: 'shade', name: 'SHADE', archetype: 'ASSASSIN', power: 8, speed: 9, defense: 4, desc: 'Strikes from shadow angles with lethal precision.' },
    { id: 'lumen', name: 'LUMEN', archetype: 'LIGHT CHAMPION', power: 7, speed: 8, defense: 7, desc: 'Radiant knight wielding light energy strikes.' },
    { id: 'drake', name: 'DRAKE', archetype: 'BEAST WARRIOR', power: 9, speed: 6, defense: 8, desc: 'Unleashes raw dragon-like fury in close-quarters melee.' }
];

// --- APP STATE MANAGER ---
const AppState = {
    selectedChar: CHAMPIONS_ROSTER[0],
    userProfile: {
        displayName: 'CHAMPION',
        level: 1,
        xp: 0,
        wins: 0,
        losses: 0,
        isLoggedIn: false
    },
    settings: {
        graphics: 'MEDIUM',
        difficulty: 'NORMAL',
        musicVol: 70,
        sfxVol: 80,
        isMuted: false,
        btnOpacity: 80
    }
};

// --- MAIN APPLICATION INIT ---
document.addEventListener('DOMContentLoaded', () => {
    // Ensure all overlays start hidden
    document.getElementById('victory-modal').classList.add('hidden');
    document.getElementById('defeat-modal').classList.add('hidden');

    loadLocalStorageData();
    setupNavigationEvents();
    setupAuthEvents();
    setupSettingsEvents();
    renderCharacterGrid();
    simulateLoadingProcess();
});

function loadLocalStorageData() {
    const savedProf = localStorage.getItem('aerus_profile');
    if (savedProf) {
        AppState.userProfile = JSON.parse(savedProf);
        updateProfileUI();
    }
    const savedSettings = localStorage.getItem('aerus_settings');
    if (savedSettings) {
        AppState.settings = JSON.parse(savedSettings);
        applySettingsToUI();
    }
}

function saveProfileData() {
    localStorage.setItem('aerus_profile', JSON.stringify(AppState.userProfile));
    updateProfileUI();
}

function updateProfileUI() {
    document.getElementById('nav-display-name').innerText = AppState.userProfile.displayName;
    document.getElementById('nav-level').innerText = `LVL ${AppState.userProfile.level}`;
    document.getElementById('profile-display-name-input').value = AppState.userProfile.displayName;
    document.getElementById('profile-level').innerText = AppState.userProfile.level;
    document.getElementById('profile-xp').innerText = AppState.userProfile.xp;
    document.getElementById('profile-wins').innerText = AppState.userProfile.wins;
    document.getElementById('profile-losses').innerText = AppState.userProfile.losses;
    document.getElementById('nav-auth-btn').innerText = AppState.userProfile.isLoggedIn ? 'LOGOUT' : 'SIGN IN';
}

function simulateLoadingProcess() {
    let progress = 0;
    const bar = document.getElementById('loading-bar');
    const pct = document.getElementById('loading-percentage');
    
    const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 5;
        if (progress > 100) progress = 100;
        
        bar.style.width = `${progress}%`;
        pct.innerText = `${progress}%`;

        if (progress === 100) {
            clearInterval(interval);
            setTimeout(() => {
                switchScreen('home-screen');
            }, 400);
        }
    }, 100);
}

function switchScreen(screenId) {
    audio.playClick();
    document.querySelectorAll('.screen').forEach(s => {
        if (s.id !== 'orientation-overlay') s.classList.add('hidden');
    });
    const target = document.getElementById(screenId);
    if (target) target.classList.remove('hidden');
}

function setupNavigationEvents() {
    document.getElementById('play-btn').onclick = () => switchScreen('character-select-screen');
    document.getElementById('champions-btn').onclick = () => switchScreen('character-select-screen');
    document.getElementById('profile-btn').onclick = () => switchScreen('profile-screen');
    document.getElementById('settings-btn').onclick = () => switchScreen('settings-screen');
    document.getElementById('open-profile-btn').onclick = () => switchScreen('profile-screen');
    
    document.getElementById('char-back-btn').onclick = () => switchScreen('home-screen');
    document.getElementById('profile-back-btn').onclick = () => switchScreen('home-screen');
    document.getElementById('settings-back-btn').onclick = () => switchScreen('home-screen');

    document.getElementById('confirm-char-btn').onclick = () => {
        switchScreen('game-screen');
        if (window.start3DMatch) {
            window.start3DMatch(AppState.selectedChar, AppState.settings);
        }
    };

    document.getElementById('fullscreen-btn').onclick = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    ['victory-rematch-btn', 'defeat-rematch-btn'].forEach(id => {
        document.getElementById(id).onclick = () => {
            document.getElementById('victory-modal').classList.add('hidden');
            document.getElementById('defeat-modal').classList.add('hidden');
            if (window.restart3DMatch) window.restart3DMatch();
        };
    });

    ['victory-home-btn', 'defeat-home-btn'].forEach(id => {
        document.getElementById(id).onclick = () => {
            document.getElementById('victory-modal').classList.add('hidden');
            document.getElementById('defeat-modal').classList.add('hidden');
            switchScreen('home-screen');
        };
    });

    ['victory-char-select-btn', 'defeat-char-select-btn'].forEach(id => {
        document.getElementById(id).onclick = () => {
            document.getElementById('victory-modal').classList.add('hidden');
            document.getElementById('defeat-modal').classList.add('hidden');
            switchScreen('character-select-screen');
        };
    });
}

function renderCharacterGrid() {
    const grid = document.getElementById('character-grid');
    grid.innerHTML = '';

    CHAMPIONS_ROSTER.forEach((char, index) => {
        const card = document.createElement('div');
        card.className = `char-card ${index === 0 ? 'selected' : ''}`;
        card.innerHTML = `
            <div class="char-card-avatar">🛡️</div>
            <div class="char-card-name">${char.name}</div>
        `;

        card.onclick = () => {
            audio.playClick();
            document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectChampion(char);
        };

        grid.appendChild(card);
    });

    selectChampion(CHAMPIONS_ROSTER[0]);
}

function selectChampion(char) {
    AppState.selectedChar = char;
    document.getElementById('char-detail-name').innerText = char.name;
    document.getElementById('char-detail-archetype').innerText = char.archetype;
    document.getElementById('char-detail-desc').innerText = char.desc;
    
    document.getElementById('stat-power').style.width = `${char.power * 10}%`;
    document.getElementById('stat-speed').style.width = `${char.speed * 10}%`;
    document.getElementById('stat-defense').style.width = `${char.defense * 10}%`;
}

function setupAuthEvents() {
    const authBtn = document.getElementById('nav-auth-btn');
    const authScreen = document.getElementById('auth-screen');
    const closeBtn = document.getElementById('auth-close-btn');

    authBtn.onclick = () => {
        if (AppState.userProfile.isLoggedIn) {
            AppState.userProfile.isLoggedIn = false;
            saveProfileData();
        } else {
            authScreen.classList.remove('hidden');
        }
    };

    closeBtn.onclick = () => authScreen.classList.add('hidden');

    document.getElementById('switch-to-register').onclick = () => {
        document.getElementById('login-form-box').classList.add('hidden');
        document.getElementById('register-form-box').classList.remove('hidden');
    };

    document.getElementById('switch-to-login').onclick = () => {
        document.getElementById('register-form-box').classList.add('hidden');
        document.getElementById('login-form-box').classList.remove('hidden');
    };

    document.getElementById('submit-login-btn').onclick = () => {
        const email = document.getElementById('login-email').value;
        if (email) {
            AppState.userProfile.displayName = email.split('@')[0].toUpperCase();
            AppState.userProfile.isLoggedIn = true;
            saveProfileData();
            authScreen.classList.add('hidden');
        }
    };

    document.getElementById('submit-register-btn').onclick = () => {
        const regName = document.getElementById('reg-name').value;
        if (regName) {
            AppState.userProfile.displayName = regName.toUpperCase();
            AppState.userProfile.isLoggedIn = true;
            saveProfileData();
            authScreen.classList.add('hidden');
        }
    };

    document.getElementById('save-display-name-btn').onclick = () => {
        const newName = document.getElementById('profile-display-name-input').value;
        if (newName) {
            AppState.userProfile.displayName = newName;
            saveProfileData();
        }
    };

    document.getElementById('signout-btn').onclick = () => {
        AppState.userProfile.isLoggedIn = false;
        saveProfileData();
        switchScreen('home-screen');
    };
}

function setupSettingsEvents() {
    document.querySelectorAll('.seg-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            AppState.settings.graphics = btn.dataset.quality;
            saveSettings();
        };
    });

    document.getElementById('music-vol-slider').oninput = (e) => {
        AppState.settings.musicVol = parseInt(e.target.value);
        saveSettings();
    };

    document.getElementById('sfx-vol-slider').oninput = (e) => {
        AppState.settings.sfxVol = parseInt(e.target.value);
        audio.sfxVol = AppState.settings.sfxVol / 100;
        saveSettings();
    };

    document.getElementById('mute-toggle').onchange = (e) => {
        AppState.settings.isMuted = e.target.checked;
        audio.isMuted = AppState.settings.isMuted;
        saveSettings();
    };

    document.getElementById('ai-difficulty-select').onchange = (e) => {
        AppState.settings.difficulty = e.target.value;
        saveSettings();
    };

    document.getElementById('btn-opacity-slider').oninput = (e) => {
        AppState.settings.btnOpacity = e.target.value;
        document.getElementById('touch-controls-layer').style.opacity = e.target.value / 100;
        saveSettings();
    };
}

function saveSettings() {
    localStorage.setItem('aerus_settings', JSON.stringify(AppState.settings));
}

function applySettingsToUI() {
    document.querySelectorAll('.seg-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.quality === AppState.settings.graphics);
    });
    document.getElementById('music-vol-slider').value = AppState.settings.musicVol;
    document.getElementById('sfx-vol-slider').value = AppState.settings.sfxVol;
    document.getElementById('mute-toggle').checked = AppState.settings.isMuted;
    document.getElementById('ai-difficulty-select').value = AppState.settings.difficulty;
    document.getElementById('btn-opacity-slider').value = AppState.settings.btnOpacity;
    document.getElementById('touch-controls-layer').style.opacity = AppState.settings.btnOpacity / 100;
    
    audio.isMuted = AppState.settings.isMuted;
    audio.sfxVol = AppState.settings.sfxVol / 100;
}

window.onMatchComplete = function(result) {
    if (result === 'VICTORY') {
        AppState.userProfile.wins++;
        AppState.userProfile.xp += 150;
        if (AppState.userProfile.xp >= AppState.userProfile.level * 300) {
            AppState.userProfile.level++;
        }
        audio.playVictory();
        saveProfileData();
        document.getElementById('victory-modal').classList.remove('hidden');
    } else {
        AppState.userProfile.losses++;
        saveProfileData();
        document.getElementById('defeat-modal').classList.remove('hidden');
    }
};
