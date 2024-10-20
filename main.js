function initializeMainPage() {
    console.log('Вызвана функция initializeMainPage');

    document.querySelectorAll('footer button').forEach(btn => {
        btn.addEventListener('click', handleFooterButtonClick);
    });
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
    } else {
        console.error(`Страница ${pageName} не найдена`);
    }

    document.querySelectorAll('footer button').forEach(btn => {
        btn.classList.remove('text-yellow-400');
        btn.classList.add('text-gray-500');
    });
    const activeButton = document.querySelector(`footer button[data-page="${pageName}"]`);
    if (activeButton) {
        activeButton.classList.remove('text-gray-500');
        activeButton.classList.add('text-yellow-400');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeMainPage();
    showPage('main');
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
    }
});

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
        AdController = window.Adsgram.init({ blockId: "4178" }); 
    } catch (error) {
        console.error('Error loading Adsgram SDK:', error);
    }
}

document.addEventListener('DOMContentLoaded', initAdsgram);

async function watchAd() {
    const confirmed = await showAdConfirmation();
    if (confirmed) {
        if (!AdController) {
            await initAdsgram();
        }
        try {
            const result = await AdController.show();
            console.log('User watched ad', result);
            const telegramId = getTelegramUserId();
            if (!telegramId) {
                console.error('Telegram ID not found');
                return;
            }
            const response = await fetch(`https://dino-app.ru/reward?userid=${telegramId}`);
            const data = await response.json();
            if (data.success) {
                applyAdBonus();
                showAdRewardPopup();
            }
        } catch (error) {
            console.error('Error showing ad:', error);
        }
    }
}

function showAdConfirmation() {
    return new Promise((resolve) => {
        const popup = document.createElement('div');
        popup.className = 'ad-confirmation-popup';
        popup.innerHTML = `
            <p>Вы собираетесь посмотреть рекламу.</p>
            <p>В награду вы получите удвоение тапа на 30 секунд!</p>
            <button id="confirmAd">Смотреть</button>
            <button id="cancelAd">Отмена</button>
        `;
        document.body.appendChild(popup);

        document.getElementById('confirmAd').onclick = () => {
            popup.remove();
            resolve(true);
        };
        document.getElementById('cancelAd').onclick = () => {
            popup.remove();
            resolve(false);
        };
    });
}


function applyAdBonus() {
    const bonusDuration = 30000; // 30 секунд
    const originalTapProfit = tapProfit;
    localStorage.setItem('originalTapProfit', originalTapProfit.toString());
    tapProfit *= 2; // Удваиваем прибыль за тап
    updateTapProfit();
    
    adBonusEndTime = Date.now() + bonusDuration;
    localStorage.setItem('adBonusEndTime', adBonusEndTime.toString());
    
    setTimeout(() => {
        checkAndRemoveAdBonus();
    }, bonusDuration);
}

function checkAndRemoveAdBonus() {
    const currentTime = Date.now();
    const savedBonusEndTime = parseInt(localStorage.getItem('adBonusEndTime') || '0');
    
    if (currentTime >= savedBonusEndTime) {
        tapProfit = parseInt(localStorage.getItem('originalTapProfit')) || tapProfit / 2;
        updateTapProfit();
        localStorage.removeItem('adBonusEndTime');
        localStorage.removeItem('originalTapProfit');
    } else {
        const remainingTime = savedBonusEndTime - currentTime;
        setTimeout(() => {
            checkAndRemoveAdBonus();
        }, remainingTime);
    }
}

function showAdRewardPopup() {
    const popup = document.createElement('div');
    popup.className = 'ad-reward-popup';
    popup.innerHTML = `
        <h2>Поздравляю!</h2>
        <p>Ваша прибыль за тап удвоена!</p>
        <button onclick="this.parentElement.remove()">OK</button>
    `;
    document.body.appendChild(popup);
}

