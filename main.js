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
    
    loadDailyTasks(); // Загружаем задачи и добавляем новую, если её нет
    
    // Загружаем сохраненные значения
    totalDPS = parseInt(localStorage.getItem('totalDPS')) || 0;
    totalTaskEarnings = parseInt(localStorage.getItem('totalTaskEarnings')) || 0;
    
    // Обновляем отображение
    updateTotalScore();
    updateTaskEarningsDisplay();
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
        updateTaskScoreDisplay();
        
    }
    

    // Вызываем функцию сразу для отображения начального баланса
    updateTotalScore();
    
    



    
    

    tasks = {
        daily: [
            { name: "Ежедневный бонус", dps: 150, progress: 1, maxProgress: 7, cooldown: 0, bonusTime: 0 },
            { name: "Сыграть 5 раз", dps: 350, progress: 0, maxProgress: 5, cooldown: 0, timer: 0, isTimerRunning: false },
            { name: "Сыграть 25 раз", dps: 750, playedCount: 0, maxProgress: 25, isCompleted: false },
            { name: "Набрать 500 DPS за игру", dps: 550, isCompleted: false },
            { name: "Набрать 1000 DPS за игру", dps: 1750, isCompleted: false } // Изменен с 1100 на 1750
        ],
        social: [
            
            { 
                name: "Сыграть в LITWIN", 
                dps: 350, 
                link: "tg://resolve?domain=LITWIN_TAP_BOT&start=b8683c8c",
                webLink: "https://t.me/LITWIN_TAP_BOT?start=b8683c8c",
                isCompleted: false
            },
            { 
                name: "Сыграть в Method", 
                dps: 450, 
                link: "tg://resolve?domain=MethodTon_Bot&start=p203ynnif7",
                webLink: "https://t.me/MethodTon_Bot?start=p203ynnif7",
                isCompleted: false
            }
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
            
            if (task.name === "Сыграть 5 раз") {
                statusText = `${task.progress}/${task.maxProgress}`;
                if (task.isTimerRunning) {
                    buttonText = 'В процессе';
                    buttonClass = 'bg-gray-500 text-white cursor-not-allowed';
                } else if (task.progress === task.maxProgress) {
                    buttonText = 'Получить награду';
                    buttonClass = 'bg-yellow-400 text-black';
                } else {
                    buttonText = 'Начать';
                    buttonClass = 'bg-yellow-400 text-black';
                }
            }
            
            if (task.name === "Сыграть 25 раз") {
                let playedCount = parseInt(localStorage.getItem('playedCount')) || 0;
                statusText = `${playedCount}/${task.maxProgress}`;
                if (playedCount < task.maxProgress) {
                    buttonText = 'В процессе';
                    buttonClass = 'bg-gray-500 text-white cursor-not-allowed';
                } else {
                    buttonText = 'Получить награду';
                    buttonClass = 'bg-yellow-400 text-black';
                }
            }
            
            if (task.name === "Сыграть в LITWIN" || task.name === "Сыграть в Method") {
                const taskKey = task.name === "Сыграть в LITWIN" ? 'litwinTaskCompleted' : 'methodTaskCompleted';
                const isCompleted = localStorage.getItem(taskKey) === 'true';
                buttonText = isCompleted ? 'Выполнено' : 'Играть';
                buttonClass = isCompleted ? 'bg-gray-500 text-white cursor-not-allowed' : 'bg-yellow-400 text-black';
                task.isCompleted = isCompleted;
            }
            
            if (task.name === "Набрать 500 DPS за игру" || task.name === "Набрать 1000 DPS за игру") {
                const requiredScore = task.name === "Набрать 500 DPS за игру" ? 500 : 1000;
                const isCompleted = localStorage.getItem(`record${requiredScore}DPSCompleted`) === 'true';
                buttonText = isCompleted ? 'Выполнено' : 'Получить награду';
                buttonClass = isCompleted ? 'bg-gray-500 text-white cursor-not-allowed' : 'bg-yellow-400 text-black';
                task.isCompleted = isCompleted;
            }
            
            taskElement.innerHTML = `
                <div>
                    <div class="text-sm">${task.name}</div>
                    <div class="text-xs text-yellow-400">+${task.dps} DPS</div>
                    <div class="text-xs text-white">${statusText}</div>
                </div>
                <button class="task-button ${buttonClass} px-4 py-1 rounded-full text-sm font-bold" data-category="${category}" data-index="${index}" ${task.cooldown > 0 ? 'disabled' : ''}>${buttonText}</button>
            `;
            const taskButton = taskElement.querySelector('.task-button');
            taskButton.addEventListener('click', function() {
                if (!this.disabled) {
                    const category = this.getAttribute('data-category');
                    const index = parseInt(this.getAttribute('data-index'));
                    completeTask(category, index);
                    
                    // Обновляем отображение после вполнения задания
                    updateTaskScoreDisplay();
                    updateTaskEarningsDisplay();
                    updateTotalScore();
                }
                
                
            });

            taskContainer.appendChild(taskElement);
            taskContainer.appendChild(createSeparator());

            // Добавляем обработчик для новых заданий
            if (task.name === "Набрать 500 DPS за игру" || task.name === "Набрать 1000 DPS за игру") {
                taskButton.addEventListener('click', () => checkAndCompleteRecordTask(task.name));
            }
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
                task.bonusTime = 20;
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
                statusElement.textContent = ''; // Убрано отображение секунд
                buttonElement.disabled = true;
                buttonElement.classList.add('bg-gray-500', 'text-white', 'cursor-not-allowed');
                buttonElement.classList.remove('bg-yellow-400', 'text-black');
            } else if (task.bonusTime > 0) {
                statusElement.textContent = ''; // Убрано отображение таймера
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
    
    

    // Д авляем перемнную для отслеживания заработанных денег за задачи
    let totalTaskEarnings = parseInt(localStorage.getItem('totalTaskEarnings')) || 0;

    // ункция для обновлния заработанных денег за задачи
   

    // Функция для обновления отображения заработанных денег за задачи
    function updateTaskEarningsDisplay() {
        requestAnimationFrame(() => {
            const taskEarningsElement = document.getElementById('earnedDPS');
            if (taskEarningsElement) {
                taskEarningsElement.textContent = `+${totalTaskEarnings} DPS`;
            }
        });
    }

    // Именяем функцию completeTask
    function completeTask(category, index) {
        const task = tasks[category][index];
        
        if ((task.name === "Сыграть в LITWIN" || task.name === "Сыграть в Method") && !task.isCompleted) {
            // Пробуем открыть через протокол Telegram
            window.location.href = task.link;
            
            // Если через 1 секунду страница не изменилась, открываем веб-ерсию
            setTimeout(() => {
                if (document.hidden) {
                    // Telegram открылся, отмечаем задание как выполненное
                    completeLinkedTask(task, category);
                } else {
                    // Открываем веб-версию
                    window.open(task.webLink, '_blank');
                    completeLinkedTask(task, category);
                }
            }, 1000);
        } else {
            if (task.cooldown > 0) return;

            if (task.name === "Сыграть 5 раз") {
                if (task.progress === task.maxProgress) {
                    totalDPS += task.dps;
                    totalTaskEarnings += task.dps;
                    task.cooldown = 20;
                    task.progress = 0;
                    task.isTimerRunning = false;
                    clearTimeout(task.timer);
                    
                    // Запускаем кулдаун
                    startCooldown(category, index);
                }
            } else if (task.name === "Сыграть 25 раз") {
                completePlayedCountTask(index);
            } else if (task.name === "Набрать 500 DPS за игру" && !task.isCompleted) {
                const highScore = parseInt(localStorage.getItem('project.github.chrome_dino.high_score')) || 0;
                if (highScore >= 500) {
                    task.isCompleted = true;
                    localStorage.setItem('record500DPSCompleted', 'true');
                    totalDPS += task.dps;
                    totalTaskEarnings += task.dps;
                    
                    localStorage.setItem('totalDPS', totalDPS.toString());
                    localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
                    
                    updateTotalScore();
                    updateTaskEarningsDisplay();
                    renderTasks(category);
                    saveTasks();
                    
                    alert(`Вы получили ${task.dps} DPS за выполнение задания!`);
                } else {
                    alert(`Ваш текущий рекорд: ${highScore} DPS. Продолжайте играть, чтобы достичь 500 DPS!`);
                }
            } else if (task.name === "Набрать 1000 DPS за игру" && !task.isCompleted) {
                const highScore = parseInt(localStorage.getItem('project.github.chrome_dino.high_score')) || 0;
                if (highScore >= 1000) {
                    task.isCompleted = true;
                    localStorage.setItem('record1000DPSCompleted', 'true');
                    totalDPS += task.dps;
                    totalTaskEarnings += task.dps;
                    
                    localStorage.setItem('totalDPS', totalDPS.toString());
                    localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
                    
                    updateTotalScore();
                    updateTaskEarningsDisplay();
                    renderTasks(category);
                    saveTasks();
                    
                    alert(`Вы получили ${task.dps} DPS за выполнение задания!`);
                } else {
                    alert(`Ваш текущий рекорд: ${highScore} DPS. Продолжайте играть, чтобы достичь 1000 DPS!`);
                }
            } else {
                const earnedDPS = task.dps;
                totalDPS += earnedDPS;
                totalTaskEarnings += earnedDPS;
                task.progress++;
                if (task.progress > task.maxProgress) {
                    task.progress = 1;
                    task.dps = 150;
                } else {
                    task.dps += 150;
                }

                task.cooldown = 20;
                localStorage.setItem('totalDPS', totalDPS.toString());
                localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
                
                // Используем setTimeout для гарантированного бновления после изменения данных
                setTimeout(() => {
                    updateTotalScore();
                    updateTaskEarningsDisplay();
                    renderTasks(category);
                }, 0);
                
                saveDailyTask();
            }
        }
    }

    function completeLinkedTask(task, category) {
        task.isCompleted = true;
        const taskKey = task.name === "Сыграть в LITWIN" ? 'litwinTaskCompleted' : 'methodTaskCompleted';
        localStorage.setItem(taskKey, 'true');
        totalDPS += task.dps;
        totalTaskEarnings += task.dps;
        
        localStorage.setItem('totalDPS', totalDPS.toString());
        localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
        
        updateTotalScore();
        updateTaskEarningsDisplay();
        renderTasks(category);
        saveTasks();
        
        alert(`Вы получили ${task.dps} DPS за выполнение задания!`);
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
            
            // Обновляем отображение после смены категории
            updateTaskScoreDisplay();
            updateTaskEarningsDisplay();
        });
    });

    // Инициализация с задачами "Daily"
    renderTasks('daily');

    // ункция для симуляции игры  обновления баланса
    function playGame() {
        const score = Math.floor(Math.random() * 100) + 1; // Случайный счет от 1 до 100
        totalDPS += score;
        totalGameEarnings += score;
        localStorage.setItem('totalGameEarnings', totalGameEarnings);
        updateGameEarningsDisplay();
        updateTotalScore();
        alert(`Вы аработали ${score} DPS! Ваш новый баланс: ${totalDPS} DPS`);
    }

    // Добавляем обработчик для кнопки "Play Game" (предполагается, что такая кнопка есть в HTML)
    const playButton = document.querySelector('#playGameButton');
    if (playButton) {
        playButton.addEventListener('click', playGame);
    }

    // Добавляем обработчик для обновления счета при возвращении а главную страницу
    document.querySelector('button[data-page="main"]').addEventListener('click', () => {
        totalDPS = parseInt(localStorage.getItem('totalDPS')) || 0;
        totalTaskEarnings = parseInt(localStorage.getItem('totalTaskEarnings')) || 0;
        updateTotalScore();
        updateTaskScoreDisplay();
        updateTaskEarningsDisplay();
    });

    // бновям интервал для обновления таймеров
    setInterval(() => {
        if (currentCategory === 'daily') {
            updateDailyTask();
        }
        renderTasks(currentCategory); // Использу текущую атегорию
    }, 1000);
});

