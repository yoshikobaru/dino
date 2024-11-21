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
        
        // Устанавливаем аватар пользователя
        if (userAvatarElement && user.photo_url) {
            const img = document.createElement('img');
            img.src = user.photo_url;
            img.alt = 'User avatar';
            img.className = 'w-full h-full object-cover';
            userAvatarElement.appendChild(img);
        } else if (userAvatarElement) {
            // Если аватара нет, показываем первую букву имени
            userAvatarElement.innerHTML = `
                <div class="w-full h-full bg-yellow-400 flex items-center justify-center text-black font-bold">
                    ${(user.first_name || 'U')[0].toUpperCase()}
                </div>
            `;
        }
    }
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

    // Управляем видимостью кнопки магазина
    const shopButton = document.getElementById('shopButton');
    if (shopButton) {
        if (pageName === 'game') {
            shopButton.classList.remove('hidden');
            loadGame();
            updateAvailableGamesDisplay();
            updateTimer();
            updateStartButtonState();
        } else {
            shopButton.classList.add('hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeMainPage();
    showPage('main');
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        // Устанавливаем полностью черный цвет для заголовка и фона
        window.Telegram.WebApp.setHeaderColor('#000000');
        window.Telegram.WebApp.setBackgroundColor('#000000');
        
        // Запрещаем случайное закрытие свайпом
        window.Telegram.WebApp.expand(); // Разворачиваем на полный экран
    }
    
    loadDailyTasks(); // Загружаем задачи и добавляем новую, если её нет
    
    // Загружаем сохраненные значения
    totalDPS = parseInt(localStorage.getItem('totalDPS')) || 0;
    totalTaskEarnings = parseInt(localStorage.getItem('totalTaskEarnings')) || 0;
    totalInviteEarnings = parseInt(localStorage.getItem('totalInviteEarnings')) || 0;
    
    // Обновляем отображение
    updateTotalScore();
    updateTaskEarningsDisplay();
    updateInviteEarningsDisplay();
});

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
    let totalDPS = parseInt(localStorage.getItem('totalDPS')) || 0;
   
    // Функция для обновления отображения общего счета
    function updateTotalScore() {
        const totalScoreElement = document.querySelector('.text-3xl.font-bold.text-black');
        if (totalScoreElement) {
            totalScoreElement.textContent = `${totalDPS} DPS`;
        }
        updateTaskScoreDisplay();
        
    }
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
            { 
                name: "Посмотреть новый пост в method", 
                dps: 300,
                link: "https://t.me/method_community",
                webLink: "https://t.me/method_community",
                isCompleted: false
            },
            { 
                name: "Посмотреть пост в LITWIN", 
                dps: 250,
                link: "https://t.me/litwin_community",
                webLink: "https://t.me/litwin_community",
                isCompleted: false
            }
        ],
        refs: [
            { 
                name: "Пригласить 3 друзей", 
                dps: 500,
                progress: 0,
                maxProgress: 3,
                isCompleted: false,
                type: 'friends',
                description: 'Пригласите друзей и получите бонус',
                displayProgress: true
            }
           
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
            
            if (task.name === "Пригласить 3 друзей") {
                const friendsCount = parseInt(localStorage.getItem('referredFriendsCount')) || 0;
                statusText = `${friendsCount}/${task.maxProgress}`;
                
                // Проверяем сохраненное состояние выполнения
                const isTaskCompleted = localStorage.getItem('friendsTaskCompleted') === 'true';
                
                if (friendsCount >= task.maxProgress) {
                    if (!isTaskCompleted) {
                        buttonText = 'Получить награду';
                        buttonClass = 'bg-yellow-400 text-black';
                    } else {
                        buttonText = 'Выполнено';
                        buttonClass = 'bg-gray-500 text-white cursor-not-allowed';
                        task.isCompleted = true; // Устанавливаем флаг выполнения
                    }
                } else {
                    buttonText = 'В процессе';
                    buttonClass = 'bg-gray-500 text-white cursor-not-allowed';
                }
            }
            else if (task.cooldown > 0) {
                statusText = 'Cooldown';
                buttonClass = 'bg-gray-500 text-white cursor-not-allowed';
            } else if (task.bonusTime > 0) {
                statusText = 'Bonus Time!';
            }
            
            if (task.name === "Сыграть 5 раз") {
                let gameProgress = parseInt(localStorage.getItem('gameProgress')) || 0;
                const gameTaskStartTime = parseInt(localStorage.getItem('gameTaskStartTime')) || 0;
                const taskCooldown = parseInt(localStorage.getItem('gameTaskCooldown')) || 0;
                
                // Проверяем, не истекла ли минута
                if (gameTaskStartTime > 0) {
                    const now = Date.now();
                    const timeElapsed = now - gameTaskStartTime;
                    
                    // Если прошла минута, сбрасываем прогресс
                    if (timeElapsed >= 43200000) {
                        gameProgress = 0;
                        localStorage.setItem('gameProgress', '0');
                        localStorage.setItem('gameTaskStartTime', '0');
                    }
                }
                
                // Проверяем кулдаун
                if (taskCooldown > Date.now()) {
                    const cooldownLeft = Math.ceil((taskCooldown - Date.now()) / 3600000);
                    statusText = `Кулдаун: ${cooldownLeft}ч`;
                    buttonText = 'Подождите';
                    buttonClass = 'bg-gray-500 text-white cursor-not-allowed';
                } else {
                    let timeLeft = '';
                    if (gameTaskStartTime > 0) {
                        const now = Date.now();
                        const timeElapsed = now - gameTaskStartTime;
                        const remainingTime = Math.max(0, Math.ceil((43200000 - timeElapsed) / 3600000));
                        timeLeft = ` (${remainingTime}ч)`;
                    }
                    
                    statusText = `${gameProgress}/5${timeLeft}`;
                    
                    if (gameProgress >= 5) {
                        buttonText = 'Получить награду';
                        buttonClass = 'bg-yellow-400 text-black';
                    } else if (gameTaskStartTime > 0) {
                        buttonText = 'В процессе';
                        buttonClass = 'bg-gray-500 text-white cursor-not-allowed';
                    } else {
                        buttonText = 'Начать';
                        buttonClass = 'bg-yellow-400 text-black';
                    }
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
            
            if (task.name === "Посмотреть новый пост в method" || task.name === "Посмотреть пост в LITWIN") {
                const storageKey = task.name === "Посмотреть новый пот в method" ? 'methodPostTaskCompleted' : 'litwinPostTaskCompleted';
                const isCompleted = localStorage.getItem(storageKey) === 'true';
                buttonText = isCompleted ? 'Выполнено' : 'Start';
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
                    
                    if (task.name === "Пригласить 3 друзей") {
                        const friendsCount = parseInt(localStorage.getItem('referredFriendsCount')) || 0;
                        if (friendsCount >= task.maxProgress && !task.isCompleted) {
                            task.isCompleted = true;
                            localStorage.setItem('friendsTaskCompleted', 'true');
                            totalDPS += task.dps;
                            totalTaskEarnings += task.dps;
                            localStorage.setItem('totalDPS', totalDPS.toString());
                            localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
                            updateAllBalances();
                            renderTasks(category);
                        }
                    } else if (category === 'social') {
                        // Открываем ссылку
                        const isTelegramWebApp = window.Telegram && window.Telegram.WebApp;
                        const linkToUse = isTelegramWebApp ? task.link : task.webLink;
                        
                        // Начисляем DPS и сохраняем статус
                        if (task.name === "Сыграть в LITWIN") { // Изменено с includes на строгое сравнение
                            totalDPS += task.dps;
                            totalTaskEarnings += task.dps;
                            localStorage.setItem('totalDPS', totalDPS.toString());
                            localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
                            localStorage.setItem('litwinTaskCompleted', 'true'); // Убедимся, что это выполняется
                            task.isCompleted = true; // Добавляем установку флага в объекте задания
                        } else if (task.name === "Сыграть в Method") { // Изменено с includes на строгое сравнение
                            totalDPS += task.dps;
                            totalTaskEarnings += task.dps;
                            localStorage.setItem('totalDPS', totalDPS.toString());
                            localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
                            localStorage.setItem('methodTaskCompleted', 'true');
                            task.isCompleted = true; // Добавляем установку флага в объекте задания
                        }
                        
                        // Обновляем отображение
                        updateTotalScore();
                        updateTaskEarningsDisplay();
                        renderTasks(category); // Добавляем обновление отображения задач
                        
                        // Открываем ссылку
                        window.open(linkToUse, '_blank');
                        
                        return;
                    } else if (category === 'media') {
                        const task = tasks[category][index];
                        if ((task.name === "Посмотреть новый пост в method" || task.name === "Посмотреть пост в LITWIN") && !task.isCompleted) {
                            totalDPS += task.dps;
                            totalTaskEarnings += task.dps;
                            localStorage.setItem('totalDPS', totalDPS.toString());
                            localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
                            
                            const storageKey = task.name === "Посмотреть новый пост в method" ? 'methodPostTaskCompleted' : 'litwinPostTaskCompleted';
                            localStorage.setItem(storageKey, 'true');
                            task.isCompleted = true;
                            
                            updateTotalScore();
                            updateTaskEarningsDisplay();
                            renderTasks(category);
                            
                            const isTelegramWebApp = window.Telegram && window.Telegram.WebApp;
                            const linkToUse = isTelegramWebApp ? task.link : task.webLink;
                            window.open(linkToUse, '_blank');
                        }
                    } else {
                        completeTask(category, index);
                    }
                    
                    updateTaskScoreDisplay();
                    updateTaskEarningsDisplay();
                    updateTotalScore();
                }
            });

            taskContainer.appendChild(taskElement);
            taskContainer.appendChild(createSeparator());

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
            
            // Восстанавливаем бонусное время
            const bonusTimeStart = parseInt(localStorage.getItem('bonusTimeStart'));
            const bonusTimeRemaining = parseInt(localStorage.getItem('bonusTimeRemaining'));
            
            if (bonusTimeStart && bonusTimeRemaining) {
                const elapsedBonusTime = Math.floor((now - bonusTimeStart) / 1000);
                task.bonusTime = Math.max(0, bonusTimeRemaining - elapsedBonusTime);
                
                if (task.bonusTime === 0) {
                    task.progress = 1;
                    task.dps = 150;
                    localStorage.removeItem('bonusTimeStart');
                    localStorage.removeItem('bonusTimeRemaining');
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
        const now = Date.now();
        const lastUpdateTime = parseInt(localStorage.getItem('lastUpdateTime')) || now;
        const timePassed = Math.floor((now - lastUpdateTime) / 1000);

        if (task.cooldown > 0) {
            task.cooldown = Math.max(0, task.cooldown - timePassed);
            if (task.cooldown === 0) {
                task.bonusTime = 86400; // 24 часа в секундах
                localStorage.setItem('bonusTimeStart', now.toString());
                localStorage.setItem('bonusTimeRemaining', task.bonusTime.toString());
            }
        } else if (task.bonusTime > 0) {
            const bonusTimeStart = parseInt(localStorage.getItem('bonusTimeStart'));
            const elapsedBonusTime = Math.floor((now - bonusTimeStart) / 1000);
            task.bonusTime = Math.max(0, parseInt(localStorage.getItem('bonusTimeRemaining')) - elapsedBonusTime);
            
            localStorage.setItem('bonusTimeRemaining', task.bonusTime.toString());
            
            if (task.bonusTime === 0) {
                task.progress = 1;
                task.dps = 150;
                localStorage.removeItem('bonusTimeStart');
                localStorage.removeItem('bonusTimeRemaining');
            }
        }

        localStorage.setItem('lastUpdateTime', now.toString());
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

    // ункция для обновния заработанных денег за задачи
   

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
        
        // Специальная обработка для ежедневного бонуса
        if (task.name === "Ежедневный бонус") {
            const earnedDPS = task.dps;
            totalDPS += earnedDPS;
            totalTaskEarnings += earnedDPS;
            
            // Обновляем состояние задания
            task.progress++;
            if (task.progress > task.maxProgress) {
                task.progress = 1;
                task.dps = 150;
            } else {
                task.dps += 150;
            }

            // Изменяем кулдаун на 24 часа (в секундах)
            task.cooldown = 86400; // 24 часа * 60 минут * 60 секунд
            
            // Сохраняем все изменения одним блоком
            localStorage.setItem('totalDPS', totalDPS.toString());
            localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
            
            // Делаем одно обновление интерфейса
            requestAnimationFrame(() => {
                updateTotalScore();
                updateTaskEarningsDisplay();
                renderTasks(category);
                saveDailyTask();
            });
            
            return;
        }
        
        if (category === 'social') {
            // Открываем ссылку
            const isTelegramWebApp = window.Telegram && window.Telegram.WebApp;
            const linkToUse = isTelegramWebApp ? task.link : task.webLink;
            
            // Начисляем DPS и сохраняем статус
            if (task.name === "Сыграть в LITWIN") { // Изменено с includes на строгое сравнение
                totalDPS += task.dps;
                totalTaskEarnings += task.dps;
                localStorage.setItem('totalDPS', totalDPS.toString());
                localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
                localStorage.setItem('litwinTaskCompleted', 'true'); // Убедимся, что это выполняется
                task.isCompleted = true; // Добавляем установку флага в объекте задания
            } else if (task.name === "Сыграть в Method") { // Изменено с includes на строгое сравнение
                totalDPS += task.dps;
                totalTaskEarnings += task.dps;
                localStorage.setItem('totalDPS', totalDPS.toString());
                localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
                localStorage.setItem('methodTaskCompleted', 'true');
                task.isCompleted = true; // Добавляем установку флага в объекте задания
            }
            
            // Обновляем отображение
            updateTotalScore();
            updateTaskEarningsDisplay();
            renderTasks(category); // Добавляем обновление отображения задач
            
            // Открываем ссылку
            window.open(linkToUse, '_blank');
            
            return;
        }
        
        if (task.name === "Сыграть 5 раз") {
            const gameProgress = parseInt(localStorage.getItem('gameProgress')) || 0;
            const taskCooldown = parseInt(localStorage.getItem('gameTaskCooldown')) || 0;
            
            // Проверяем, не на кулдауне ли задача
            if (taskCooldown > Date.now()) {
                return;
            }
            
            if (gameProgress >= 5) {
                totalDPS += task.dps;
                totalTaskEarnings += task.dps;
                
                // Сбрасываем прогресс и время
                localStorage.setItem('gameProgress', '0');
                localStorage.setItem('gameTaskStartTime', '0');
                
                // Устанавливаем кулдаун и сразу сбрасываем прогресс
                // Изменяем время кулдауна с 10000 на 43200000 (12 часов)
                localStorage.setItem('gameTaskCooldown', (Date.now() + 43200000).toString());
                localStorage.setItem('gameProgress', '0');
                
                localStorage.setItem('totalDPS', totalDPS.toString());
                localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
                
                updateAllBalances();
                renderTasks(category);
                
                showPopup(`Поздравляем! Вы получили ${task.dps} DPS за выполнение задания!`);
            }
        } else if (task.name === "Сыграть 25 раз") {
            let playedCount = parseInt(localStorage.getItem('playedCount')) || 0;
            if (playedCount >= task.maxProgress && !task.isCompleted) {
                totalDPS += task.dps;
                totalTaskEarnings += task.dps;
                
                localStorage.setItem('totalDPS', totalDPS.toString());
                localStorage.setItem('totalTaskEarnings', totalTaskEarnings.toString());
                
                task.isCompleted = true;
                localStorage.setItem('playedCount', '0');
                
                updateTotalScore();
                updateTaskEarningsDisplay();
                renderTasks(category);
                
                showPopup(`Поздравляем! Вы получили ${task.dps} DPS за выполнение задания!`);
            }
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
                
                showPopup(`Вы получили ${task.dps} DPS за выполнение задания!`);
            } else {
                showPopup(`Ваш текущий рекорд: ${highScore} DPS. Продолжайте играть, чтобы достичь 500 DPS!`);
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
                
                showPopup(`Вы получили ${task.dps} DPS за выполнение задания!`);
            } else {
                showPopup(`Ваш текущий рекорд: ${highScore} DPS. Продолжайте играть, чтобы достичь 1000 DPS!`);
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
            
            // Используем setTimeout для гарантированного бновления поле изменения данных
            setTimeout(() => {
                updateTotalScore();
                updateTaskEarningsDisplay();
                renderTasks(category);
            }, 0);
            
            saveDailyTask();
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
        
        showPopup(`Вы получили ${task.dps} DPS за выполнение задания!`);
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
        showPopup(`Вы аработали ${score} DPS! Ваш новый баланс: ${totalDPS} DPS`);
    }

    // Добавляем обработчик для кнопк "Play Game" (предполагается, что такая кнопка есть в HTML)
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

    setInterval(() => {
        if (currentCategory === 'daily') {
            updateDailyTask();
        }
        renderTasks(currentCategory); 
    }, 500);
});
let totalTaskEarnings = parseInt(localStorage.getItem('totalTaskEarnings')) || 0; // Заработанные деньги за задания
let totalInviteEarnings = parseInt(localStorage.getItem('totalInviteEarnings')) || 0; // Заработанные деньги за приглашения

function updateInviteEarnings(amount) {
    totalInviteEarnings = parseInt(localStorage.getItem('totalInviteEarnings')) || 0;
    totalInviteEarnings += amount;
    localStorage.setItem('totalInviteEarnings', totalInviteEarnings.toString());
    updateInviteEarningsDisplay();
}
function updateTaskEarningsDisplay() {
    requestAnimationFrame(() => {
        const taskEarningsElement = document.getElementById('earnedDPS');
        if (taskEarningsElement) {
            taskEarningsElement.textContent = `+${totalTaskEarnings} DPS`;
        }
    });
}

function updateInviteEarningsDisplay() {
    const inviteEarningsElement = document.getElementById('inviteEarnings');
    if (inviteEarningsElement) {
        const totalInviteEarnings = parseInt(localStorage.getItem('totalInviteEarnings')) || 0;
        inviteEarningsElement.textContent = `+${totalInviteEarnings} DPS`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateTaskEarningsDisplay();
    updateInviteEarningsDisplay(); 
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

function updateGameScoreDisplay() {
    const gameScoreElement = document.getElementById('gameScore');
    const totalGameEarnings = parseInt(localStorage.getItem('totalGameEarnings')) || 0; 
    if (gameScoreElement) {
        gameScoreElement.textContent = `+${totalGameEarnings} DPS`; 
    }
}
function saveAllData() {
    localStorage.setItem('totalDPS', totalDPS.toString());
    localStorage.setItem('tasksDPS', tasksDPS.toString());
    
}

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
    totalInviteEarnings = parseInt(localStorage.getItem('totalInviteEarnings')) || 0;
    updateAllBalances();
});

// Добавьте эу функцию для обновления всех балансов
function updateAllBalances() {
    updateTotalScore();
    updateTaskEarningsDisplay();
    updateGameScoreDisplay(); // Если эта функция существует
    updateInviteEarningsDisplay();
}

// Обноте обаботчик для кнопк "Home"
document.querySelector('button[data-page="main"]').addEventListener('click', () => {
    totalDPS = parseInt(localStorage.getItem('totalDPS')) || 0;
    totalTaskEarnings = parseInt(localStorage.getItem('totalTaskEarnings')) || 0;
    totalInviteEarnings = parseInt(localStorage.getItem('totalInviteEarnings')) || 0;
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
    tasks[category].forEach((task, index) => {
        if (task.name === "Сыграть 5 раз") {
            let gameProgress = parseInt(localStorage.getItem('gameProgress')) || 0;
            const gameTaskStartTime = parseInt(localStorage.getItem('gameTaskStartTime')) || 0;
            const taskCooldown = parseInt(localStorage.getItem('gameTaskCooldown')) || 0;
            
            // Проверяем, не истекла ли минута
            if (gameTaskStartTime > 0) {
                const now = Date.now();
                const timeElapsed = now - gameTaskStartTime;
                
                // Если прошла минута, сбрасываем прогресс
                if (timeElapsed >= 43200000) {
                    gameProgress = 0;
                    localStorage.setItem('gameProgress', '0');
                    localStorage.setItem('gameTaskStartTime', '0');
                }
            }
            
            // Проверяем оончание кулдауна
            if (taskCooldown > 0 && Date.now() > taskCooldown) {
                // Кулдаун закончился, сбрасываем прогресс
                localStorage.setItem('gameProgress', '0');
                localStorage.setItem('gameTaskStartTime', '0');
                localStorage.setItem('gameTaskCooldown', '0');
            }
            
            let statusText = '';
            let buttonText = '';
            let buttonClass = '';
            
            // Проверяем кулдаун
            if (taskCooldown > Date.now()) {
                const cooldownLeft = Math.ceil((taskCooldown - Date.now()) / 3600000);
                statusText = `Кулдаун: ${cooldownLeft}ч`;
                buttonText = 'Подождите';
                buttonClass = 'bg-gray-500 text-white cursor-not-allowed';
            } else {
                let timeLeft = '';
                if (gameTaskStartTime > 0) {
                    const now = Date.now();
                    const timeElapsed = now - gameTaskStartTime;
                    const remainingTime = Math.max(0, Math.ceil((43200000 - timeElapsed) / 3600000));
                    timeLeft = ` (${remainingTime}ч)`;
                }
                
                statusText = `${gameProgress}/5${timeLeft}`;
                
                if (gameProgress >= 5) {
                    buttonText = 'Получить награду';
                    buttonClass = 'bg-yellow-400 text-black';
                } else if (gameTaskStartTime > 0) {
                    buttonText = 'В процессе';
                    buttonClass = 'bg-gray-500 text-white cursor-not-allowed';
                } else {
                    buttonText = 'Начать';
                    buttonClass = 'bg-yellow-400 text-black';
                }
            }
        }
    });
}

function loadDailyTasks() {
    const savedTasks = JSON.parse(localStorage.getItem('dailyTasks'));
    if (savedTasks) {
        tasks.daily = savedTasks;
    } else {
        addGameTask(); 
    }
    loadPlayedCount(); 
    renderTasks('daily');
}

// Функция для сохранения задч в localStorage
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
        }, 60000); // 1 минуа
    }
}