// Добавьте обработчик клика для кнопок футера
document.addEventListener('DOMContentLoaded', function() {
    const footerButtons = document.querySelectorAll('.footer-btn');
    footerButtons.forEach(button => {
        button.addEventListener('click', function() {
            footerButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const taskButtons = document.querySelectorAll('.flex.mb-4.space-x-2.overflow-x-auto button');
    const taskContainer = document.querySelector('.space-y-2');
    const totalScoreElement = document.querySelector('#totalScore');

    // Получаем текущий баланс из localStorage или устанавливаем 0, если его нет
    let totalDPS = parseInt(localStorage.getItem('totalDPS')) || 0;

    // Функция для обновления отображения общего счета
    function updateTotalScore() {
        const totalScoreElement = document.querySelector('.text-3xl.font-bold.text-black');
        if (totalScoreElement) {
            totalScoreElement.textContent = `${totalDPS} DPS`;
        }
    }

    // Вызываем функцию сразу для отображения начального баланса
    updateTotalScore();

    tasks = {
        daily: [
            { name: "Ежедневный бонус", dps: 150, progress: 1, maxProgress: 7, cooldown: 0, bonusTime: 0 },
            { name: "Another Daily Task", dps: 150 },
            { name: "Third Daily Task", dps: 150 },
            { name: "Fourth Daily Task", dps: 150 }
        ],
        social: [
            { name: "Name Social Task", dps: 250 },
            { name: "Another Social Task", dps: 250 },
            { name: "Third Social Task", dps: 250 },
            { name: "Fourth Social Task", dps: 250 }
        ],
        media: [
            { name: "Name Media Task", dps: 200 },
            { name: "Another Media Task", dps: 200 },
            { name: "Third Media Task", dps: 200 },
            { name: "Fourth Media Task", dps: 200 }
        ],
        refs: [
            { name: "Name Refs Task", dps: 300 },
            { name: "Another Refs Task", dps: 300 },
            { name: "Third Refs Task", dps: 300 },
            { name: "Fourth Refs Task", dps: 300 }
        ]
    };

    let currentCategory = 'daily';

    function renderTasks(category) {
        currentCategory = category;
        taskContainer.innerHTML = '';
        tasks[category].forEach((task, index) => {
            const taskElement = document.createElement('div');
            taskElement.className = 'bg-gray-800 rounded-lg p-3 flex justify-between items-center';
            let buttonText = 'Start';
            let buttonClass = 'bg-yellow-400 text-black';
            let statusText = '';
            
            if (task.cooldown > 0) {
                statusText = 'Cooldown';
                buttonClass = 'bg-gray-500 text-white cursor-not-allowed';
            } else if (task.bonusTime > 0) {
                statusText = 'Bonus Time!';
            }
            
            taskElement.innerHTML = `
                <div>
                    <div class="text-sm">${task.name}${task.progress ? ` ${task.progress}/${task.maxProgress}` : ''}</div>
                    <div class="text-xs text-yellow-400">+${task.dps} DPS</div>
                    <div class="text-xs text-white">${statusText}</div>
                </div>
                <button class="task-button ${buttonClass} px-4 py-1 rounded-full text-sm font-bold" data-category="${category}" data-index="${index}" ${task.cooldown > 0 ? 'disabled' : ''}>${buttonText}</button>
            `;
            taskContainer.appendChild(taskElement);
            taskContainer.appendChild(createSeparator());
        });

        document.querySelectorAll('.task-button').forEach(button => {
            button.addEventListener('click', function() {
                if (!this.disabled) {
                    const category = this.getAttribute('data-category');
                    const index = parseInt(this.getAttribute('data-index'));
                    completeTask(category, index);
                }
            });
        });
    }

    function createSeparator() {
        const separator = document.createElement('img');
        separator.src = 'assets/Line.png';
        separator.alt = 'Разделитель';
        separator.className = 'w-full';
        return separator;
    }

    function loadDailyTask() {
        const savedTask = localStorage.getItem('dailyTask');
        const lastUpdateTime = localStorage.getItem('lastUpdateTime');
        if (savedTask && lastUpdateTime) {
            const task = JSON.parse(savedTask);
            const now = Date.now();
            const timePassed = Math.floor((now - parseInt(lastUpdateTime)) / 1000);
            
            if (task.cooldown > 0) {
                task.cooldown = Math.max(0, task.cooldown - timePassed);
                if (task.cooldown === 0 && task.progress > 1) {
                    task.bonusTime = 10;
                }
            } else if (task.bonusTime > 0) {
                task.bonusTime = Math.max(0, task.bonusTime - timePassed);
                if (task.bonusTime === 0) {
                    task.progress = 1;
                    task.dps = 150;
                }
            }
            tasks.daily[0] = task;
        }
        saveDailyTask();
    }

    function saveDailyTask() {
        localStorage.setItem('dailyTask', JSON.stringify(tasks.daily[0]));
        localStorage.setItem('lastUpdateTime', Date.now().toString());
    }

    function updateDailyTask() {
        const task = tasks.daily[0];
        if (task.cooldown > 0) {
            task.cooldown--;
            if (task.cooldown === 0) {
                task.bonusTime = 10;
            }
        } else if (task.bonusTime > 0) {
            task.bonusTime--;
            if (task.bonusTime === 0) {
                task.progress = 1;
                task.dps = 150;
            }
        }
        saveDailyTask();
        if (currentCategory === 'daily') {
            updateTaskDisplay(task);
        }
    }

    function updateTaskDisplay(task) {
        const taskElement = document.querySelector(`[data-category="daily"][data-index="0"]`).closest('.bg-gray-800');
        if (taskElement) {
            const statusElement = taskElement.querySelector('.text-xs.text-white');
            const buttonElement = taskElement.querySelector('.task-button');
            
            if (task.cooldown > 0) {
                statusElement.textContent = `Cooldown: ${task.cooldown}s`;
                buttonElement.disabled = true;
                buttonElement.classList.add('bg-gray-500', 'text-white', 'cursor-not-allowed');
                buttonElement.classList.remove('bg-yellow-400', 'text-black');
            } else if (task.bonusTime > 0) {
                statusElement.textContent = `Bonus Time: ${task.bonusTime}s`;
                buttonElement.disabled = false;
                buttonElement.classList.remove('bg-gray-500', 'text-white', 'cursor-not-allowed');
                buttonElement.classList.add('bg-yellow-400', 'text-black');
            } else {
                statusElement.textContent = '';
                buttonElement.disabled = false;
                buttonElement.classList.remove('bg-gray-500', 'text-white', 'cursor-not-allowed');
                buttonElement.classList.add('bg-yellow-400', 'text-black');
            }
        }
    }

    loadDailyTask();

    // Запускаем таймер обновления только для ежедневных задач
    setInterval(updateDailyTask, 1000);

    function completeTask(category, index) {
        const task = tasks[category][index];
        if (task.cooldown > 0) return;

        totalDPS += task.dps;
        task.progress++;
        if (task.progress > task.maxProgress) {
            task.progress = 1;
            task.dps = 150;
        } else {
            task.dps += 150;
        }

        task.cooldown = 5;
        localStorage.setItem('totalDPS', totalDPS.toString());
        updateTotalScore();
        renderTasks(category);
        saveDailyTask();
    }

    taskButtons.forEach(button => {
        button.addEventListener('click', function() {
            const category = this.textContent.toLowerCase();
            taskButtons.forEach(btn => btn.classList.remove('bg-yellow-400', 'text-black'));
            taskButtons.forEach(btn => btn.classList.add('bg-gray-700', 'text-white'));
            this.classList.remove('bg-gray-700', 'text-white');
            this.classList.add('bg-yellow-400', 'text-black');
            if (category === 'daily') {
                loadDailyTask();
            }
            renderTasks(category);
        });
    });

    // Инициализация с задачами "Daily"
    renderTasks('daily');

    // Функция для симуляции игры и обновления баланса
    function playGame() {
        const score = Math.floor(Math.random() * 100) + 1; // Случайный счет от 1 до 100
        totalDPS += score;
        updateTotalScore();
        alert(`Вы заработали ${score} DPS! Ваш новый баланс: ${totalDPS} DPS`);
    }

    // Добавляем обработчик для кнопки "Play Game" (предполагается, что такая кнопка есть в HTML)
    const playButton = document.querySelector('#playGameButton');
    if (playButton) {
        playButton.addEventListener('click', playGame);
    }

    // Добавляем обработчик для обновления счета при возвращении на главную страницу
    document.querySelector('button[data-page="main"]').addEventListener('click', () => {
        totalDPS = parseInt(localStorage.getItem('totalDPS')) || 0;
        updateTotalScore();
    });

    // Обновляем интервал для обновления таймеров
    setInterval(() => {
        if (currentCategory === 'daily') {
            updateDailyTask();
        }
        renderTasks(currentCategory); // Используем текущую категорию
    }, 1000);
});