// Добавляем переменные для отслеживания заработанных денег
// Заработанные деньги за игры
let totalTaskEarnings = parseInt(localStorage.getItem('totalTaskEarnings')) || 0; // Заработанные деньги за задания
let totalInviteEarnings = parseInt(localStorage.getItem('totalInviteEarnings')) || 0; // Заработанные деньги за приглашения



// Функция для обновления заработанных денег за задания



// Функция для обновления заработанных денег за приглашения
function updateInviteEarnings(amount) {
    totalInviteEarnings += amount;
    localStorage.setItem('totalInviteEarnings', totalInviteEarnings);
    updateEarningsDisplay();
}

// Пример вызова функции обновления заработаных денег за задания


function updateTaskEarningsDisplay() {
    requestAnimationFrame(() => {
        const taskEarningsElement = document.getElementById('earnedDPS');
        if (taskEarningsElement) {
            taskEarningsElement.textContent = `+${totalTaskEarnings} DPS`;
        }
    });
}

function updateInviteEarningsDisplay() {
    const inviteEarningsElement = document.querySelector('.bg-yellow-400:has(.text-xs.text-black:contains("Invites")) .text-sm.font-bold.text-black');
    if (inviteEarningsElement) {
        inviteEarningsElement.textContent = `+${totalInviteEarnings} DPS`;
    }
}

