// Объявляем глобальные переменные один раз в начале файла
let totalDPS = parseInt(localStorage.getItem('totalDPS')) || 0;
let totalGameEarnings = parseInt(localStorage.getItem('totalGameEarnings')) || 0;
let availableGames = parseInt(localStorage.getItem('availableGames')) || 0;
let nextHeartTime = parseInt(localStorage.getItem('nextHeartTime')) || Date.now();
let gameIframe = null;
let startButton = document.getElementById('startButton');
let livesDisplay = document.getElementById('lives');
let timerDisplay;
let gamePage;
let gameContainer;
let timerActive = false;
let heartTimers = [];
let lastHeartRecoveryTime = 0;
let tasks = JSON.parse(localStorage.getItem('dailyTasks')) || { daily: [] };
let playedCount = parseInt(localStorage.getItem('playedCount')) || 0;
let gameProgress = parseInt(localStorage.getItem('gameProgress')) || 0;
let gameTaskTimer = null;
let gameTaskStartTime = parseInt(localStorage.getItem('gameTaskStartTime')) || 0;


// Убедимся, что при 0 сердцах они остаются 0
if (availableGames === 0) {
    availableGames = 0; // Сохраняем 0 при обновлении
}

// Функция для обновления таймера
window.updateTimer = function() {
    const now = Date.now();
    let updated = false;

    // Проверяем время восстановления сердца
    if (nextHeartTime > 0 && now >= nextHeartTime && availableGames < 5) {
        availableGames++;
        updated = true;
        
        // Устанавливаем следующее время восстановления
        if (availableGames < 5) {
            nextHeartTime = now + 300000; // 5 минут
        } else {
            nextHeartTime = 0; // Сбрасываем таймер только когда достигли 5 сердец
        }
        
        localStorage.setItem('availableGames', availableGames);
        localStorage.setItem('nextHeartTime', nextHeartTime);
    }

    // Вычисляем оставшееся время
    let remainingTime = 0;
    if (nextHeartTime > 0 && availableGames < 5) {
        remainingTime = Math.max(0, Math.ceil((nextHeartTime - now) / 1000));
    }

    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;

    return {
        time: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        availableGames: availableGames,
        updated: updated
    };
};

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
function updateAvailableGamesDisplay() {
    const timerData = updateTimer();
    
    // Обновляем сердца
    if (livesDisplay) {
        livesDisplay.innerHTML = '❤️'.repeat(timerData.availableGames) + '🖤'.repeat(5 - timerData.availableGames);
    }
    
    // Обновляем таймер
    if (timerDisplay) {
        if (timerData.availableGames < 5) {
            timerDisplay.textContent = `Следующее сердце через: ${timerData.time}`;
            timerDisplay.style.display = 'block';
        } else {
            timerDisplay.style.display = 'none';
        }
    }
    
    // Обновляем состояние кнопки
    updateStartButtonState();
};
function loadGame() {
    if (!gameContainer) return;
    gameIframe = createGameIframe();
    updateAvailableGamesDisplay();
}
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация элементов
    gamePage = document.getElementById('game-page');
    gameContainer = document.getElementById('gameContainer');
    startButton = document.getElementById('startButton');
    livesDisplay = document.getElementById('lives');
    
    // Создаем timerDisplay
    timerDisplay = document.createElement('div');
    timerDisplay.id = 'timer';
    if (livesDisplay) {
        livesDisplay.parentNode.insertBefore(timerDisplay, livesDisplay.nextSibling);
    }
    
    // Восстанавливаем состояние из localStorage
    availableGames = parseInt(localStorage.getItem('availableGames')) || 5;
    nextHeartTime = parseInt(localStorage.getItem('nextHeartTime')) || 0;
    
    // Загружаем игру
    if (gameContainer) {
        loadGame();
    }
    
    // Обновляем отображение
    updateAvailableGamesDisplay();
});
// Функция создания iframe
function createGameIframe() {
    if (!gameIframe) {
        gameIframe = document.createElement('iframe');
        gameIframe.src = 'game/index.html';
        gameIframe.style.width = '100%';
        gameIframe.style.height = '300px';
        gameIframe.style.border = 'none';
        document.getElementById('gameContainer').appendChild(gameIframe);
    }
    return gameIframe;
}
window.showPopup = function(message, duration = 3000) {
    // Удаляем существующий попап, если есть
    const existingPopup = document.getElementById('custom-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    // Создаем элементы попапа
    const popup = document.createElement('div');
    popup.id = 'custom-popup';
    popup.className = 'fixed top-0 left-0 right-0 z-50 transform -translate-y-full transition-transform duration-300 ease-out';
    
    const innerDiv = document.createElement('div');
    innerDiv.className = 'bg-black/90 text-yellow-400 px-6 py-4 mx-auto max-w-md shadow-lg rounded-b-lg border-b-2 border-x-2 border-yellow-400';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'text-center font-bold text-lg';
    messageDiv.textContent = message;
    
    // Собираем структуру
    innerDiv.appendChild(messageDiv);
    popup.appendChild(innerDiv);
    document.body.appendChild(popup);
    
    // Показываем попап
    requestAnimationFrame(() => {
        popup.classList.remove('-translate-y-full');
        popup.classList.add('translate-y-0');
        
        // Скрываем и удаляем попап через duration мс
        setTimeout(() => {
            popup.classList.remove('translate-y-0');
            popup.classList.add('-translate-y-full');
            
            // Удаляем элемент после завершения анимации
            setTimeout(() => {
                popup.remove();
            }, 300); // Время равно duration-300 из класса
        }, duration);
    });
}
startButton.addEventListener('click', () => {
    if (startButton.classList.contains('claim-mode')) {
        // Начисляем очки
        const gameScore = parseInt(startButton.dataset.pendingScore);
        totalDPS += gameScore;
        totalGameEarnings += gameScore;
        localStorage.setItem('totalDPS', totalDPS);
        localStorage.setItem('totalGameEarnings', totalGameEarnings);
        
        updateTotalScore();
        updateGameEarningsDisplay();
        updateGameScoreDisplay();
        updatePlayedCountTask();
        
        // Добавляем обновление всех балансов
        if (window.updateAllBalances) {
            window.updateAllBalances();
        }
        
        showPopup(`Вы заработали ${gameScore} DPS! Ваш новый баланс: ${totalDPS} DPS`);
        
        // Отправляем сообщение в iframe для удаления кнопки рекламы
        if (gameIframe && gameIframe.contentWindow) {
            gameIframe.contentWindow.postMessage({ type: 'hideAd' }, '*');
        }
        
        // Возвращаем кнопку в режим Start
        startButton.classList.remove('claim-mode');
        updateStartButtonState();
    } else {
        if (availableGames > 0) {
            startButton.style.display = 'none';
            
            availableGames--;
            // Запускаем таймер сразу при использовании первого сердца
            if (availableGames < 5 && nextHeartTime === 0) {
                nextHeartTime = Date.now() + 300000; // 5 минут
                localStorage.setItem('nextHeartTime', nextHeartTime);
            }
            
            localStorage.setItem('availableGames', availableGames);
            updateAvailableGamesDisplay();
            
            // Обновляем прогресс заданий
            playedCount++;
            localStorage.setItem('playedCount', playedCount.toString());
            updatePlayedCountTask();
            
            // Обновляем прогресс задания "Сыграть 5 раз"
            const currentProgress = parseInt(localStorage.getItem('gameProgress')) || 0;
            if (currentProgress < 5) {
                if (currentProgress === 0) {
                    localStorage.setItem('gameTaskStartTime', Date.now().toString());
                }
                localStorage.setItem('gameProgress', (currentProgress + 1).toString());
            }
            
            // Запускаем игру
            if (gameIframe && gameIframe.contentWindow) {
                gameIframe.contentWindow.postMessage({ type: 'startGame' }, '*');
            }
        }
        updateStartButtonState();
    }
});

// Вызываем updateStartButtonState при загрузке страницы и после каждого изменения availableGames
document.addEventListener('DOMContentLoaded', updateStartButtonState);

function updateStartButtonState() {
    if (!startButton) return;
    
    if (availableGames === 0 && !startButton.classList.contains('claim-mode')) {
        // Если нет сердец и кнопка не в режиме claim
        startButton.classList.remove('bg-yellow-400', 'text-black');
        startButton.classList.add('bg-gray-200', 'text-gray-600', 'opacity-80');
        startButton.innerHTML = 'Недостаточно сердец';
        startButton.disabled = true;
    } else if (startButton.classList.contains('claim-mode')) {
        // Если кнопка в режиме claim
        startButton.classList.remove('bg-yellow-400', 'text-black');
        startButton.classList.add('bg-gray-200', 'text-gray-600', 'opacity-80', 'hover:opacity-100');
        startButton.innerHTML = 'Claim x1 DPS';
        startButton.disabled = false;
    } else {
        // Обычное состояние (есть сердца)
        startButton.classList.remove('bg-gray-200', 'text-gray-600', 'opacity-80', 'hover:opacity-100');
        startButton.classList.add('bg-yellow-400', 'text-black');
        startButton.innerHTML = 'Start';
        startButton.disabled = false;
    }
}

window.addEventListener('message', (event) => {
    if (event.data.type === 'gameOver') {
        // Показываем кнопку в режиме claim
        startButton.style.display = 'block';
        startButton.classList.add('claim-mode');
        startButton.innerHTML = 'Claim x1 DPS';
        startButton.dataset.pendingScore = event.data.score;
        startButton.classList.remove('bg-yellow-400', 'text-black');
        startButton.classList.add('bg-gray-200', 'text-gray-600', 'opacity-80', 'hover:opacity-100');
        
        if (availableGames === 0) {
            livesDisplay.innerHTML = 'Игры закончились';
        }
                
            // Проверяем, не установлен ли новый рекорд
            const gameScore = event.data.score;
            const highScore = parseInt(localStorage.getItem('project.github.chrome_dino.high_score')) || 0;
            if (gameScore > highScore) {
                localStorage.setItem('project.github.chrome_dino.high_score', gameScore.toString());
                // Проверяем достижение 500 и 1000 DPS
                if (gameScore >= 1000) {
                    const record1000DPSCompleted = localStorage.getItem('record1000DPSCompleted') === 'true';
                    if (!record1000DPSCompleted) {
                        showPopup('Поздравляем! Вы набрали 1000 DPS за игру. Получите награду в заданиях!');
                    }
                } else if (gameScore >= 500) {
                    const record500DPSCompleted = localStorage.getItem('record500DPSCompleted') === 'true';
                    if (!record500DPSCompleted) {
                        showPopup('Поздравляем! Вы набрали 500 DPS за игру. Получите награду в заданиях!');
                    }
                }
            }
        }
    });

    document.querySelector('button[data-page="game"]').addEventListener('click', () => {
        if (gamePage.style.display !== 'none') {
            loadGame();
            updateAvailableGamesDisplay();
            updateTimer();
            updateStartButtonState();
        }
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

function saveGameState() {
    localStorage.setItem('availableGames', availableGames);
    localStorage.setItem('heartTimers', JSON.stringify(heartTimers));
    localStorage.setItem('lastHeartRecoveryTime', lastHeartRecoveryTime);
    updateAvailableGamesDisplay(); 
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
        availableGames--;
        
        // Если это первое использованное сердце, запускаем таймер
        if (nextHeartTime === 0) {
            nextHeartTime = Date.now() + 300000; // 5 минут
            localStorage.setItem('nextHeartTime', nextHeartTime);
        }
        
        // Сохраняем обновленное количество сердец
        localStorage.setItem('availableGames', availableGames);
        
        // Обновляем отображение
        updateAvailableGamesDisplay();
        if (startButton) startButton.style.display = 'none';
        
        // Запускаем игру
        if (gameIframe && gameIframe.contentWindow) {
            gameIframe.contentWindow.postMessage({ type: 'start' }, '*');
        }
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
        showPopup('Это задание уже выполнено!');
        return;
    }

    // Строгая проверка рекорда
    if (highScore < requiredScore) {
        showPopup(`Ваш текущий рекорд: ${highScore} DPS. Продолжайте играть, чтобы достичь ${requiredScore} DPS!`);
        return;
    }

    // Дополнительная проверка для задачи на 1000 DPS
    if (requiredScore === 1000) {
        // Проверяем, выполнена ли предыдущая задача на 500 DPS
        if (localStorage.getItem('record500DPSCompleted') !== 'true') {
            showPopup('Сначала выполните задание "Набрать 500 DPS за игру"!');
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
    
    showPopup(`Поздравляем! Вы получили ${task.dps} DPS за выполнение задания "${taskName}"!`);
}
// Добавляем инициализацию Adsgram
function loadAdsgramScript() {
    return new Promise((resolve, reject) => {
        if (window.Adsgram) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://sad.adsgram.ai/js/sad.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

let AdController;
async function initAdsgram() {
    try {
        await loadAdsgramScript();
        console.log('Adsgram SDK загружен успешно');
        AdController = window.Adsgram.init({ blockId: "4178" }); 
    } catch (error) {
        console.error('Ошибка загрузки Adsgram SDK:', error);
    }
}

// Инициализируем Adsgram при загрузке страницы
document.addEventListener('DOMContentLoaded', initAdsgram);

function updateStartButtonText(isClaim = false) {
    if (startButton) {
        if (isClaim) {
            startButton.innerHTML = 'Claim x1 DPS 😢';
            startButton.classList.add('claim-mode');
            startButton.classList.remove('bg-yellow-400', 'text-black');
            startButton.classList.add('bg-gray-200', 'text-gray-600', 'opacity-80', 'hover:opacity-100');
        } else {
            startButton.innerHTML = 'Start';
            startButton.classList.remove('claim-mode');
            startButton.classList.remove('bg-gray-200', 'text-gray-600', 'opacity-80', 'hover:opacity-100');
            startButton.classList.add('bg-yellow-400', 'text-black');
        }
    }
}
// Обновляем обработчик сообщений от игры
window.addEventListener('message', async (event) => {
    if (event.data.type === 'showAd') {
        // Показываем рекламу
        if (!AdController) {
            await initAdsgram();
        }
    
        try {
            const result = await AdController.show();
            console.log('Пользователь посмотрел рекламу', result);
            
            // Начисляем очки с множителем x3 после просмотра рекламы
            const currentScore = event.data.currentScore;
            const gameScore = currentScore * 3;
            
            totalDPS += gameScore;
            totalGameEarnings += gameScore;
            localStorage.setItem('totalDPS', totalDPS);
            localStorage.setItem('totalGameEarnings', totalGameEarnings);
            
            updateTotalScore();
            updateGameEarningsDisplay();
            updateGameScoreDisplay();
            updatePlayedCountTask();
            
            // Добавляем обновление отображения задач
            if (window.updateTaskStatuses) {
                window.updateTaskStatuses('daily');
            }
            
            showPopup(`Вы заработали ${gameScore} DPS (x3)! Ваш новый баланс: ${totalDPS} DPS`);
            
            // Отправляем сообщение в iframe о том, что реклама просмотрена
            if (gameIframe && gameIframe.contentWindow) {
                gameIframe.contentWindow.postMessage({ type: 'adWatched' }, '*');
            }
            
            // Полностью сбрасываем состояние кнопки на Start
            startButton.classList.remove('claim-mode');
            startButton.classList.remove('bg-gray-200', 'text-gray-600', 'opacity-80', 'hover:opacity-100');
            startButton.classList.add('bg-yellow-400', 'text-black');
            startButton.innerHTML = 'Start';
            startButton.disabled = availableGames === 0;
            delete startButton.dataset.pendingScore; // Удаляем сохраненный счет
            
        } catch (error) {
            console.error('Ошибка при показе рекламы:', error);
        }
    } else if (event.data.type === 'gameOver') {
        // Проверяем, не была ли уже начислена награда
        if (!startButton.dataset.pendingScore) {
            startButton.style.display = 'block';
            startButton.classList.add('claim-mode');
            startButton.innerHTML = 'Claim x1 DPS';
            startButton.dataset.pendingScore = event.data.score;
            startButton.classList.remove('bg-yellow-400', 'text-black');
            startButton.classList.add('bg-gray-200', 'text-gray-600', 'opacity-80', 'hover:opacity-100');
            
            // Увеличиваем счетчик сыгранных игр
            playedCount = parseInt(localStorage.getItem('playedCount')) || 0;
            playedCount++;
            localStorage.setItem('playedCount', playedCount);
            
            // Обновляем отображение задач
            if (window.updateTaskStatuses) {
                window.updateTaskStatuses('daily');
            }
        }
        
        // Обновляем отображение сердец отдельно
        if (availableGames === 0) {
            livesDisplay.innerHTML = 'Игры закончились';
        }
        updateAvailableGamesDisplay();
    }
});