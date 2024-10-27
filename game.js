let totalDPS = parseInt(localStorage.getItem('totalDPS')) || 0;
//let totalGameEarnings = parseInt(localStorage.getItem('totalGameEarnings')) || 0;
let availableGames = parseInt(localStorage.getItem('availableGames')) || 0; // Изменено: начальное значение
let nextHeartTime = parseInt(localStorage.getItem('nextHeartTime')) || Date.now(); // Устанавливаем начальное значение

// Убедимся, что при 0 сердцах они остаются 0
if (availableGames === 0) {
    availableGames = 0; // Сохраняем 0 при обновлении
}

// Добавляем переменную для отслеживания состояния таймера
let timerActive = false; // Состояние таймера

// Массив для хранения таймеров каждого сердца
let heartTimers = [];
let lastHeartRecoveryTime = 0;

// В начале файла добавьте:
let tasks = JSON.parse(localStorage.getItem('dailyTasks')) || { daily: [] };

// Добавьте в начало файла:
let playedCount = parseInt(localStorage.getItem('playedCount')) || 0;

// Добавляем новые переменные для отслеживания прогресса
let gameProgress = parseInt(localStorage.getItem('gameProgress')) || 0;
let gameTaskTimer = null;
let gameTaskStartTime = parseInt(localStorage.getItem('gameTaskStartTime')) || 0;

// Функция для обновления таймера
function updateTimer() {
    const now = Date.now();
    let updated = false;

    // Проверяем, прошло ли 20 секунд с момента последнего восстановления сердца
    if (heartTimers.length > 0 && now - lastHeartRecoveryTime >= 20000) {
        if (availableGames < 5) {
            availableGames++;
            updated = true;
        }
        heartTimers.shift(); // Удаляем первый элемент
        lastHeartRecoveryTime = now; // Обновляем время последнего восстановления
    }

    if (updated) {
        saveGameState();
    }

    // Вычисляем оставшееся время до следующего восстановления
    const nextRecoveryTime = lastHeartRecoveryTime + 20000;
    const remainingTime = Math.max(0, Math.ceil((nextRecoveryTime - now) / 1000));
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;

    return {
        time: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        availableGames: availableGames
    };
}