// Вызов функций для обновления отображения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
   // Обновляем отображение зараотанных денег за игры
    updateTaskEarningsDisplay();
    updateInviteEarningsDisplay(); // Вызывайте эту функцию, когда ользователь зарабатывает деньги за задания
});


function updateTaskScoreDisplay() {
    const earnedDPSElement = document.getElementById('earnedDPS');
    if (earnedDPSElement) {
        earnedDPSElement.textContent = `+${totalTaskEarnings} DPS`;
    }
    
}

function updateTotalScore() {
    const totalScoreElement = document.querySelector('.text-3xl.font-bold.text-black');
    if (totalScoreElement) {
        totalScoreElement.textContent = `${totalDPS} DPS`;
    }
    updateTaskScoreDisplay();
    updateTaskEarningsDisplay();
}

// Функция для обновления отображения очков за игру
function updateGameScoreDisplay() {
    const gameScoreElement = document.getElementById('gameScore');
    const totalGameEarnings = parseInt(localStorage.getItem('totalGameEarnings')) || 0; // Поучаем из localStorage
    if (gameScoreElement) {
        gameScoreElement.textContent = `+${totalGameEarnings} DPS`; // Обновяем отображение
    }
}
function saveAllData() {
    localStorage.setItem('totalDPS', totalDPS.toString());
    localStorage.setItem('tasksDPS', tasksDPS.toString());
    
}

