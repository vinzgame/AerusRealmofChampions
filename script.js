// --- CORDOVA NATIVE IMMERSIVE FULLSCREEN HOOK ---
document.addEventListener('deviceready', function () {
    if (window.AndroidFullScreen) {
        AndroidFullScreen.immersiveMode(null, null);
    }
}, false);

// Characters Roster
const CHARACTERS = [
    { id: 'robot', name: 'UNIT-01 ROBOT', desc: 'Fast cybernetic hero with high agility and rapid energy strikes.' },
    { id: 'soldier', name: 'ARMORED SOLDIER', desc: 'Heavy combat warrior with high defense and heavy attacks.' }
];

let currentCharIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
    // Screen References
    const loadingScreen = document.getElementById('loading-screen');
    const homeScreen = document.getElementById('home-screen');
    const gameScreen = document.getElementById('game-screen');
    const matchModal = document.getElementById('match-over-modal');

    // Simulated Loading Bar
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += 20;
        const bar = document.getElementById('loading-bar');
        if (bar) bar.style.width = `${progress}%`;

        if (progress >= 100) {
            clearInterval(loadingInterval);
            loadingScreen.classList.add('hidden');
            homeScreen.classList.remove('hidden');
        }
    }, 150);

    // Character Selector
    const charName = document.getElementById('char-name');
    const charDesc = document.getElementById('char-desc');
    const charPrev = document.getElementById('char-prev');
    const charNext = document.getElementById('char-next');

    function updateCharacterDisplay() {
        const char = CHARACTERS[currentCharIndex];
        charName.innerText = char.name;
        charDesc.innerText = char.desc;
    }

    if (charPrev) {
        charPrev.onclick = () => {
            currentCharIndex = (currentCharIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
            updateCharacterDisplay();
        };
    }

    if (charNext) {
        charNext.onclick = () => {
            currentCharIndex = (currentCharIndex + 1) % CHARACTERS.length;
            updateCharacterDisplay();
        };
    }

    // Play Button
    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
        playBtn.onclick = () => {
            homeScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            
            // Start 3D Game Engine
            if (window.init3DGame) {
                window.init3DGame(CHARACTERS[currentCharIndex]);
            }
        };
    }

    // Match End Callback
    window.handleRoundEnd = function(winner) {
        setTimeout(() => {
            if (matchModal) {
                const title = document.getElementById('match-result-title');
                if (title) title.innerText = winner === 'p1' ? 'VICTORY!' : 'DEFEAT!';
                matchModal.classList.remove('hidden');
            }
        }, 500);
    };

    // Rematch Button
    const rematchBtn = document.getElementById('rematch-btn');
    if (rematchBtn) {
        rematchBtn.onclick = () => {
            matchModal.classList.add('hidden');
            if (window.restartRound) window.restartRound();
        };
    }

    // Return to Main Menu
    const homeReturnBtn = document.getElementById('home-return-btn');
    if (homeReturnBtn) {
        homeReturnBtn.onclick = () => {
            matchModal.classList.add('hidden');
            gameScreen.classList.add('hidden');
            homeScreen.classList.remove('hidden');
        };
    }
});