// Запускаем таймер обновления независимо от состояния DOM
let timerInterval = setInterval(() => {
    const timerData = updateTimer();
    
    if (document.getElementById('timer')) {
        document.getElementById('timer').textContent = availableGames < 5 ? `Следующее сердце через: ${timerData.time}` : '';
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

    function updateAvailableGames() {
        const availableGamesElement = document.querySelector('#lives'); // Исправл: добавлен id 'lives'
        
        if (availableGamesElement) {
            availableGamesElement.innerHTML = '❤️'.repeat(availableGames) + '🖤'.repeat(5 - availableGames);
        }
    }

    function updateAvailableGamesDisplay() {
        const timerData = updateTimer();
        livesDisplay.innerHTML = '❤️'.repeat(timerData.availableGames) + '🖤'.repeat(5 - timerData.availableGames);
        
        if (timerData.availableGames < 5) {
            timerDisplay.textContent = `Следующее сердце через: ${timerData.time}`;
            timerDisplay.style.display = 'block';
        } else {
            timerDisplay.style.display = 'none'; // Скрываем таймер, если 5 сердец
        }
    }

    function startGame() {
        if (availableGames > 0) {
            const taskCooldown = parseInt(localStorage.getItem('gameTaskCooldown')) || 0;
            const currentTime = Date.now();
            
            availableGames--;
            heartTimers.push(Date.now());
            if (heartTimers.length === 1) {
                lastHeartRecoveryTime = Date.now();
            }
            
            // Обновляем прогресс только если нет активного кулдауна
            if (taskCooldown <= currentTime) {
                gameProgress = parseInt(localStorage.getItem('gameProgress')) || 0;
                
                if (gameProgress === 0) {
                    gameTaskStartTime = Date.now();
                    localStorage.setItem('gameTaskStartTime', gameTaskStartTime);
                    startGameTaskTimer();
                }
                
                if (gameProgress < 5) {
                    gameProgress++;
                    localStorage.setItem('gameProgress', gameProgress.toString());
                }
            }
            
            saveGameState();
            updateAvailableGamesDisplay();
            startButton.style.display = 'none';
            
            if (gameIframe && gameIframe.contentWindow) {
                gameIframe.contentWindow.postMessage({ type: 'slowDown' }, '*');
                gameIframe.contentWindow.main();
            }
            
            playedCount++;
            localStorage.setItem('playedCount', playedCount.toString());
            updatePlayedCountTask();
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
            let totalGameEarnings = parseInt(localStorage.getItem('totalGameEarnings')) || 0;
            totalGameEarnings += gameScore;
            localStorage.setItem('totalDPS', totalDPS);
            localStorage.setItem('totalGameEarnings', totalGameEarnings);
            
            // Обновляем отображение сразу после окончания игры
            updateTotalScore();
            updateGameEarningsDisplay();
            updateGameScoreDisplay();
            
            // Показываем сообщение о полученных очках
            alert(`Вы заработали ${gameScore} DPS! Ваш новый баланс: ${totalDPS} DPS`);
            
            updatePlayedCountTask();

            // Проверяем, не установлен ли новый рекорд
            const highScore = parseInt(localStorage.getItem('project.github.chrome_dino.high_score')) || 0;
            if (gameScore > highScore) {
                localStorage.setItem('project.github.chrome_dino.high_score', gameScore.toString());
                // Проверяем достижение 500 и 1000 DPS
                if (gameScore >= 1000) {
                    const record1000DPSCompleted = localStorage.getItem('record1000DPSCompleted') === 'true';
                    if (!record1000DPSCompleted) {
                        alert('Поздравляем! Вы набрали 1000 DPS за игру. Получите награду в заданиях!');
                    }
                } else if (gameScore >= 500) {
                    const record500DPSCompleted = localStorage.getItem('record500DPSCompleted') === 'true';
                    if (!record500DPSCompleted) {
                        alert('Поздравляем! Вы набрали 500 DPS за игру. Получите награду в заданиях!');
                    }
                }
            }
        }
    });

    document.querySelector('button[data-page="game"]').addEventListener('click', () => {
        if (gamePage.style.display !== 'none') {
            loadGame();
            updateAvailableGames();
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

    // Вызов функции при загрузке страницы
    document.addEventListener('DOMContentLoaded', () => {
        updateAvailableGames(); // Обновляем отображение сердец при загрузке
        updateGameEarningsDisplay(); // Обновляем отображение заработанных денег за игры
    });
});
//let totalGameEarnings = parseInt(localStorage.getItem('totalGameEarnings')) || 0;
function updateGameEarningsDisplay() {
    const gameEarningsElements = document.querySelectorAll('.bg-yellow-400 .text-sm.font-bold.text-black');
    gameEarningsElements.forEach(element => {
        const parentDiv = element.closest('.bg-yellow-400');
        const labelElement = parentDiv.querySelector('.text-xs.text-black');
        if (labelElement && labelElement.textContent.trim() === 'Game') {
            element.textContent = `+${totalGameEarnings} DPS`;
        }
    });
}
function updateTotalScore() {
    const totalScoreElement = document.querySelector('.text-3xl.font-bold.text-black');
    if (totalScoreElement) {
        totalScoreElement.textContent = `${totalDPS} DPS`;
    }
}


// Экспортируем функцию бновлен счета, чобы она была доступна в других файлах
window.updateTotalScore = updateTotalScore;
window.updateGameEarningsDisplay = updateGameEarningsDisplay;

// Функця для обновления отобржения очков за игру
function updateGameScoreDisplay() {
    const gameScoreElement = document.getElementById('gameScore');
    const totalGameEarnings = parseInt(localStorage.getItem('totalGameEarnings')) || 0; // Получаем из localStorage
    if (gameScoreElement) {
        gameScoreElement.textContent = `+${totalGameEarnings} DPS`; // Обновляем отображеие
    }
}

// При загрузке страницы восстанавливаем данные из localStorage
document.addEventListener('DOMContentLoaded', () => {
    const savedTimers = JSON.parse(localStorage.getItem('heartTimers')) || [];
    heartTimers = savedTimers;
    availableGames = parseInt(localStorage.getItem('availableGames')) || 5;
    lastHeartRecoveryTime = parseInt(localStorage.getItem('lastHeartRecoveryTime')) || 0;
    updateTimer(); // Обновляем состояние сразу после загрузки
});

function saveGameState() {
    localStorage.setItem('availableGames', availableGames);
    localStorage.setItem('heartTimers', JSON.stringify(heartTimers));
    localStorage.setItem('lastHeartRecoveryTime', lastHeartRecoveryTime);
}

// Изменяем функцию loadGameState
function loadGameState() {
    const savedAvailableGames = localStorage.getItem('availableGames');
    const savedHeartTimers = localStorage.getItem('heartTimers');
    const savedLastHeartRecoveryTime = localStorage.getItem('lastHeartRecoveryTime');

    if (savedAvailableGames !== null) {
        availableGames = parseInt(savedAvailableGames);
    } else {
        availableGames = 5; // Устанавливаем 5 сердец только если нет сораненного значения
    }
    if (savedHeartTimers !== null) {
        heartTimers = JSON.parse(savedHeartTimers);
    }
    if (savedLastHeartRecoveryTime !== null) {
        lastHeartRecoveryTime = parseInt(savedLastHeartRecoveryTime);
    }

    // Проверяем и обновляем состояние сразу после загрузки
    updateTimer();
    updateAvailableGamesDisplay();
}

// Изменяем обработчик события DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    loadGameState(); // Загружаем состояние игры
    updateAvailableGames(); // Обновляем отображение сердец
    updateGameEarningsDisplay(); // Обновляем отображение заработанных денег за игры
    updateTaskEarningsDisplay(); // Добавляем обновление отображения заработка за задания
});

// Экспортируем функцию обновления счета за задания, чтобы она была доступна в других файлах
window.updateTaskEarningsDisplay = updateTaskEarningsDisplay;

// Добавьте эту функцию в начало файла
function updateGameTaskProgress() {
    const gameTask = tasks.daily.find(task => task.name === "Сыграть 5 раз");
    if (gameTask && gameTask.cooldown <= 0) {
        if (!gameTask.isTimerRunning) {
            startGameTaskTimer();
        }
        gameTask.progress++;
        if (gameTask.progress === gameTask.maxProgress) {
            clearTimeout(gameTask.timer);
            gameTask.isTimerRunning = false;
        }
        renderTasks('daily');
        saveDailyTasks();
    }
}

// Измените функцию startGame
function startGame() {
    if (availableGames > 0) {
        const taskCooldown = parseInt(localStorage.getItem('gameTaskCooldown')) || 0;
        const currentTime = Date.now();
        
        availableGames--;
        heartTimers.push(Date.now());
        if (heartTimers.length === 1) {
            lastHeartRecoveryTime = Date.now();
        }
        
        // Обновляем прогресс только если нет активного кулдауна
        if (taskCooldown <= currentTime) {
            gameProgress = parseInt(localStorage.getItem('gameProgress')) || 0;
            
            if (gameProgress === 0) {
                gameTaskStartTime = Date.now();
                localStorage.setItem('gameTaskStartTime', gameTaskStartTime);
                startGameTaskTimer();
            }
            
            if (gameProgress < 5) {
                gameProgress++;
                localStorage.setItem('gameProgress', gameProgress.toString());
            }
        }
        
        saveGameState();
        updateAvailableGamesDisplay();
        startButton.style.display = 'none';
        
        if (gameIframe && gameIframe.contentWindow) {
            gameIframe.contentWindow.postMessage({ type: 'slowDown' }, '*');
            gameIframe.contentWindow.main();
        }
        
        playedCount++;
        localStorage.setItem('playedCount', playedCount.toString());
        updatePlayedCountTask();
    }
}

// Добавляем функцию для запуска таймера задания
function startGameTaskTimer() {
    if (gameTaskTimer) {
        clearTimeout(gameTaskTimer);
    }
    
    gameTaskTimer = setTimeout(() => {
        // Сбрасываем прогресс после истечения минуты
        gameProgress = 0;
        localStorage.setItem('gameProgress', gameProgress);
        gameTaskStartTime = 0;
        localStorage.setItem('gameTaskStartTime', gameTaskStartTime);
        
        // Обновляем отображение
        renderTasks('daily');
    }, 60000); // 1 минута
}

// Добавляем функцию для проверки времени
function checkGameTaskTime() {
    if (gameTaskStartTime > 0) {
        const now = Date.now();
        const timeElapsed = now - gameTaskStartTime;
        
        if (timeElapsed >= 60000) { // Прошла минута
            gameProgress = 0;
            localStorage.setItem('gameProgress', gameProgress);
            gameTaskStartTime = 0;
            localStorage.setItem('gameTaskStartTime', gameTaskStartTime);
            if (gameTaskTimer) {
                clearTimeout(gameTaskTimer);
            }
        }
    }
}

// Добавьте эту функцию
function startGameTaskTimer() {
    const gameTask = tasks.daily.find(task => task.name === "Сыграть 5 раз");
    if (gameTask && !gameTask.isTimerRunning) {
        gameTask.isTimerRunning = true;
        gameTask.timerStartTime = Date.now();
        gameTask.timer = setTimeout(() => {
            gameTask.isTimerRunning = false;
            gameTask.progress = 0;
            renderTasks('daily');
            saveDailyTasks();
        }, 60000); // 1 минута
        saveDailyTasks();
    }
}

// Добавьте эти функции, если их нет в game.js
function renderTasks(category) {
    // Реализация может быть пустой, если отображение происходит в main.js
}

function saveDailyTasks() {
    localStorage.setItem('dailyTasks', JSON.stringify(tasks));
}

// Добавьте новую функцию:
function updatePlayedCountTask() {
    const playedCountTask = tasks.daily.find(task => task.name === "Сыграть 25 раз");
    if (playedCountTask) {
        playedCountTask.playedCount = playedCount;
        if (playedCount >= 25) {
            playedCountTask.isCompleted = true;
        }
        renderTasks('daily');!
        saveDailyTasks();
    }
}

// Исправленная функция для проверки и выполнения заданий на рекорд DPS
function checkAndCompleteRecordTask(taskName) {
    const task = tasks.daily.find(t => t.name === taskName);
    if (!task || task.isCompleted) return;

    const requiredScore = taskName === "Набрать 500 DPS за игру" ? 500 : 1000;
    const highScore = parseInt(localStorage.getItem('project.github.chrome_dino.high_score')) || 0;
    const taskCompletedKey = `record${requiredScore}DPSCompleted`;

    // Проверяем, не было ли уже выполнено задание
    if (localStorage.getItem(taskCompletedKey) === 'true') {
        alert('Это задание уже выполнено!');
        return;
    }

    // Строгая проверка рекорда
    if (highScore < requiredScore) {
        alert(`Ваш текущий рекорд: ${highScore} DPS. Продолжайте играть, чтобы достичь ${requiredScore} DPS!`);
        return;
    }

    // Дополнительная проверка для задачи на 1000 DPS
    if (requiredScore === 1000) {
        // Проверяем, выполнена ли предыдущая задача на 500 DPS
        if (localStorage.getItem('record500DPSCompleted') !== 'true') {
            alert('Сначала выполните задание "Набрать 500 DPS за игру"!');
            return;
        }
    }

    // Если все проверки пройдены - начисляем награду
    task.isCompleted = true;
    localStorage.setItem(taskCompletedKey, 'true');
    totalDPS += task.dps;
    totalTaskEarnings += task.dps;
    
    localStorage.setItem('totalDPS', totalDPS.toString());
    localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
    
    updateTotalScore();
    updateTaskEarningsDisplay();
    renderTasks('daily');
    saveTasks();
    
    alert(`Поздравляем! Вы получили ${task.dps} DPS за выполнение задания "${taskName}"!`);
}