// Вызов функций для обновления отображения при загруке страницы
document.addEventListener('DOMContentLoaded', () => {
    updateGameScoreDisplay(); // Обновляем отображение очков за игру
    updateTaskScoreDisplay();
    updateTaskEarningsDisplay();
    updateInviteEarningsDisplay(); // Вызывайте эту функцию, когда пользователь зарабатывает деньги а задания
});

// Добавляем обработчик для обновления счета при возвращении на главую страницу
document.querySelector('button[data-page="main"]').addEventListener('click', () => {
    updateGameScoreDisplay(); // Обновляем отображение очков за игру при переходе на главную страницу
    updateTaskScoreDisplay();
    updateInviteEarningsDisplay();
    totalDPS = parseInt(localStorage.getItem('totalDPS')) || 0;
    totalTaskEarnings = parseInt(localStorage.getItem('totalTaskEarnings')) || 0;
    updateTotalScore(); // Обновляем общий счет
});

// Добавьте эту функцию для обновления всех балансов
function updateAllBalances() {
    updateTotalScore();
    updateTaskEarningsDisplay();
    updateGameScoreDisplay(); // Если эта функция существует
}

// Обноте обаботчик для кнопки "Home"
document.querySelector('button[data-page="main"]').addEventListener('click', () => {
    totalDPS = parseInt(localStorage.getItem('totalDPS')) || 0;
    totalTaskEarnings = parseInt(localStorage.getItem('totalTaskEarnings')) || 0;
    updateAllBalances();
});

// Добавляем новую задачу в массив daily tasks
tasks.daily.push({
    name: "Сыграть 5 раз",
    dps: 350,
    progress: 0,
    maxProgress: 5,
    cooldown: 0,
    timer: 0,
    isTimerRunning: false
});

// Функция для обновления прогресса игровой задачи
function updateGameTaskProgress() {
    const gameTask = tasks.daily.find(task => task.name === "Сыграть 5 раз");
    if (gameTask && !gameTask.isTimerRunning && gameTask.cooldown <= 0) {
        gameTask.progress++;
        if (gameTask.progress === 1) {
            startGameTaskTimer();
        }
        if (gameTask.progress === gameTask.maxProgress) {
            gameTask.isTimerRunning = false;
            clearTimeout(gameTask.timer);
        }
        renderTasks('daily');
        saveDailyTasks();
    }
}

