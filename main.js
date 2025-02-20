import telegramAnalytics from '@telegram-apps/analytics';
import taskManager from './tasks.js';
import { loadGame, updateAvailableGamesDisplay, updateTimer } from './game.js';

// Инициализация аналитики до рендеринга
telegramAnalytics.init({
  token: 'eyJhcHBfbmFtZSI6ImRpbm8iLCJhcHBfdXJsIjoiaHR0cHM6Ly90Lm1lL0Rpbm9zYXVyX0dhbWVib3QiLCJhcHBfZG9tYWluIjoiaHR0cHM6Ly9kaW5vLWFwcC5ydS8ifQ==!SlwDHzBT0t/RmfT0jdz+J7idl60NEUcDTtGSYrfy1PE=',
  appName: 'dino'
});

// Глобальные переменные через window
window.totalDPS = parseInt(localStorage.getItem('totalDPS')) || 0;
window.totalTaskEarnings = parseInt(localStorage.getItem('totalTaskEarnings')) || 0;
window.totalGameEarnings = parseInt(localStorage.getItem('totalGameEarnings')) || 0;
window.totalInviteEarnings = parseInt(localStorage.getItem('totalInviteEarnings')) || 0;

// Инициализация счетчиков игр
if (!localStorage.getItem('dailyPlayCount')) {
    localStorage.setItem('dailyPlayCount', '0');
}
if (!localStorage.getItem('lastPlayCountResetDate')) {
    localStorage.setItem('lastPlayCountResetDate', new Date().toDateString());
}
function initializeMainPage() {
    // Добавляем данные пользователя из Telegram WebApp
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        const userNameElement = document.getElementById('userName');
        const userAvatarElement = document.getElementById('userAvatar');
        
        // Устанавливаем имя пользователя
        if (userNameElement) {
            userNameElement.textContent = user.first_name || 'User';
        }
        
        // Устанавливаем аватар пользователя с обработкой ошибок
        if (userAvatarElement) {
            if (user.photo_url) {
                // Создаем временный объект Image для проверки загрузки
                const tempImage = new Image();
                
                // Показываем плейсхолдер пока загружается
                userAvatarElement.innerHTML = `
                    <div class="w-full h-full bg-yellow-400 flex items-center justify-center text-black font-bold">
                        ${(user.first_name || 'U')[0].toUpperCase()}
                    </div>
                `;
                
                tempImage.onload = function() {
                    // Если изображение успешно загрузилось, показываем его
                    userAvatarElement.innerHTML = '';
                    const img = document.createElement('img');
                    img.src = user.photo_url;
                    img.alt = 'User avatar';
                    img.className = 'w-full h-full object-cover';
                    userAvatarElement.appendChild(img);
                };
                
                tempImage.onerror = function() {
                    // Если произошла ошибка, оставляем плейсхолдер
                    console.log('Failed to load user avatar, using placeholder');
                };
                
                // Начинаем загрузку изображения
                tempImage.src = user.photo_url;
            } else {
                // Если нет photo_url, показываем плейсхолдер
                userAvatarElement.innerHTML = `
                    <div class="w-full h-full bg-yellow-400 flex items-center justify-center text-black font-bold">
                        ${(user.first_name || 'U')[0].toUpperCase()}
                    </div>
                `;
            }
        }
    }
}
// Таски
// Функция для отображения тасков
window.updateTaskStatuses = function(category) {
    taskManager.renderTasks(category);
};
function renderTasks(category) {
    const taskContainer = document.getElementById('taskContainer');
    if (!taskContainer) return;

    const tasks = taskManager.getTasks(category);
    taskContainer.innerHTML = '';

    tasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskContainer.appendChild(taskElement);
    });
}

// Создание элемента таска
function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'bg-gray-800 rounded-lg p-4 flex justify-between items-center';
    
    // Добавляем проверку на isMaxLevel
    const buttonText = task.isMaxLevel ? 'Max Level' : 
                      task.isCompleted ? 'Completed' : 
                      'Complete';
    
    const buttonDisabled = task.isMaxLevel || task.isCompleted;
    
    taskDiv.innerHTML = `
        <div class="flex items-center">
            <span class="text-2xl mr-3">${task.icon}</span>
            <div class="ml-3">
                <div class="text-sm font-medium">${task.name}</div>
                ${task.progress !== undefined ? 
                    `<div class="text-xs text-gray-400">${task.progress}/${task.maxProgress}</div>` : 
                    ''}
            </div>
        </div>
        <div class="flex items-center">
            <div class="text-yellow-400 text-sm font-bold mr-3">+${task.dps} DPS</div>
            <button class="bg-yellow-400 text-black px-4 py-2 rounded-full text-sm font-bold ${
                buttonDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }" ${buttonDisabled ? 'disabled' : ''} onclick="handleTaskClick('${task.id}')">
                ${buttonText}
            </button>
        </div>
    `;
    
    return taskDiv;
}

