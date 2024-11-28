import taskManager from './tasks.js';


let availableGames = parseInt(localStorage.getItem('availableGames'));
if (availableGames === null || isNaN(availableGames)) {
    availableGames = 5;
    localStorage.setItem('availableGames', '5');
} else if (availableGames === 0) {
    // Убедимся, что при 0 сердцах они остаются 0
    localStorage.setItem('availableGames', '0');
}
let nextHeartTime = parseInt(localStorage.getItem('nextHeartTime')) || 0;
let lastHeartCheckTime = parseInt(localStorage.getItem('lastHeartCheckTime')) || Date.now();
let gameIframe = null;
let startButton = document.getElementById('startButton');
let livesDisplay = document.getElementById('lives');
let timerDisplay;
let gamePage;
let canvas;
let canvas_ctx;
let gameContainer;
let timerActive = false;
let heartTimers = JSON.parse(localStorage.getItem('heartTimers')) || [];
let lastHeartRecoveryTime = 0;
let playedCount = parseInt(localStorage.getItem('playedCount')) || 0;
let gameProgress = parseInt(localStorage.getItem('gameProgress')) || 0;
let gameTaskTimer = null;
let gameTaskStartTime = parseInt(localStorage.getItem('gameTaskStartTime')) || 0;
const shopButton = document.getElementById('shopButton');
shopButton?.addEventListener('click', openShopModal);

function updateTimer() {
    const now = Date.now();
    let updated = false;

    // Проверяем и обновляем сердца
    while (heartTimers.length > 0 && now >= heartTimers[0] && availableGames < 5) {
        availableGames++;
        updated = true;
        heartTimers.shift();
        
        nextHeartTime = heartTimers[0] || 0;
        
        localStorage.setItem('availableGames', availableGames);
        localStorage.setItem('heartTimers', JSON.stringify(heartTimers));
        localStorage.setItem('nextHeartTime', nextHeartTime);
    }

    let remainingTime = 0;
    if (heartTimers.length > 0 && availableGames < 5) {
        remainingTime = Math.max(0, Math.ceil((heartTimers[0] - now) / 1000));
    }

    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;

    return {
        time: `${minutes}:${seconds.toString().padStart(2, '0')}`,
        availableGames: availableGames,
        updated: updated
    };
}

let timerInterval = setInterval(() => {
    const timerData = updateTimer();
    
    if (document.getElementById('timer')) {
        document.getElementById('timer').textContent = availableGames < 5 ? `Next heart through: ${timerData.time}` : '';
    }
    if (document.getElementById('lives')) {
        document.getElementById('lives').innerHTML = '❤️'.repeat(timerData.availableGames) + '🖤'.repeat(5 - timerData.availableGames);
    }
}, 1000);

function handleJump(event) {
    // Предотвращаем всплытие события только для desktop
    if (event.type !== 'touchstart' && event.type !== 'touchend') {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Проверяем готовность iframe
    if (gameIframe && gameIframe.contentWindow) {
        gameIframe.contentWindow.postMessage({ 
            type: 'jump'
        }, '*');
    }
}
async function scheduleHeartNotification() {
    if (availableGames === 0) { // Проверяем, что это последнее сердце
        try {
            const telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
            await fetch('/schedule-heart-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': window.Telegram.WebApp.initData
                },
                body: JSON.stringify({ telegramId })
            });
        } catch (error) {
            console.error('Error scheduling heart notification:', error);
        }
    }
}
function setupEventListeners() {
    // Добавляем обработчики для всего документа
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Space' || event.key === ' ') {
            handleJump(event);
        }
    }, { passive: false });

    document.addEventListener('touchstart', handleJump, { passive: true });
    document.addEventListener('click', handleJump, { passive: false });

    // Добавляем обработчики для gameContainer
    if (gameContainer) {
        gameContainer.addEventListener('touchstart', handleJump, { passive: true });
        gameContainer.addEventListener('click', handleJump, { passive: false });
    }
}

// Функция для проверки и обновления сердец
function checkAndUpdateHearts() {
    const now = Date.now();
    
    // Фильтруем и обновляем таймеры
    while (heartTimers.length > 0 && now >= heartTimers[0] && availableGames < 5) {
        availableGames++;
        heartTimers.shift();
    }
    
    // Если все сердца восстановлены, очищаем таймеры
    if (availableGames >= 5) {
        heartTimers = [];
        nextHeartTime = 0;
    }
    
    // Сохраняем обновленное состояние
    localStorage.setItem('availableGames', availableGames);
    localStorage.setItem('heartTimers', JSON.stringify(heartTimers));
    localStorage.setItem('nextHeartTime', nextHeartTime);
}