// Функция для запуска таймера игровой задачи
function startGameTaskTimer() {
    const gameTask = tasks.daily.find(task => task.name === "Сыграть 5 раз");
    if (gameTask && !gameTask.isTimerRunning) {
        gameTask.isTimerRunning = true;
        gameTask.timer = setTimeout(() => {
            gameTask.isTimerRunning = false;
            gameTask.progress = 0;
            renderTasks('daily');
            saveDailyTasks();
        }, 60000); // 1 минута
    }
}

// Обновляем функцию renderTasks для отображения новой задчи
function renderTasks(category) {
    // ... существующий код ...

    tasks[category].forEach((task, index) => {
        // ... существующий код ...

        if (task.name === "Сыграть 5 раз") {
            statusText = `${task.progress}/${task.maxProgress}`;
            if (task.cooldown > 0) {
                buttonText = `Кулдаун: ${task.cooldown}с`;
                buttonClass = 'bg-gray-500 text-white cursor-not-allowed';
            } else if (task.isTimerRunning) {
                buttonText = 'В процессе';
                buttonClass = 'bg-gray-500 text-white cursor-not-allowed';
            } else if (task.progress === task.maxProgress) {
                buttonText = 'Получить награду';
                buttonClass = 'bg-yellow-400 text-black';
            } else {
                buttonText = 'Нчать';
                buttonClass = 'bg-yellow-400 text-black';
            }
        }

        if (task.name === "Сыграть 25 раз") {
            let playedCount = parseInt(localStorage.getItem('playedCount')) || 0;
            statusText = `${playedCount}/${task.maxProgress}`;
            if (playedCount < task.maxProgress) {
                buttonText = 'В процессе';
                buttonClass = 'bg-gray-500 text-white cursor-not-allowed';
            } else {
                buttonText = 'Получить награду';
                buttonClass = 'bg-yellow-400 text-black';
            }
        }

        if (task.name === "Набрать 500 DPS за игру" || task.name === "Набрать 1000 DPS за игру") {
            const requiredScore = task.name === "Набрать 500 DPS за игру" ? 500 : 1000;
            const isCompleted = localStorage.getItem(`record${requiredScore}DPSCompleted`) === 'true';
            buttonText = isCompleted ? 'Выполнено' : 'Получить награду';
            buttonClass = isCompleted ? 'bg-gray-500 text-white cursor-not-allowed' : 'bg-yellow-400 text-black';
            task.isCompleted = isCompleted;
        }

        // ... существующий код ...
    });

    // ... существущий код ...
}

// Функция для загрузки задач из localStorage
function loadDailyTasks() {
    const savedTasks = JSON.parse(localStorage.getItem('dailyTasks'));
    if (savedTasks) {
        tasks.daily = savedTasks;
    } else {
        addGameTask(); // Добавляем новую задачу только если нет сохраненных задач
    }
    loadPlayedCount(); // Загружаем playedCount и обновляем задачу
    renderTasks('daily');
}

// Функция для сохранения задач в localStorage
function saveDailyTasks() {
    localStorage.setItem('dailyTasks', JSON.stringify(tasks.daily));
    localStorage.setItem('playedCount', playedCount.toString());
}

// Функция для запуска кулдауна
function startCooldown(category, index) {
    const task = tasks[category][index];
    task.cooldown = 20;
    
    const cooldownInterval = setInterval(() => {
        task.cooldown--;
        if (task.cooldown <= 0) {
            clearInterval(cooldownInterval);
        }
        renderTasks(category);
        saveDailyTasks();
    }, 1000);
}

// Функция для выполнения задачи "Сыграть 5 раз"
function completePlayGameTask(index) {
    const task = tasks.daily[index];
    if (task.name === "Сыграть 5 раз" && task.progress === task.maxProgress) {
        totalDPS += task.dps;
        totalTaskEarnings += task.dps;
        task.progress = 0;
        task.isTimerRunning = false;
        clearTimeout(task.timer);
        
        localStorage.setItem('totalDPS', totalDPS.toString());
        localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
        
        updateAllBalances();
        renderTasks('daily');
        saveDailyTask();
    }
}