// Вызываем функцию загрузки задач при инициализации
document.addEventListener('DOMContentLoaded', () => {
    loadDailyTasks();
});

function loseLife() {

    updateGameTaskProgress();
}

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
//
// Вызовите эту функцию при загрузке страниы:
document.addEventListener('DOMContentLoaded', () => {
    loadPlayedCount();
    renderTasks('daily');
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
    const methodPostTask = tasks.media.find(task => task.name === "Посмотреть новый пост в method");
    const litwinPostTask = tasks.media.find(task => task.name === "Посмотреть пост в LITWIN");
    
    if (methodPostTask) {
        methodPostTask.isCompleted = localStorage.getItem('methodPostTaskCompleted') === 'true';
    }
    if (litwinPostTask) {
        litwinPostTask.isCompleted = localStorage.getItem('litwinPostTaskCompleted') === 'true';
    }
    const friendsTask = tasks.refs.find(task => task.name === "Пригласить 3 друзей");
    if (friendsTask) {
        friendsTask.isCompleted = localStorage.getItem('friendsTaskCompleted') === 'true';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadTaskState(); 
    renderTasks('daily');
});

// Добавим функцию проверки кулдауна
function isTaskOnCooldown() {
    const taskCooldown = parseInt(localStorage.getItem('gameTaskCooldown')) || 0;
    return taskCooldown > Date.now();
}
function incrementGameProgress() {
    const taskCooldown = parseInt(localStorage.getItem('gameTaskCooldown')) || 0;
    const currentTime = Date.now();

    // Если кулдаун только что закончился, сбрасываем прогресс
    if (taskCooldown > 0 && currentTime > taskCooldown) {
        localStorage.setItem('gameProgress', '0');
        localStorage.setItem('gameTaskStartTime', '0');
        localStorage.setItem('gameTaskCooldown', '0');
        return; // Прерываем выполнение функции, чтобы не увеличивать прогресс сразу
    }

    // Проверяем, нет ли активного кулдауна
    if (taskCooldown > currentTime) {
        return; // Если кулдаун активен, не увеличиваем прогресс
    }

    const currentProgress = parseInt(localStorage.getItem('gameProgress')) || 0;
    if (currentProgress < 5) {
        localStorage.setItem('gameProgress', Math.min(currentProgress + 1, 5).toString());
        if (currentProgress === 0) {
            localStorage.setItem('gameTaskStartTime', Date.now().toString());
        }
    }
}