function updateAvailableGamesDisplay() {
    const timerData = updateTimer();
    
    // Обновляем сердца
    if (livesDisplay) {
        livesDisplay.innerHTML = '❤️'.repeat(timerData.availableGames) + '🖤'.repeat(5 - timerData.availableGames);
    }
    
    // Обновляем таймер
    if (timerDisplay) {
        if (timerData.availableGames < 5) {
            timerDisplay.textContent = `Next heart through: ${timerData.time}`;
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
    
    // Проверяем, существует ли уже iframe
    if (!gameIframe) {
        gameIframe = createGameIframe();
        // Добавляем обработчики только при первом создании iframe
        setupEventListeners();
    }
    
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
    nextHeartTime = parseInt(localStorage.getItem('nextHeartTime')) || 0;
    
    // Загружаем игру
    if (gameContainer) {
        loadGame();
    }
    // Обновляем отображение
    createShopModal();
    checkAndUpdateHearts();
    updateAvailableGamesDisplay();
    loadUserSkins();
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
startButton.addEventListener('click', async () => {
    if (startButton.classList.contains('claim-mode')) {
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
        const gameScore = parseInt(startButton.dataset.pendingScore);
        const currentHighScore = parseInt(localStorage.getItem('project.github.chrome_dino.high_score')) || 0;

        // Сначала обновляем рекорд, если нужно
        if (gameScore > currentHighScore) {
            localStorage.setItem('project.github.chrome_dino.high_score', gameScore.toString());   
        }

        // Затем обновляем баланс и остальное
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
        
        await updateBalance(gameScore, 'game');
        
        updateTotalScore();
        updateGameEarningsDisplay();
        updateGameScoreDisplay();
        updatePlayedCountTask();
        
        // Добавляем обновление всех балансов
        if (window.updateAllBalances) {
            window.updateAllBalances();
        }
        
        showPopup(`You earned ${gameScore} DPS! Your new balance: ${totalDPS} DPS`);
        
        // Отправляем сообщение в iframe для удаления кнопки рекламы
        if (gameIframe && gameIframe.contentWindow) {
            gameIframe.contentWindow.postMessage({ type: 'hideAd' }, '*');
        }
        
        // Возвращаем кнопку в режим Start
        startButton.classList.remove('claim-mode');
        delete startButton.dataset.pendingScore; // Добавляем эту строку
        updateStartButtonState();
    } else {
        if (availableGames > 0) {
            // Добавляем увеличение gameProgress здесь
            let gameProgress = parseInt(localStorage.getItem('gameProgress')) || 0;
            const gameTaskStartTime = parseInt(localStorage.getItem('gameTaskStartTime')) || 0;
            
            // Если это первая игра или прошло больше 12 часов
            if (gameProgress === 0 || Date.now() - gameTaskStartTime > 43200000) {
                gameProgress = 1;
                localStorage.setItem('gameTaskStartTime', Date.now().toString());
            } else if (gameProgress < 5) {
                gameProgress++;
            }
            
            localStorage.setItem('gameProgress', gameProgress.toString());
            
            // Вибрация при старте игры
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
    
    // Скрываем элементы
    const elementsToHide = [
        document.querySelector('h1'),
        document.getElementById('lives'),
        document.getElementById('timer'),
        document.getElementById('startButton'),
        document.getElementById('achievementsButton'),
        document.getElementById('shopButton')
    ];
    
    elementsToHide.forEach(el => {
        if (el) el.style.display = 'none';
    });
    
   // Добавляем обработчики с правильными опциями
   document.addEventListener('click', handleJump);
   document.addEventListener('touchstart', handleJump, { passive: true });
   document.addEventListener('keydown', (event) => {
       if (event.code === 'Space' || event.key === ' ') {
           handleJump(event);
       }
   });
    startButton.style.display = 'none';
            availableGames--;
            await scheduleHeartNotification();
            
            // Обновленная логика для heartTimers
            const now = Date.now();
            
            // Если это первое использованное сердце
            if (availableGames === 4 && heartTimers.length === 0) {
                nextHeartTime = now + 300000;
                heartTimers.push(nextHeartTime);
            } else if (availableGames < 5) {
                // Для последующих сердец
                const lastTimer = heartTimers.length > 0 ? 
                    Math.max(...heartTimers) : 
                    now;
                const newTimer = Math.max(lastTimer + 300000, now + 300000);
                heartTimers.push(newTimer);
            }
            
            // Сортируем таймеры по возрастанию
            heartTimers.sort((a, b) => a - b);
            
            // Обновляем nextHeartTime на ближайший таймер
            nextHeartTime = heartTimers[0] || 0;
            
            // Сохраняем все в localStorage
            localStorage.setItem('availableGames', availableGames);
            localStorage.setItem('heartTimers', JSON.stringify(heartTimers));
            localStorage.setItem('nextHeartTime', nextHeartTime);
            
            updateAvailableGamesDisplay();
            
            // Обновляем прогресс заданий
            playedCount++;
            localStorage.setItem('playedCount', playedCount.toString());
            updatePlayedCountTask();
            
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

const ACHIEVEMENTS = {
    // COMMON (зеленые)
    FIRST_HUNDRED: {
        id: 'first_hundred',
        name: 'First hundred',
        description: 'Get 100 points',
        icon: '💯',
        rarity: 'common',
        condition: (score) => score >= 100
    },
    MASTER_JUMPER: {
        id: 'master_jumper',
        name: 'Master jumper',
        description: 'Make 5 jumps in a row',
        icon: '🦘',
        rarity: 'common',
        condition: (_, combo) => combo >= 5
    },
    FIRST_MINUTE: {
        id: 'first_minute',
        name: 'First minute',
        description: 'Stay alive for 1 minute',
        icon: '⏱️',
        rarity: 'common',
        condition: (_, __, timeAlive) => timeAlive >= 60
    },

    // RARE (синие)
    SPEED_MASTER: {
        id: 'speed_master',
        name: 'Speed master',
        description: 'Get 300 points',
        icon: '🏃',
        rarity: 'rare',
        condition: (score) => score >= 300
    },
    COMBO_KING: {
        id: 'combo_king',
        name: 'Combo king',
        description: 'Make 10 jumps in a row',
        icon: '👑',
        rarity: 'rare',
        condition: (_, combo) => combo >= 10
    },

    // EPIC (фиолетовые)
    NIGHT_RUNNER: {
        id: 'night_runner',
        name: 'Night runner',
        description: 'Get 200 points in night mode',
        icon: '🌙',
        rarity: 'epic',
        condition: (score, _, __, theme) => score >= 200 && theme === 2
    },
    SURVIVOR: {
        id: 'survivor',
        name: 'Survivor',
        description: 'Play 5 minutes without dying',
        icon: '⭐️',
        rarity: 'epic',
        condition: (_, __, timeAlive) => timeAlive >= 300
    }
};

// Цвета для разных редкостей
const RARITY_COLORS = {
    common: 'text-green-400 border-green-400',
    rare: 'text-blue-400 border-blue-400',
    epic: 'text-purple-400 border-purple-400'
};

// Добавляем HTML для уведомления о достижении
const achievementNotification = document.createElement('div');
achievementNotification.className = 'fixed top-4 left-0 right-0 flex justify-center items-center z-50 pointer-events-none';
achievementNotification.style.display = 'none';
document.body.appendChild(achievementNotification);

// Функция для показа уведомления о достижении
function showAchievementNotification(achievement) {
    achievementNotification.innerHTML = `
        <div class="bg-black/90 px-6 py-4 rounded-lg border-2 flex items-center space-x-3 ${RARITY_COLORS[achievement.rarity]}">
            <span class="text-2xl">${achievement.icon}</span>
            <div>
                <div class="font-bold">${achievement.name}</div>
                <div class="text-sm">${achievement.description}</div>
                <div class="text-xs mt-1 ${RARITY_COLORS[achievement.rarity]}">${achievement.rarity.toUpperCase()}</div>
            </div>
        </div>
    `;
    achievementNotification.style.display = 'flex';
    
    setTimeout(() => {
        achievementNotification.style.display = 'none';
    }, 3000);
}

// Обработчик сообщений от iframe
window.addEventListener('message', (event) => {
    if (event.data.type === 'checkAchievements') {
        const unlockedAchievements = JSON.parse(localStorage.getItem('achievements') || '[]');
        
        Object.values(ACHIEVEMENTS).forEach(achievement => {
            if (!unlockedAchievements.includes(achievement.id) && 
                achievement.condition(
                    event.data.score,
                    event.data.combo,
                    event.data.timeAlive,
                    event.data.theme
                )) {
                
                unlockedAchievements.push(achievement.id);
                localStorage.setItem('achievements', JSON.stringify(unlockedAchievements));
                
                // Вибрация
                if (window.Telegram && window.Telegram.WebApp) {
                    window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
                }
                
                // Показываем уведомление
                achievementNotification.innerHTML = `
                    <div class="bg-black/90 text-yellow-400 px-6 py-4 rounded-lg border-2 border-yellow-400 flex items-center space-x-3">
                        <span class="text-2xl">${achievement.icon}</span>
                        <div>
                            <div class="font-bold">${achievement.name}</div>
                            <div class="text-sm">${achievement.description}</div>
                        </div>
                    </div>
                `;
                achievementNotification.style.display = 'flex';
                
                setTimeout(() => {
                    achievementNotification.style.display = 'none';
                }, 3000);
            }
        });
    }
});
// Функция для отображения достижений
function showAchievements() {
    const achievementsModal = document.getElementById('achievementsModal');
    const achievementsList = document.getElementById('achievementsList');
    const unlockedAchievements = JSON.parse(localStorage.getItem('achievements') || '[]');
    
    achievementsList.innerHTML = '';
    
    // Группируем достижения по редкости
    const groupedAchievements = {
        epic: [],
        rare: [],
        common: []
    };
    
    Object.values(ACHIEVEMENTS).forEach(achievement => {
        groupedAchievements[achievement.rarity].push(achievement);
    });
    
    // Отображаем достижения по группам
    Object.entries(groupedAchievements).forEach(([rarity, achievements]) => {
        achievementsList.innerHTML += `
            <div class="mb-4">
                <h3 class="text-lg font-bold ${RARITY_COLORS[rarity]} mb-2">
                    ${rarity.toUpperCase()}
                </h3>
                <div class="space-y-2">
                    ${achievements.map(achievement => {
                        const isUnlocked = unlockedAchievements.includes(achievement.id);
                        return `
                            <div class="bg-gray-800 rounded-lg p-4 flex items-center space-x-4 
                                ${isUnlocked ? `border-2 ${RARITY_COLORS[achievement.rarity]}` : ''}">
                                <span class="text-3xl">${isUnlocked ? achievement.icon : '🔒'}</span>
                                <div>
                                    <h3 class="font-bold ${isUnlocked ? RARITY_COLORS[achievement.rarity] : 'text-gray-400'}">
                                        ${achievement.name}
                                    </h3>
                                    <p class="text-sm text-gray-400">${achievement.description}</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    
    achievementsModal.classList.remove('hidden');
}

// Добавляем обработчики событий
document.getElementById('achievementsButton')?.addEventListener('click', showAchievements);
document.getElementById('closeAchievements')?.addEventListener('click', () => {
    document.getElementById('achievementsModal').classList.add('hidden');
});

function updateStartButtonState() {
    if (!startButton) return;
    
    if (availableGames === 0 && !startButton.classList.contains('claim-mode')) {
        // Если нет сердец и кнопка не в режиме claim
        startButton.classList.remove('bg-yellow-400', 'text-black');
        startButton.classList.add('bg-gray-200', 'text-gray-600', 'opacity-80');
        startButton.innerHTML = 'Not enough hearts';
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

window.addEventListener('message', async (event) => {
    if (event.data.type === 'gameOver') {
        // Показываем обратно все элементы
        const elementsToShow = [
            document.querySelector('h1'),
            document.getElementById('lives'),
            document.getElementById('timer'),
            document.getElementById('achievementsButton'),
            document.getElementById('shopButton')
        ];
        
        elementsToShow.forEach(el => {
            if (el) el.style.display = '';
        });
        
        // Удаляем все обработчики прыжка
        document.removeEventListener('click', handleJump);
        document.removeEventListener('touchstart', handleJump);
        document.removeEventListener('keydown', handleJump);

        // Проверяем, не была ли уже начислена награда
        if (!startButton.dataset.pendingScore) {
            const score = parseInt(event.data.score);
            
            // Обновляем счетчик игр ПЕРЕД вызовом updatePlayCount
            let dailyPlayCount = parseInt(localStorage.getItem('dailyPlayCount') || '0');
            dailyPlayCount++;
            console.log('Updating dailyPlayCount to:', dailyPlayCount);
            localStorage.setItem('dailyPlayCount', dailyPlayCount.toString());
            
            // Обновляем баланс и таски
            taskManager.updatePlayCount();
            
            // Обновляем общий счетчик игр
            playedCount = parseInt(localStorage.getItem('playedCount')) || 0;
            playedCount++;
            localStorage.setItem('playedCount', playedCount.toString());
            
            // Обновляем UI кнопки
            startButton.style.display = 'block';
            startButton.classList.add('claim-mode');
            startButton.innerHTML = 'Claim x1 DPS';
            startButton.dataset.pendingScore = event.data.score;
            startButton.classList.remove('bg-yellow-400', 'text-black');
            startButton.classList.add('bg-gray-200', 'text-gray-600', 'opacity-80', 'hover:opacity-100');
            startButton.disabled = false;

            // Проверяем рекорды
            const highScore = parseInt(localStorage.getItem('project.github.chrome_dino.high_score')) || 0;
            if (score > highScore) {
                localStorage.setItem('project.github.chrome_dino.high_score', score.toString());
                 // Добавляем отправку рекорда на сервер
           // Отправляем текущий рекорд из localStorage на сервер
    const currentHighScore = parseInt(localStorage.getItem('project.github.chrome_dino.high_score'));
    fetch('/update-high-score', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': window.Telegram.WebApp.initData
        },
        body: JSON.stringify({
            telegramId: window.Telegram.WebApp.initDataUnsafe.user.id,
            highScore: currentHighScore
        })
    }).catch(error => console.error('Ошибка при отправке рекорда:', error));
                // Проверяем достижение 500 и 1000 DPS
                if (score >= 1000) {
                    const record1000DPSCompleted = localStorage.getItem('record1000DPSCompleted') === 'true';
                    if (!record1000DPSCompleted) {
                        showPopup('Congratulations! You scored 1000 DPS per game. Get a reward in tasks!');
                    }
                } else if (score >= 500) {
                    const record500DPSCompleted = localStorage.getItem('record500DPSCompleted') === 'true';
                    if (!record500DPSCompleted) {
                        showPopup('Congratulations! You scored 500 DPS per game. Get a reward in tasks!');
                    }
                }
                
                taskManager.updateGameProgress(score);
            }
        }
        
        // Обновляем отображение сердец
        if (availableGames === 0) {
            livesDisplay.innerHTML = 'Lives are over';
        }
        updateAvailableGamesDisplay();
        updateStartButtonState();
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

// Изменяем функцию loadGameState
function loadGameState() {
    const savedAvailableGames = localStorage.getItem('availableGames');
    const savedHeartTimers = localStorage.getItem('heartTimers');
    const savedNextHeartTime = parseInt(localStorage.getItem('nextHeartTime'));
    const now = Date.now();

// Исправляем NaN в availableGames
if (savedAvailableGames === 'NaN' || isNaN(parseInt(savedAvailableGames))) {
    console.log('Fixing NaN availableGames value');
    savedAvailableGames = '5';  // Сбрасываем на максимальное значение
    localStorage.setItem('availableGames', savedAvailableGames);
}
    // Загружаем сохраненные таймеры
    heartTimers = savedHeartTimers ? JSON.parse(savedHeartTimers) : [];

    if (savedAvailableGames !== null) {
        availableGames = parseInt(savedAvailableGames);

        // Дополнительная проверка на корректность значения
        if (isNaN(availableGames) || availableGames < 0 || availableGames > 5) {
            console.log('Correcting invalid availableGames value');
            availableGames = 0;
            localStorage.setItem('availableGames', availableGames.toString());
        }
        
        // Проверяем офлайн-восстановление
        if (availableGames < 5) {
            // Проверяем все сохраненные таймеры
            const recoveredHearts = heartTimers.filter(time => now >= time).length;
            
            if (recoveredHearts > 0) {
                // Обновляем количество сердец
                availableGames = Math.min(5, availableGames + recoveredHearts);
                
                // Очищаем использованные таймеры
                heartTimers = heartTimers.filter(time => now < time);
                
                // Если нужно восстановить еще сердца
                if (availableGames < 5 && heartTimers.length === 0) {
                    nextHeartTime = now + 300000; // 20 секунд для тестирования
                    heartTimers.push(nextHeartTime);
                } else if (availableGames === 5) {
                    nextHeartTime = 0;
                    heartTimers = [];
                }
                
                // Сохраняем обновленные значения
                localStorage.setItem('availableGames', availableGames);
                localStorage.setItem('nextHeartTime', nextHeartTime);
                localStorage.setItem('heartTimers', JSON.stringify(heartTimers));
            }
        }
    } else {
        // Инициализация при первом запуске
        availableGames = 5;
        nextHeartTime = 0;
        heartTimers = [];
        localStorage.setItem('availableGames', availableGames);
        localStorage.setItem('nextHeartTime', nextHeartTime);
        localStorage.setItem('heartTimers', JSON.stringify(heartTimers));
    }

    // Проверяем и обновляем состояние сразу после загрузки
    checkAndUpdateHearts();
    updateAvailableGamesDisplay();
}

// Добавляем вызов функции при загрузке страницы
document.addEventListener('DOMContentLoaded', loadGameState);

// Добавляем проверку при возвращении на вкладку
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        loadGameState();
    }
});
// Доавьте эту функцию в начало файла
function updateGameTaskProgress() {
    const gameTask = taskManager.tasks.daily.find(task => task.name === "Play 5 times");
    if (gameTask && gameTask.cooldown <= 0) {
        if (!gameTask.isTimerRunning) {
            startGameTaskTimer();
        }
        gameTask.progress++;
        if (gameTask.progress === gameTask.maxProgress) {
            clearTimeout(gameTask.timer);
            gameTask.isTimerRunning = false;
            taskManager.handleTaskCompletion(gameTask);
        }
        taskManager.renderTasks('daily');
        taskManager.saveTasks();
    }
}

function startGameTaskTimer() {
    const gameTask = taskManager.tasks.daily.find(task => task.name === "Play 5 times");
    if (gameTask && !gameTask.isTimerRunning) {
        gameTask.isTimerRunning = true;
        gameTask.timerStartTime = Date.now();
        gameTask.timer = setTimeout(() => {
            gameTask.isTimerRunning = false;
            gameTask.progress = 0;
            taskManager.renderTasks('daily');
            taskManager.saveTasks();
        }, 60000); // 1 минута
        taskManager.saveTasks();
    }
}

function renderTasks(category) {
    // Реализация может быть пустой, если отображение происходит в main.js
}

// Добавьте новую функцию:
function updatePlayedCountTask() {
    const dailyTasks = taskManager.getTasks('daily');
    const play25Task = dailyTasks.find(task => task.name === "Play 25 times");
    if (play25Task && !play25Task.isCompleted) {
        const dailyPlayCount = parseInt(localStorage.getItem('dailyPlayCount')) || 0;
        play25Task.progress = Math.min(dailyPlayCount, play25Task.maxProgress);
        
        if (play25Task.progress >= play25Task.maxProgress) {
            play25Task.isCompleted = true;
            taskManager.handleTaskCompletion(play25Task);
        }
        taskManager.renderTasks('daily');
        taskManager.saveTasks();
    }
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
        console.log('Adsgram SDK loaded successfully');
        AdController = window.Adsgram.init({ blockId: "5315" }); 
    } catch (error) {
        console.error('Error loading Adsgram SDK:', error);
    }
}

// Инициализируем Adsgram при загрузке страницы
document.addEventListener('DOMContentLoaded', initAdsgram);

// Обновляем обработчик сообщений от игры
window.addEventListener('message', async (event) => {
    if (event.data.type === 'showAd') {
        // Показываем рекламу
        if (!AdController) {
            await initAdsgram();
        }
    
        try {
            const result = await AdController.show();
            console.log('User watched the ad', result);
            
            // Начисляем очки с множителем x3 после просмотра рекламы
            const currentScore = event.data.currentScore;
            const gameScore = currentScore * 3;
            await updateBalance(gameScore, 'game');
            
            updatePlayedCountTask();
            
            // Добавляем обновление отображения задач
            if (window.updateTaskStatuses) {
                window.updateTaskStatuses('daily');
            }
            
            showPopup(`You earned ${gameScore} DPS (x3)! Your new balance: ${window.totalDPS} DPS`);
            
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
            console.error('Error showing the ad:', error);
        }
    }
});
let currentSkin = localStorage.getItem('currentDinoSkin') || 'default';
let availableSkins = JSON.parse(localStorage.getItem('availableSkins')) || {
    default: true,
    ninja: false,
    robot: false
};
// Создаем модальное окно магазина
function createShopModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center hidden z-50';
    modal.id = 'shopModal';

    const content = document.createElement('div');
    content.className = 'bg-black rounded-lg p-6 max-w-md w-full mx-4 border border-yellow-400/50 shadow-lg';
    content.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold text-yellow-400">Skins</h2>
            <button class="w-8 h-8 rounded-full border border-yellow-400/50 text-yellow-400 flex items-center justify-center hover:bg-yellow-400/10 transition-colors" onclick="closeShopModal()">✕</button>
        </div>
        <div class="grid grid-cols-2 gap-4">
            <div class="border border-yellow-400/30 rounded-lg p-4 text-center bg-black hover:border-yellow-400/50 transition-colors">
                <img src="assets/dino-default.jpg" alt="Default Dino" class="w-16 h-16 mx-auto mb-2 rounded-lg">
                <div class="font-bold text-yellow-400">Default</div>
                <p class="text-gray-400 text-sm mb-4">Standard speed and protection</p>
                <button data-skin="default" class="w-full px-4 py-2 rounded-lg border border-yellow-400/50 text-yellow-400 bg-black hover:bg-yellow-400/10 transition-all"></button>
            </div>
            <div class="border border-yellow-400/30 rounded-lg p-4 text-center bg-black hover:border-yellow-400/50 transition-colors">
                <img src="assets/ninja.jpg" alt="Ninja Dino" class="w-16 h-16 mx-auto mb-2 rounded-lg">
                <div class="font-bold text-yellow-400">Ninja</div>
                <p class="text-gray-400 text-sm mb-4">🕒 Slows time by 30%</p>
                <button data-skin="ninja" data-price="100" class="w-full px-4 py-2 rounded-lg border border-yellow-400/50 bg-black text-yellow-400 hover:bg-yellow-400/10 transition-all"></button>
            </div>
            <div class="border border-yellow-400/30 rounded-lg p-4 text-center bg-black hover:border-yellow-400/50 transition-colors">
                <img src="assets/robot.jpg" alt="Robot Dino" class="w-16 h-16 mx-auto mb-2 rounded-lg">
                <div class="font-bold text-yellow-400">Robot</div>
                <p class="text-gray-400 text-sm mb-4">🛡️ One-hit protection</p>
                <button data-skin="robot" data-price="100" class="w-full px-4 py-2 rounded-lg border border-yellow-400/50 bg-black text-yellow-400 hover:bg-yellow-400/10 transition-all"></button>
            </div>
        </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Добавляем обработчик клика для закрытия по фону
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeShopModal();
        }
    });
    
    updateShopButtons();
}

// Функции управления модальным окном
function openShopModal() {
    const modal = document.getElementById('shopModal');
    modal.classList.remove('hidden');
}

window.closeShopModal = function() {
    const modal = document.getElementById('shopModal');
    modal.classList.add('hidden');
}
async function loadUserSkins() {
    try {
        const telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
        const response = await fetch(`/get-user-skins?telegramId=${telegramId}`);
        const data = await response.json();
        
        if (data.skins) {
            // Обновляем локальное хранилище доступных скинов
            availableSkins = data.skins.reduce((acc, skin) => {
                acc[skin] = true;
                return acc;
            }, {});
            localStorage.setItem('availableSkins', JSON.stringify(availableSkins));
            
            // Загружаем текущий скин
            currentSkin = localStorage.getItem('currentDinoSkin') || 'default';
            
            // Обновляем кнопки в магазине
            updateShopButtons();
        }
    } catch (error) {
        console.error('Error loading user skins:', error);
    }
}
// Обновляем функцию purchaseSkin
window.purchaseSkin = async function(skinName, price) {
    const button = document.querySelector(`button[data-skin="${skinName}"]`);
    if (button) {
        button.disabled = true;
        button.innerHTML = 'Загрузка...';
    }
    
    try {
        console.log('Attempting to purchase skin:', skinName, 'for price:', price); // Отладочный лог
        const telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
        const response = await fetch(`/create-skin-invoice?telegramId=${telegramId}&stars=${price}&skinName=${skinName}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Invoice data received:', data); // Отладо��ный лог
        
        if (!data.slug) {
            throw new Error('No slug received from server');
        }

        localStorage.setItem('pendingSkin', JSON.stringify({
            skinName: skinName,
            price: price,
            timestamp: Date.now()
        }));

        window.Telegram.WebApp.openInvoice(data.slug);
        
    } catch (error) {
        console.error('Error in purchaseSkin:', error);
        localStorage.removeItem('pendingSkin');
        window.Telegram.WebApp.showPopup({
            title: 'Ошибка',
            message: 'Произошла ошибка при создании счета'
        });
    } finally {
        if (button) {
            button.disabled = false;
            updateShopButtons();
        }
    }
}

function initializeGame() {
    const isMobile = window.Telegram?.WebApp?.platform !== 'desktop';
    const gameContainer = document.getElementById('game-container');
    
    if (isMobile) {
        // Настраиваем размеры для мобильных устройств
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        if (canvas) {
            canvas.style.width = `${viewportWidth}px`;
            canvas.style.height = `${viewportHeight * 0.6}px`;
            canvas.width = viewportWidth * window.devicePixelRatio;
            canvas.height = (viewportHeight * 0.6) * window.devicePixelRatio;
            
            // Масштабируем контекст для сохранения качества
            canvas_ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
        
        if (gameContainer) {
            gameContainer.style.width = '100%';
            gameContainer.style.height = '60vh';
            gameContainer.style.position = 'fixed';
            gameContainer.style.top = '0';
            gameContainer.style.left = '0';
        }
    }
}

// Добавьте эти слушатели событий
document.addEventListener('DOMContentLoaded', initializeGame);
window.addEventListener('resize', initializeGame);

// Добавляем обработчик закрытия Invoice
window.Telegram.WebApp.onEvent('invoiceClosed', async (data) => {
    console.log('Invoice closed with status:', data.status);
    
    if (data.status === 'paid') {
        try {
            const pendingSkin = localStorage.getItem('pendingSkin');
            if (!pendingSkin) return;

            const skinData = JSON.parse(pendingSkin);
            const telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
            
            const response = await fetch(`/update-user-skins?telegramId=${telegramId}&skinName=${skinData.skinName}`);
            const responseData = await response.json();

            if (responseData.success) {
                // Обновляем локальные данные о скинах
                availableSkins[skinData.skinName] = true;
                localStorage.setItem('availableSkins', JSON.stringify(availableSkins));
                
                // Выбираем купленный скин
                selectSkin(skinData.skinName);
                
                window.Telegram.WebApp.showPopup({
                    title: '✨ Success!',
                    message: 'Skin purchased successfully!'
                });
                
                updateShopButtons();
            }
        } catch (error) {
            console.error('Error activating the skin:', error);
        } finally {
            localStorage.removeItem('pendingSkin');
        }
    } else {
        localStorage.removeItem('pendingSkin');
    }
});
// Добавляем новую функцию для выбора скина
window.selectSkin = function(skinName) {
    if (availableSkins[skinName]) {
        currentSkin = skinName;
        localStorage.setItem('currentDinoSkin', skinName);
        
        // Отправляем сообщение в iframe для обновления скина
        if (gameIframe && gameIframe.contentWindow) {
            gameIframe.contentWindow.postMessage({ 
                type: 'changeSkin', 
                skin: skinName 
            }, '*');
        }
        
        // Перезагружаем iframe для обновления начального состояния
        if (gameIframe) {
            const currentSrc = gameIframe.src;
            gameIframe.src = '';
            gameIframe.src = currentSrc;
        }
        
        updateShopButtons();
        showPopup('Skin selected successfully!');
    }
}
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        checkAndUpdateHearts();
        updateAvailableGamesDisplay();
    }
});
// Обновление кнопок в магазине
function updateShopButtons() {
    const modal = document.getElementById('shopModal');
    if (!modal) return;

    const buttons = modal.querySelectorAll('button[data-skin]');
    buttons.forEach(button => {
        const skinName = button.getAttribute('data-skin');
        const price = parseInt(button.getAttribute('data-price')) || 100;
        
        if (skinName) {
            if (availableSkins[skinName]) {
                if (currentSkin === skinName) {
                    button.innerHTML = 'Selected';
                    button.disabled = true;
                    button.className = 'w-full px-4 py-2 rounded-lg border border-yellow-400 text-yellow-400 bg-yellow-400/10 transition-all';
                } else {
                    button.innerHTML = 'Select';
                    button.disabled = false;
                    button.className = 'w-full px-4 py-2 rounded-lg border border-yellow-400/50 text-yellow-400 bg-black hover:bg-yellow-400/10 transition-all';
                    button.onclick = () => selectSkin(skinName);
                }
            } else {
                button.className = 'w-full px-4 py-2 rounded-lg border border-yellow-400/50 bg-black text-yellow-400 hover:bg-yellow-400/10 transition-all';
                button.innerHTML = `<span class="flex items-center justify-center"><span class="mr-2">${price}</span><span>⭐️</span></span>`;
                button.onclick = () => purchaseSkin(skinName, price);
            }
        }
    });
}
export {
    loadGame,
    updateAvailableGamesDisplay,
    updateTimer,
    updateGameTaskProgress,
    startGameTaskTimer
};