// Обработчик клика по таску
window.handleTaskClick = async function(taskId) {
    const task = taskManager.getTasks('daily')
        .concat(taskManager.getTasks('social'))
        .concat(taskManager.getTasks('media'))
        .concat(taskManager.getTasks('refs'))
        .find(t => t.id === taskId);

    if (!task || task.isCompleted) {
        return;
    }

    switch(task.type) {
        case 'daily':
            await taskManager.handleDailyTask(task);
            break;
        case 'social':
            await taskManager.handleSocialTask(task);
            break;
        case 'media':
            await taskManager.handleMediaTask(task);
            break;
        case 'refs':
            await taskManager.handleRefsTask(task);
            break;
    }
    
    updateAllBalances();
    taskManager.renderTasks(task.type);
};

// Функция для обновления баланса
window.updateBalance = async function(amount, source) {
    try {
        switch(source) {
            case 'task':
                window.totalTaskEarnings += amount;
                window.totalDPS += amount;
                localStorage.setItem('totalTaskEarnings', window.totalTaskEarnings.toString());
                break;
            case 'game':
                window.totalGameEarnings += amount;
                window.totalDPS += amount;
                localStorage.setItem('totalGameEarnings', window.totalGameEarnings.toString());
                break;
            case 'invite':
                window.totalInviteEarnings += amount;
                window.totalDPS += amount;
                localStorage.setItem('totalInviteEarnings', window.totalInviteEarnings.toString());
                break;
        }
        localStorage.setItem('totalDPS', window.totalDPS.toString());
        updateAllBalances();
        await updateServerBalance();
        return true;
    } catch (error) {
        console.error('Error updating balance:', error);
        return false;
    }
}

function checkAndFixStuckTimer() {
    const now = Date.now();
    const nextHeartTime = parseInt(localStorage.getItem('nextHeartTime')) || 0;
    const heartTimers = JSON.parse(localStorage.getItem('heartTimers')) || [];
    const availableGames = parseInt(localStorage.getItem('availableGames')) || 0;
    
    // Проверяем застрявший таймер или некорректное состояние
    // 600000 = 10 минут в миллисекундах
    if ((nextHeartTime > 0 && now - nextHeartTime > 600000) || 
        (availableGames === 0 && heartTimers.length === 0) ||
        (heartTimers.some(timer => now - timer > 600000))) {
        
        console.log('Сброс застрявшего таймера...');
        
        // Сбрасываем только данные, связанные с сердцами
        localStorage.setItem('availableGames', '5');
        localStorage.setItem('heartTimers', '[]');
        localStorage.setItem('nextHeartTime', '0');
        
        // Обновляем переменные в памяти
        availableGames = 5;
        heartTimers = [];
        nextHeartTime = 0;
        
        // Обновляем UI без перезагрузки
        if (document.getElementById('lives')) {
            document.getElementById('lives').innerHTML = '❤️'.repeat(5);
        }
        if (document.getElementById('timer')) {
            document.getElementById('timer').textContent = '';
        }
    }
}

function createSeparator() {
    const separator = document.createElement('img');
    separator.src = 'assets/Line.png';
    separator.alt = 'Разделитель';
    separator.className = 'w-full';
    return separator;
}