// Обновляем функцию addGameTask
function addGameTask() {
    const gameTask = tasks.daily.find(task => task.name === "Сыграть 5 раз");
    if (!gameTask) {
        tasks.daily.push({
            name: "Сыграть 5 раз",
            description: "Сыграйте в игру 5 раз за 1 минуту",
            dps: 100,
            progress: 0,
            maxProgress: 5,
            isTimerRunning: false,
            cooldown: 0,
            timer: null
        });
    }
}

// Обновляем функцию updateGameTaskProgress
function updateGameTaskProgress() {
    const gameTask = tasks.daily.find(task => task.name === "Сыграть 5 раз");
    if (gameTask && !gameTask.isTimerRunning && gameTask.cooldown <= 0) {
        gameTask.progress++;
        if (gameTask.progress === 1) {
            startGameTaskTimer();
        }
        if (gameTask.progress === gameTask.maxProgress) {
            gameTask.isTimerRunning = false;
            clearTimeout(gameTask.timer);
        }
        renderTasks('daily');
        saveDailyTasks();
    }
}

// Обновляем фукцию startGameTaskTimer
function startGameTaskTimer() {
    const gameTask = tasks.daily.find(task => task.name === "Сыграть 5 раз");
    if (gameTask && !gameTask.isTimerRunning) {
        gameTask.isTimerRunning = true;
        gameTask.timer = setTimeout(() => {
            gameTask.isTimerRunning = false;
            gameTask.progress = 0;
            renderTasks('daily');
            saveDailyTasks();
        }, 60000); // 1 минута
    }
}

// Вызываем функцию загрузки задач при инициализации
document.addEventListener('DOMContentLoaded', () => {
    loadDailyTasks();
    // ... остальной код инициализации ...
});

// Обновляем обработчик потери жизни в игре
function loseLife() {
    // ... существующий код ...

    updateGameTaskProgress();
}

// ... существущий код ...

// Добавьте новую функцию:
function completePlayedCountTask(index) {
    const task = tasks.daily[index];
    if (task.name === "Сыграть 25 раз") {
        let playedCount = parseInt(localStorage.getItem('playedCount')) || 0;
        if (playedCount >= task.maxProgress) {
            totalDPS += task.dps;
            totalTaskEarnings += task.dps;
            playedCount = 0; // Сбрасываем playedCount
            
            localStorage.setItem('totalDPS', totalDPS.toString());
            localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
            localStorage.setItem('playedCount', '0');
            
            updateAllBalances();
            renderTasks('daily');
            saveDailyTasks();
        }
    }
}

// Добавьте функцию для загрузки playedCount при инициализации:
function loadPlayedCount() {
    playedCount = parseInt(localStorage.getItem('playedCount')) || 0;
    const playedCountTask = tasks.daily.find(task => task.name === "Сыграть 25 раз");
    if (playedCountTask) {
        playedCountTask.playedCount = playedCount;
        if (playedCount >= playedCountTask.maxProgress) {
            playedCountTask.isCompleted = true;
        }
    }
}

// Вызовите эту функцию при загрузке страниы:
document.addEventListener('DOMContentLoaded', () => {
    loadPlayedCount();
    renderTasks('daily');
    // ... остальной код инициализации ...
});

// Добавьте эту функцию для загрузки состояния задания при инициализации
function loadTaskState() {
    const litwinTask = tasks.social.find(task => task.name === "Сыграть в LITWIN");
    const methodTask = tasks.social.find(task => task.name === "Сыграть в Method");
    if (litwinTask) {
        litwinTask.isCompleted = localStorage.getItem('litwinTaskCompleted') === 'true';
    }
    if (methodTask) {
        methodTask.isCompleted = localStorage.getItem('methodTaskCompleted') === 'true';
    }
    const record500DPSTask = tasks.daily.find(task => task.name === "Набрать 500 DPS за игру");
    const record1000DPSTask = tasks.daily.find(task => task.name === "Набрать 1000 DPS за игру");
    if (record500DPSTask) {
        record500DPSTask.isCompleted = localStorage.getItem('record500DPSCompleted') === 'true';
    }
    if (record1000DPSTask) {
        record1000DPSTask.isCompleted = localStorage.getItem('record1000DPSCompleted') === 'true';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadTaskState(); // Добавьте эту строку
    renderTasks('daily');
    // ... остальной код инициализации ...
});
