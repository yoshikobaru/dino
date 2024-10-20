let totalDPS = parseInt(localStorage.getItem('totalDPS')) || 0;
let availableGames = parseInt(localStorage.getItem('availableGames')) || 5;
let nextHeartTime = parseInt(localStorage.getItem('nextHeartTime')) || Date.now() + 5 * 60 * 1000;

function updateTimer() {
    const now = Date.now();
    if (now >= nextHeartTime) {
        if (availableGames < 5) {
            availableGames++;
            localStorage.setItem('availableGames', availableGames);
        }
        nextHeartTime = now + 5 * 60 * 1000; // 5 минут
        localStorage.setItem('nextHeartTime', nextHeartTime);
    }
    
    const remainingTime = Math.ceil((nextHeartTime - now) / 1000);
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    
    return {
        time: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        availableGames: availableGames
    };
}

// Запускаем таймер обновления независимо от состояния DOM
setInterval(() => {
    const timerData = updateTimer();
    localStorage.setItem('availableGames', timerData.availableGames);
    if (document.getElementById('timer')) {
        document.getElementById('timer').textContent = `Следующее сердце через: ${timerData.time}`;
    }
    if (document.getElementById('lives')) {
        document.getElementById('lives').innerHTML = '❤️'.repeat(timerData.availableGames) + '🖤'.repeat(5 - timerData.availableGames);
    }
}, 1000);

document.addEventListener('DOMContentLoaded', () => {
    const gamePage = document.getElementById('game-page');
    const gameContainer = document.getElementById('gameContainer');
    const startButton = document.getElementById('startButton');
    const livesDisplay = document.getElementById('lives');
    const timerDisplay = document.createElement('div');
    timerDisplay.id = 'timer';
    livesDisplay.parentNode.insertBefore(timerDisplay, livesDisplay.nextSibling);
    
    let gameIframe;

    function loadGame() {
        if (!gameIframe) {
            gameIframe = document.createElement('iframe');
            gameIframe.src = 'game/index.html';
            gameIframe.style.width = '100%';
            gameIframe.style.height = '300px';
            gameIframe.style.border = 'none';
            gameContainer.appendChild(gameIframe);
        }
    }

    function updateAvailableGamesDisplay() {
        const timerData = updateTimer();
        livesDisplay.innerHTML = '❤️'.repeat(timerData.availableGames) + '🖤'.repeat(5 - timerData.availableGames);
        
        if (timerData.availableGames < 5) {
            timerDisplay.textContent = `Следующее сердце через: ${timerData.time}`;
            timerDisplay.style.display = 'block';
        } else {
            timerDisplay.style.display = 'none';
        }
    }

    function startGame() {
        if (availableGames > 0) {
            availableGames--;
            localStorage.setItem('availableGames', availableGames);
            updateAvailableGamesDisplay();
            startButton.style.display = 'none';
            if (gameIframe && gameIframe.contentWindow.main) {
                gameIframe.contentWindow.main();
            }
        }
    }

    startButton.addEventListener('click', startGame);

    window.addEventListener('message', (event) => {
        if (event.data.type === 'gameOver') {
            if (availableGames > 0) {
                startButton.style.display = 'block';
            } else {
                startButton.style.display = 'none';
                livesDisplay.innerHTML = 'Игры закончились';
            }
            
            // Добавляем очки к общему балансу
            const gameScore = event.data.score;
            totalDPS += gameScore;
            localStorage.setItem('totalDPS', totalDPS);
            updateTotalScore();
            
            // Показываем сообщение о полученных очках
            alert(`Вы заработали ${gameScore} DPS! Ваш новый баланс: ${totalDPS} DPS`);
        }
    });

    document.querySelector('button[data-page="game"]').addEventListener('click', () => {
        if (gamePage.style.display !== 'none') {
            loadGame();
            updateAvailableGamesDisplay();
            updateTimer();
            if (availableGames > 0) {
                startButton.style.display = 'block';
            } else {
                startButton.style.display = 'none';
                livesDisplay.innerHTML = 'Игры закончились';
            }
        }
    });
});

function updateTotalScore() {
    const totalScoreElement = document.querySelector('.text-3xl.font-bold.text-black');
    if (totalScoreElement) {
        totalScoreElement.textContent = `${totalDPS} DPS`;
    }
}

// Экспортируем функцию обновления счета, чтобы она была доступна в других файлах
window.updateTotalScore = updateTotalScore;