document.querySelectorAll('footer button').forEach(btn => {
    btn.addEventListener('click', handleFooterButtonClick);
});
async function syncUserData() {
    if (!window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
        console.log('No user data available yet');
        return;
    }
    
    const telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
    try {
        const response = await fetch(`/sync-user-data?telegramId=${telegramId}`, {
            headers: {
                'X-Telegram-Init-Data': window.Telegram.WebApp.initData
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Если это первый запуск (пользователь только что создан)
        if (data.isNewUser) {
            // Инициализируем значения по умолчанию только для нового пользователя
            localStorage.setItem('availableGames', '5');
            localStorage.setItem('totalDPS', '0');
            localStorage.setItem('totalTaskEarnings', '0');
            localStorage.setItem('totalGameEarnings', '0');
            localStorage.setItem('totalInviteEarnings', '0');

            // Получаем параметры URL для проверки реферального кода
            const urlParams = new URLSearchParams(window.location.search);
            const startParam = urlParams.get('start');
            
            // Формируем команду start с реферальным кодом если он есть
            const startCommand = startParam ? `/start ${startParam}` : '/start';
            
            // Отправляем команду в бот
            if (window.Telegram?.WebApp?.sendData) {
                window.Telegram.WebApp.sendData(startCommand);
            }
        } else {
            // Обновляем глобальные переменные с проверкой на undefined
            window.totalDPS = data.balance || window.totalDPS || 0;
            window.totalTaskEarnings = data.taskEarnings || window.totalTaskEarnings || 0;
            window.totalGameEarnings = data.gameEarnings || window.totalGameEarnings || 0;
            window.totalInviteEarnings = data.inviteEarnings || window.totalInviteEarnings || 0;
            
            // Сохраняем значения как строки
            localStorage.setItem('totalDPS', window.totalDPS.toString());
            localStorage.setItem('totalTaskEarnings', window.totalTaskEarnings.toString());
            localStorage.setItem('totalGameEarnings', window.totalGameEarnings.toString());
            localStorage.setItem('totalInviteEarnings', window.totalInviteEarnings.toString());
        }
        
        updateAllBalances();
        return data;
    } catch (error) {
        console.error('Error syncing user data:', error);
        // При ошибке используем существующие локальные данные
        window.totalDPS = parseInt(localStorage.getItem('totalDPS')) || window.totalDPS || 0;
        window.totalTaskEarnings = parseInt(localStorage.getItem('totalTaskEarnings')) || window.totalTaskEarnings || 0;
        window.totalGameEarnings = parseInt(localStorage.getItem('totalGameEarnings')) || window.totalGameEarnings || 0;
        window.totalInviteEarnings = parseInt(localStorage.getItem('totalInviteEarnings')) || window.totalInviteEarnings || 0;
        
        // Обновляем UI с локальными данными
        updateAllBalances();
        
        // Возможно, стоит добавить уведомление о проблеме с синхронизацией
        if (window.Telegram?.WebApp?.showPopup) {
            window.Telegram.WebApp.showPopup({
                title: '⚠️ Attention',
                message: 'Problem with data synchronization. Your progress is saved locally and will be synchronized when the connection is restored.'
            });
        }
    }
}
async function updateServerBalance() {
    try {
        const response = await fetch('/update-balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': window.Telegram.WebApp.initData
            },
            body: JSON.stringify({
                telegramId: window.Telegram.WebApp.initDataUnsafe.user.id.toString(), // преобразуем в строку
                balance: window.totalDPS,
                taskEarnings: window.totalTaskEarnings,
                gameEarnings: window.totalGameEarnings,
                inviteEarnings: window.totalInviteEarnings
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Update failed: ${errorData.error || response.statusText}`);
        }
        return true;
    } catch (error) {
        console.error('Error updating server:', error);
        return false;
    }
}
function handleFooterButtonClick(event) {
    const page = event.currentTarget.getAttribute('data-page');
    showPage(page);
}

function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });
    const pageToShow = document.getElementById(`${pageName}-page`);
    if (pageToShow) {
        pageToShow.style.display = 'block';
    }

    // Обновляем активную кнопку в футере
    document.querySelectorAll('footer button').forEach(btn => {
        btn.classList.remove('text-yellow-400');
        btn.classList.add('text-gray-500');
    });
    const activeButton = document.querySelector(`footer button[data-page="${pageName}"]`);
    if (activeButton) {
        activeButton.classList.remove('text-gray-500');
        activeButton.classList.add('text-yellow-400');
    }

    if (pageName === 'game') {
        const shopButton = document.getElementById('shopButton');
        if (shopButton) {
            shopButton.classList.remove('hidden');
        }
        loadGame();
        updateAvailableGamesDisplay();
        const timerData = updateTimer();
        
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = timerData.availableGames < 5 ? 
                `Next heart through: ${timerData.time}` : '';
        }
    }
}
document.addEventListener('DOMContentLoaded', async function() {
    // Очищаем старые данные заданий при первом запуске
    if (!localStorage.getItem('gameLevel')) {
        localStorage.removeItem('tasks');
        localStorage.setItem('gameLevel', '1');
        localStorage.setItem('gameLevelProgress', '0');
    }
    
    try {
        await syncUserData();
        initializeMainPage();
        checkAndFixStuckTimer();
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.setHeaderColor('#000000');
            window.Telegram.WebApp.setBackgroundColor('#000000');
            window.Telegram.WebApp.expand();
        }

        // Инициализация кнопок категорий
        const categoryButtons = document.querySelectorAll('.flex.mb-4.space-x-2.overflow-x-auto button');
        categoryButtons.forEach(button => {
            button.addEventListener('click', function() {
                categoryButtons.forEach(btn => {
                    btn.classList.remove('bg-yellow-400', 'text-black');
                    btn.classList.add('bg-gray-700', 'text-white');
                });
                
                this.classList.remove('bg-gray-700', 'text-white');
                this.classList.add('bg-yellow-400', 'text-black');
                
                const category = this.textContent.toLowerCase();
                taskManager.renderTasks(category);
            });
        });

        // Инициализация футера
        document.querySelectorAll('footer button').forEach(btn => {
            btn.addEventListener('click', handleFooterButtonClick);
        });

        showPage('main');
        taskManager.renderTasks('daily');
        updateAllBalances();

    } catch (error) {
        console.error('Error during initialization:', error);
    }

    document.querySelector('button[data-page="main"]').addEventListener('click', () => {
        updateGameScoreDisplay();
        updateTaskScoreDisplay();
        updateInviteEarningsDisplay();
        window.totalDPS = parseInt(localStorage.getItem('totalDPS')) || 0;
        window.totalTaskEarnings = parseInt(localStorage.getItem('totalTaskEarnings')) || 0;
        window.totalInviteEarnings = parseInt(localStorage.getItem('totalInviteEarnings')) || 0;
        updateAllBalances();
    });
});

function updateInviteEarningsDisplay() {
    const inviteEarningsElement = document.getElementById('inviteEarnings');
    if (inviteEarningsElement) {
        // Используем глобальную переменную вместо localStorage
        inviteEarningsElement.textContent = `+${window.totalInviteEarnings} DPS`;
    }
}

function updateTaskScoreDisplay() {
    const earnedDPSElement = document.getElementById('earnedDPS');
    if (earnedDPSElement) {
        earnedDPSElement.textContent = `+${window.totalTaskEarnings} DPS`;
    }
}

function updateTotalScore() {
    const totalScoreElement = document.querySelector('.text-3xl.font-bold.text-black');
    if (totalScoreElement) {
        totalScoreElement.textContent = `${window.totalDPS} DPS`;
    }
    updateTaskScoreDisplay();
    updateTaskEarningsDisplay();
}

function updateGameScoreDisplay() {
    const gameScoreElement = document.getElementById('gameScore');
    // Используем глобальную переменную вместо localStorage
    if (gameScoreElement) {
        gameScoreElement.textContent = `+${window.totalGameEarnings} DPS`; 
    }
}

function updateTaskEarningsDisplay() {
    const taskEarningsElement = document.getElementById('earnedDPS');
    if (taskEarningsElement) {
        taskEarningsElement.textContent = `+${window.totalTaskEarnings} DPS`;
    }
}

function updateAllBalances() {
    updateTotalScore();
    updateTaskEarningsDisplay();
    updateGameScoreDisplay(); 
    updateInviteEarningsDisplay();
}

window.addEventListener('message', async function(event) {
    if (event.data.type === 'shareStory') {
        try {
            const telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
            const username = window.Telegram.WebApp.initDataUnsafe.user.username || 'Player';
            const response = await fetch(`https://dino-app.ru/get-referral-link?telegramId=${telegramId}`);
            const data = await response.json();
            
            if (data.inviteLink) {
                // Используем shareToStory как в примере с пандой
                window.Telegram.WebApp.shareToStory(
                    'https://dino-app.ru/assets/icon.png',
                    {
                        text: `🦖 ${username} scored ${event.data.score} DPS in Dino Rush!\n\n🎯 Can you beat this score?`,
                        widget_link: {
                            url: data.inviteLink,
                            name: 'Play Dino Rush'
                        }
                    }
                );
                
                if (window.Telegram.WebApp.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                }
            }
        } catch (error) {
            console.error('Error sharing story:', error);
            window.Telegram.WebApp.showPopup({
                title: 'Error',
                message: 'Failed to share story. Please try again.',
                buttons: [{
                    type: 'close'
                }]
            });
        }
    }
});

export { 
    syncUserData, 
    updateServerBalance, 
    showPage, 
    handleFooterButtonClick,
    updateAllBalances 
};
