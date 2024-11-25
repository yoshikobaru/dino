class TaskManager {
    constructor() {
        this.tasks = {
            daily: [],
            social: [],
            media: [],
            refs: []
        };
        this.loadTasks();
    }

    loadTasks() {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
            this.tasks = JSON.parse(savedTasks);
        } else {
            this.initializeDefaultTasks();
        }
    }

    initializeDefaultTasks() {
        this.tasks = {
            daily: [
                {
                    id: 'daily_bonus',
                    name: "Ежедневный бонус",
                    dps: 150,
                    progress: 1,
                    maxProgress: 7,
                    cooldown: 0,
                    bonusTime: 0,
                    type: 'daily'
                },
                {
                    id: 'play_5',
                name: "Сыграть 5 раз",
                dps: 350,
                progress: 0,
                maxProgress: 5,
                cooldown: 0,
                timer: 0,
                isTimerRunning: false,
                type: 'daily'
            },
            {
                id: 'play_25',
                name: "Сыграть 25 раз",
                dps: 750,
                progress: 0,  // Заменяем playedCount на progress
                maxProgress: 25,
                isCompleted: false,
                type: 'daily'
            },
                {
                    id: 'score_500',
                    name: "Набрать 500 DPS за игру",
                    dps: 550,
                    isCompleted: false,
                    type: 'daily'
                },
                {
                    id: 'score_1000',
                    name: "Набрать 1000 DPS за игру",
                    dps: 1750,
                    isCompleted: false,
                    type: 'daily'
                }
            ],
            social: [
                {
                    id: 'litwin_game',
                    name: "Сыграть в LITWIN",
                    dps: 350,
                    link: "https://t.me/LITWIN_TAP_BOT?start=b8683c8c", // меняем формат ссылки
                    isCompleted: false,
                    type: 'social'
                },
                {
                    id: 'method_game',
                    name: "Сыграть в Method",
                    dps: 450,
                    link: "https://t.me/MethodTon_Bot?start=p203ynnif7", // меняем формат ссылки
                    isCompleted: false,
                    type: 'social'
                }
            ],
            media: [
                {
                    id: 'method_post',
                    name: "Посмотреть новый пост в method",
                    dps: 300,
                    link: "https://t.me/method_community",
                    isCompleted: false,
                    type: 'media'
                },
                {
                    id: 'litwin_post',
                    name: "Посмотреть пост в LITWIN",
                    dps: 250,
                    link: "https://t.me/litwin_community",
                    isCompleted: false,
                    type: 'media'
                }
            ],
            refs: [
                {
                    id: 'invite_friends',
                    name: "Пригласить 3 друзей",
                    dps: 500,
                    progress: 0,
                    maxProgress: 3,
                    isCompleted: false,
                    type: 'refs', // Меняем 'friends' на 'refs'
                    description: 'Пригласите друзей и получите бонус',
                    displayProgress: true
                }
            ]
        };
        // Инициализируем dailyPlayCount при первом запуске
    if (!localStorage.getItem('dailyPlayCount')) {
        localStorage.setItem('dailyPlayCount', '0');
    }
    if (!localStorage.getItem('lastPlayCountResetDate')) {
        localStorage.setItem('lastPlayCountResetDate', new Date().toDateString());
    }
        this.saveTasks();
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    getTasks(category) {
        return this.tasks[category] || [];
    }

    updateTaskProgress(taskId, progress) {
        for (const category in this.tasks) {
            const task = this.tasks[category].find(t => t.id === taskId);
            if (task) {
                task.progress = progress;
                if (task.progress >= task.maxProgress) {
                    task.isCompleted = true;
                    this.handleTaskCompletion(task);
                }
                this.saveTasks();
                return true;
            }
        }
        return false;
    }
    checkAndUpdateReferralTask() {
        const referralTask = this.tasks.refs.find(t => t.id === 'invite_friends');
        const friendsCount = parseInt(localStorage.getItem('referredFriendsCount')) || 0;
        
        if (referralTask && !referralTask.isCompleted) {
            referralTask.progress = friendsCount;
            if (referralTask.progress >= referralTask.maxProgress) {
                referralTask.isCompleted = true;
                this.handleTaskCompletion(referralTask);
            }
            this.saveTasks();
        }
    }
    async handleTaskCompletion(task) {
        if (!task.isCompleted) return;
        
        await window.updateBalance(task.dps, task.type === 'friends' ? 'invite' : 'task');
        
        switch(task.type) {
            case 'daily':
                if (task.timer) {
                    task.isTimerRunning = false;
                    task.timer = 0;
                }
                break;
            case 'friends':
                localStorage.setItem('referralRewardClaimed', 'true');
                break;
        }
        this.saveTasks();
    }

    checkTaskCompletion(taskId) {
        for (const category in this.tasks) {
            const task = this.tasks[category].find(t => t.id === taskId);
            if (task && task.isCompleted) {
                return true;
            }
        }
        return false;
    }

    resetDailyTasks() {
        this.tasks.daily.forEach(task => {
            task.progress = 0;
            task.isCompleted = false;
            task.cooldown = 0;
            if (task.timer) {
                task.isTimerRunning = false;
                task.timer = 0;
            }
        });
        this.saveTasks();
    }

    handleTaskTimers() {
        const now = Date.now();
        this.tasks.daily.forEach(task => {
            if (task.timer && task.isTimerRunning) {
                if (now - task.timer >= 60000) { // 1 минута
                    task.progress = 0;
                    task.isTimerRunning = false;
                    task.timer = 0;
                }
            }
        });
        this.saveTasks();
    }

    // Метод для обновления игрового прогресса
    updateGameProgress(score) {
        const score500Task = this.tasks.daily.find(t => t.id === 'score_500');
        const score1000Task = this.tasks.daily.find(t => t.id === 'score_1000');

        if (score >= 500 && score500Task && !score500Task.isCompleted) {
            score500Task.isCompleted = true;
            this.handleTaskCompletion(score500Task);
        }

        if (score >= 1000 && score1000Task && !score1000Task.isCompleted) {
            score1000Task.isCompleted = true;
            this.handleTaskCompletion(score1000Task);
        }

        this.saveTasks();
    }

    // Метод для обновления количества игр
    updatePlayCount() {
        const play5Task = this.tasks.daily.find(t => t.id === 'play_5');
        const play25Task = this.tasks.daily.find(t => t.id === 'play_25');
        
        // Проверяем, был ли сброс сегодня
        const lastResetDate = localStorage.getItem('lastPlayCountResetDate');
        const today = new Date().toDateString();
        
        // Если сегодня ещё не было сброса, делаем его
        if (lastResetDate !== today) {
            console.log('Resetting all daily tasks');
            this.resetDailyTasks(); // Вызываем полный сброс всех daily тасков
            localStorage.setItem('lastPlayCountResetDate', today);
            localStorage.setItem('dailyPlayCount', '0');
        }
    
        // Получаем текущий счетчик
        const dailyPlayCount = parseInt(localStorage.getItem('dailyPlayCount') || '0');
        console.log('Current dailyPlayCount:', dailyPlayCount);
        
        // Обновляем прогресс обоих заданий используя dailyPlayCount
        if (play5Task && !play5Task.isCompleted) {
            play5Task.progress = Math.min(dailyPlayCount, play5Task.maxProgress);
            console.log('Updating play5Task progress:', play5Task.progress);
            if (play5Task.progress >= play5Task.maxProgress) {
                play5Task.isCompleted = true;
                this.handleTaskCompletion(play5Task);
            }
        }
    
        if (play25Task && !play25Task.isCompleted) {
            play25Task.progress = Math.min(dailyPlayCount, play25Task.maxProgress);
            console.log('Updating play25Task progress:', play25Task.progress);
            if (play25Task.progress >= play25Task.maxProgress) {
                play25Task.isCompleted = true;
                this.handleTaskCompletion(play25Task);
            }
        }
    
        this.saveTasks();
        
        // Принудительно обновляем отображение
        if (window.updateTaskStatuses) {
            window.updateTaskStatuses('daily');
        }
    }
    
    renderTasks(category) {
        const taskContainer = document.getElementById('taskContainer');
        if (!taskContainer) return;
    
        const tasks = this.getTasks(category);
        taskContainer.innerHTML = '';
    
        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'bg-gray-800 rounded-lg p-4 flex items-center justify-between';
            
            let progressHtml = '';
            if (task.displayProgress) {
                progressHtml = `<div class="text-sm text-gray-400">${task.progress}/${task.maxProgress}</div>`;
            }
    
            let timerHtml = '';
            if (task.timer && task.isTimerRunning) {
                timerHtml = `<div class="timer text-sm text-gray-400">⏱️ ${Math.ceil((60000 - (Date.now() - task.timer)) / 1000)}s</div>`;
            }
    
            taskElement.innerHTML = `
                <div class="flex items-center flex-grow">
                    <div class="mr-4">
                        <div class="text-sm">${task.name}</div>
                        <div class="text-xs text-yellow-400">+${task.dps} DPS</div>
                        ${progressHtml}
                        ${timerHtml}
                    </div>
                </div>
                <button class="bg-yellow-400 text-black px-4 py-2 rounded-full text-sm font-bold ${task.isCompleted ? 'opacity-50 cursor-not-allowed' : ''}" 
                    ${task.isCompleted ? 'disabled' : ''} 
                    data-task-id="${task.id}">
                    ${task.isCompleted ? 'Completed' : 'Complete'}
                </button>
            `;
    
            const button = taskElement.querySelector('button');
            if (button && !task.isCompleted) {
                button.addEventListener('click', async () => {
                    if (task.type === 'social' || task.type === 'media') {
                        const link = this.handleSocialAction(task.id);
                        if (link) {
                            window.open(link, '_blank');
                        }
                    } else if (task.type === 'daily') {
                        await this.handleDailyTask(task);
                    } else if (task.type === 'refs') { // Добавляем обработку для refs
                        await this.handleRefsTask(task);
                    }
                    this.renderTasks(category);
                });
            }
    
            taskContainer.appendChild(taskElement);
        });
    }
    async handleRefsTask(task) {
        if (task.isCompleted) return;
        
        if (task.id === 'invite_friends') {
            // Получаем количество приглашенных друзей из localStorage
            const friendsCount = parseInt(localStorage.getItem('referredFriendsCount')) || 0;
            task.progress = friendsCount; // Обновляем прогресс таска
            
            if (friendsCount < task.maxProgress) {
                window.showPopup(`У вас недостаточно друзей, ваше текущее количество - ${friendsCount} из ${task.maxProgress}`);
                return;
            }
    
            // Если достаточно друзей, выполняем таск
            task.isCompleted = true;
            await this.handleTaskCompletion(task);
            this.saveTasks();
            window.showPopup('Поздравляем! Вы выполнили задание по приглашению друзей!');
        }
    }
    async handleDailyTask(task) {
        if (task.isCompleted) return;
    
        // Специальная обработка для тасков на количество игр
        if (task.id === 'play_5' || task.id === 'play_25') {
            const dailyPlayCount = parseInt(localStorage.getItem('dailyPlayCount')) || 0;
            const requiredGames = task.id === 'play_5' ? 5 : 25;
    
            if (dailyPlayCount < requiredGames) {
                window.showPopup(
                    `Вы сыграли ${dailyPlayCount} из ${requiredGames} раз\n` +
                    'Продолжайте играть, чтобы выполнить задание!'
                );
                return;
            }
        }
    
        // Специальная обработка для тасков на рекорд DPS
        if (task.id === 'score_500' || task.id === 'score_1000') {
            const highScore = parseInt(localStorage.getItem('project.github.chrome_dino.high_score')) || 0;
            const requiredScore = task.id === 'score_500' ? 500 : 1000;
    
            if (task.id === 'score_1000') {
                const score500Task = this.tasks.daily.find(t => t.id === 'score_500');
                if (!score500Task.isCompleted) {
                    window.showPopup('Сначала выполните задание "Набрать 500 DPS за игру"!');
                    return;
                }
            }
    
            if (highScore < requiredScore) {
                window.showPopup(
                    `Ваш текущий рекорд: ${highScore} DPS\n` +
                    `Продолжайте играть, чтобы достичь ${requiredScore} DPS!`
                );
                return;
            }
        }
    
        // Обработка остальных ежедневных тасков
        if (task.progress !== undefined) {
            task.progress++;
            if (task.progress >= task.maxProgress) {
                task.isCompleted = true;
                await this.handleTaskCompletion(task);
            }
        } else {
            task.isCompleted = true;
            await this.handleTaskCompletion(task);
        }
        this.saveTasks();
    }
    // Метод для обработки социальных действий
    handleSocialAction(taskId) {
        const task = this.tasks.social.find(t => t.id === taskId) || 
                    this.tasks.media.find(t => t.id === taskId);
        
        if (task && !task.isCompleted) {
            if (window.Telegram?.WebApp?.ready) {
                try {
                    // Дожидаемся готовности WebApp
                    window.Telegram.WebApp.ready();
                    // Используем openLink для всех ссылок
                    window.Telegram.WebApp.openLink(task.link);
                    
                    task.isCompleted = true;
                    this.handleTaskCompletion(task);
                    this.saveTasks();
                } catch (error) {
                    console.error('Error opening link:', error);
                    // В случае ошибки просто открываем ссылку в новом окне
                    window.open(task.link, '_blank');
                }
            } else {
                // Если WebApp не готов, используем обычное открытие ссылки
                window.open(task.link, '_blank');
            }
        }
        return null;
    }

    // Метод для обновления реферальных заданий
    updateReferralProgress(count) {
        const referralTask = this.tasks.refs.find(t => t.id === 'invite_friends');
        if (referralTask && !referralTask.isCompleted) {
            referralTask.progress = count;
            if (referralTask.progress >= referralTask.maxProgress) {
                this.handleTaskCompletion(referralTask);
            }
            this.saveTasks();
        }
    }
}

const taskManager = new TaskManager();
export default taskManager;