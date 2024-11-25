import taskManager from './tasks.js';
import { loadGame, updateAvailableGamesDisplay, updateTimer } from './game.js';

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
    
    taskDiv.innerHTML = `
        <div class="flex items-center">
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
                task.isCompleted ? 'opacity-50 cursor-not-allowed' : ''
            }" ${task.isCompleted ? 'disabled' : ''} onclick="handleTaskClick('${task.id}')">
                ${task.isCompleted ? 'Completed' : 'Complete'}
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
// Функции синхронизации данных
async function syncUserData() {
    if (!window.Telegram?.WebApp?.initDataUnsafe?.user?.id) return;
    
    const telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
    try {
        const response = await fetch(`/sync-user-data?telegramId=${telegramId}`, {
            headers: {
                'X-Telegram-Init-Data': window.Telegram.WebApp.initData
            }
        });
        const data = await response.json();
        
        // Используем глобальные переменные
        window.totalDPS = data.balance;
        window.totalTaskEarnings = data.taskEarnings;
        window.totalGameEarnings = data.gameEarnings;
        window.totalInviteEarnings = data.inviteEarnings;
        
        localStorage.setItem('totalDPS', window.totalDPS);
        localStorage.setItem('totalTaskEarnings', window.totalTaskEarnings);
        localStorage.setItem('totalGameEarnings', window.totalGameEarnings);
        localStorage.setItem('totalInviteEarnings', window.totalInviteEarnings);
        
        updateAllBalances();
        return data;
    } catch (error) {
        console.error('Error syncing user data:', error);
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
                telegramId: window.Telegram.WebApp.initDataUnsafe.user.id,
                balance: window.totalDPS,
                taskEarnings: window.totalTaskEarnings,
                gameEarnings: window.totalGameEarnings,
                inviteEarnings: window.totalInviteEarnings
            })
        });
        
        if (!response.ok) throw new Error('Update failed');
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
                `Следующее сердце через: ${timerData.time}` : '';
        }
    }
}
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await syncUserData();
        initializeMainPage();
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

export { 
    syncUserData, 
    updateServerBalance, 
    showPage, 
    handleFooterButtonClick,
    updateAllBalances 
};
