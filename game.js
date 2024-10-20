document.addEventListener('DOMContentLoaded', () => {
    const gamePage = document.getElementById('game-page');
    const gameContainer = document.getElementById('gameContainer');
    const startButton = document.getElementById('startButton');
    const livesDisplay = document.getElementById('lives');
    let gameIframe;
    let availableGames = 3;

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
        livesDisplay.innerHTML = '❤'.repeat(availableGames);
    }

    function startGame() {
        if (availableGames > 0) {
            availableGames--;
            updateAvailableGamesDisplay();
            startButton.style.display = 'none';
            if (gameIframe && gameIframe.contentWindow.main) {
                gameIframe.contentWindow.main();
            }
        }
    }

    startButton.addEventListener('click', startGame);

    window.addEventListener('message', (event) => {
        if (event.data === 'gameOver') {
            if (availableGames > 0) {
                startButton.style.display = 'block';
            } else {
                startButton.style.display = 'none';
                livesDisplay.innerHTML = 'Игры закончились';
            }
        }
    });

    document.querySelector('button[data-page="game"]').addEventListener('click', () => {
        if (gamePage.style.display !== 'none') {
            loadGame();
            updateAvailableGamesDisplay();
            if (availableGames > 0) {
                startButton.style.display = 'block';
            } else {
                startButton.style.display = 'none';
                livesDisplay.innerHTML = 'Игры закончились';
            }
        }
    });
});