class TaskManager {
    constructor() {
        this.tasks = {
            daily: [],
            social: [],
            media: [],
            refs: []
        };
        this.loadTasks();
        this.initializeGameLevelTask();
    }

    initializeGameLevelTask() {
        // Инициализация уровня и прогресса, если их нет
        if (!localStorage.getItem('gameLevelProgress')) {
            localStorage.setItem('gameLevelProgress', '0');
        }
        if (!localStorage.getItem('gameLevel')) {
            localStorage.setItem('gameLevel', '1');
        }
    }

    loadTasks() {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
            const defaultTasks = {
                daily: [
                    { id: 'game_level', icon: '🎮' },
                    { id: 'score_500', icon: '🏃' },
                    { id: 'score_1000', icon: '🚀' }
                ],
                social: [
                    { id: 'root_game', icon: '🎲' },
                    { id: 'panda_game', icon: '🎲' }
                ],
                media: [
                    { id: 'dino_rush_news', icon: '📰' },
                    { id: 'root_community', icon: '📱' },
                    { id: 'timber_panda', icon: '📱' }
                ],
                refs: [
                    { id: 'invite_friends', icon: '👥' }
                ]
            };
    
            const savedTasksObj = JSON.parse(savedTasks);
    
            // Восстанавливаем состояния для всех категорий
            ['daily', 'social', 'media', 'refs'].forEach(category => {
                if (savedTasksObj[category]) {
                    savedTasksObj[category] = savedTasksObj[category].map(task => {
                        const defaultTask = defaultTasks[category].find(d => d.id === task.id);
                        return {
                            ...task,
                            icon: defaultTask ? defaultTask.icon : '📋',
                            isCompleted: task.isCompleted || false,
                            progress: task.progress || 0,
                            maxProgress: task.maxProgress || 0,
                            cooldown: task.cooldown || 0,
                            timer: task.timer || 0,
                            isTimerRunning: task.isTimerRunning || false,
                            bonusTime: task.bonusTime || 0,
                            type: category
                        };
                    });
                }
            });
    
            this.tasks = savedTasksObj;
        } else {
            this.initializeDefaultTasks();
        }
        
        // Проверяем и инициализируем счетчик игр
        if (!localStorage.getItem('dailyPlayCount')) {
            localStorage.setItem('dailyPlayCount', '0');
        }
        if (!localStorage.getItem('lastPlayCountResetDate')) {
            localStorage.setItem('lastPlayCountResetDate', new Date().toDateString());
        }
    
        // Принудительно сохраняем после загрузки
        this.saveTasks();
    }

    initializeDefaultTasks() {
        this.tasks = {
            daily: [
                {
                    id: 'game_level',
                    name: "Play 5 times (Level 1)",
                    icon: '🎮',
                    dps: 250,
                    progress: 0,
                    maxProgress: 5,
                    isCompleted: false,
                    type: 'daily',
                    level: 1,
                    isMaxLevel: false
                },
                {
                    id: 'score_500',
                    name: "Get 500 DPS per game",
                    icon: '🏃',
                    dps: 550,
                    isCompleted: false,
                    type: 'daily'
                },
                {
                    id: 'score_1000',
                    name: "Get 1000 DPS per game",
                    icon: '🚀',
                    dps: 1750,
                    isCompleted: false,
                    type: 'daily'
                }
            ],
            social: [
                {
                    id: 'root_game',
                    name: "Play Root",
                    icon: '🎲',
                    dps: 350,
                    link: "https://t.me/RootBTC_bot",
                    isCompleted: false,
                    type: 'social'
                },
                {
                    id: 'panda_game',
                    name: "Play Panda",
                    icon: '🎲',
                    dps: 450,
                    link: "https://t.me/pandapp_gamebot",
                    isCompleted: false,
                    type: 'social'
                }
            ],
            media: [
                {
                    id: 'dino_rush_news',
                    name: "Subscribe to Dino Rush News 🦖💨",
                    icon: '📰',
                    dps: 350,
                    link: "https://t.me/DinoRushNews",
                    isCompleted: false,
                    type: 'media'
                },
                {
                    id: 'root_community',
                    name: "Subscribe to Root Community 🌳",
                    icon: '📱',
                    dps: 450,
                    link: "https://t.me/rootcommunity",
                    isCompleted: false,
                    type: 'media'
                },
                {
                    id: 'timber_panda',
                    name: "Subscribe to Timber Panda 🐼",
                    icon: '📱',
                    dps: 400,
                    link: "https://t.me/timberpanda",
                    isCompleted: false,
                    type: 'media'
                }
            ],
            refs: [
                {
                    id: 'invite_friends',
                    name: "Invite 3 friends",
                    icon: '👥',  // Группа людей для рефералов
                    dps: 500,
                    progress: 0,
                    maxProgress: 3,
                    isCompleted: false,
                    type: 'refs',
                    description: 'Invite friends and get bonus',
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

    createGameLevelTask() {
        const level = parseInt(localStorage.getItem('gameLevel')) || 1;
        const progress = parseInt(localStorage.getItem('gameLevelProgress')) || 0;
        
        const levelConfig = {
            1: { required: 5, reward: 250 },
            2: { required: 10, reward: 350 },
            3: { required: 20, reward: 450 },
            4: { required: 40, reward: 550 },
            5: { required: 60, reward: 750 },
            6: { required: 100, reward: 1000 },
            7: { required: 150, reward: 1250 },
            8: { required: 200, reward: 2000 }
        };

        const config = levelConfig[level] || levelConfig[8];
        const isMaxLevel = level >= 8;

        return {
            id: 'game_level',
            name: isMaxLevel ? "Max Level Reached!" : `Play ${config.required} times (Level ${level})`,
            icon: '🎮',
            dps: config.reward,
            progress: progress,
            maxProgress: config.required,
            isCompleted: false,
            type: 'daily',
            level: level,
            isMaxLevel: isMaxLevel
        };
    }

    saveTasks() {
        // Убедимся, что все поля сохраняются
        const tasksToSave = {
            daily: this.tasks.daily.map(task => ({
                ...task,
                isCompleted: task.isCompleted || false,
                progress: task.progress || 0,
                maxProgress: task.maxProgress || 0,
                cooldown: task.cooldown || 0,
                timer: task.timer || 0,
                isTimerRunning: task.isTimerRunning || false,
                bonusTime: task.bonusTime || 0,
                type: task.type
            })),
            social: this.tasks.social.map(task => ({
                ...task,
                isCompleted: task.isCompleted || false,
                type: task.type
            })),
            media: this.tasks.media.map(task => ({
                ...task,
                isCompleted: task.isCompleted || false,
                type: task.type
            })),
            refs: this.tasks.refs.map(task => ({
                ...task,
                isCompleted: task.isCompleted || false,
                progress: task.progress || 0,
                maxProgress: task.maxProgress || 0,
                type: task.type
            }))
        };
        
        localStorage.setItem('tasks', JSON.stringify(tasksToSave));
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
        if (!task || task.isCompleted === undefined) return;
        
        if (task.isCompleted) {
            try {
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
            } catch (error) {
                console.error('Error in handleTaskCompletion:', error);
            }
        }
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
        // Обновляем прогресс уровневого задания
        const currentProgress = parseInt(localStorage.getItem('gameLevelProgress')) || 0;
        const newProgress = currentProgress + 1;
        localStorage.setItem('gameLevelProgress', newProgress.toString());

        // Обновляем отображение задания
        const gameLevelTask = this.tasks.daily.find(t => t.id === 'game_level');
        if (gameLevelTask) {
            gameLevelTask.progress = newProgress;
            // Убираем автоматическую пометку о выполнении
            // if (gameLevelTask.progress >= gameLevelTask.maxProgress && !gameLevelTask.isCompleted) {
            //     gameLevelTask.isCompleted = true;
            // }
            this.saveTasks();
        }

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
            
            // Определяем текст кнопки в зависимости от состояния
            let buttonText;
            const buttonState = this.getTaskButtonState(task.id);

            if (buttonState === 'go' && ['dino_rush_news', 'root_community', 'timber_panda'].includes(task.id)) {
                buttonText = 'Go';
            } else {
                buttonText = task.isCompleted ? 'Completed' :
                            (task.isChecking && (task.id === 'dino_rush_news' || task.id === 'root_community' || task.id === 'timber_panda')) ? 'Check Subscription' : 
                            'Complete';
            }
            
            // Определяем, должна ли кнопка быть неактивной
            const isDisabled = task.isCompleted && !['dino_rush_news', 'root_community', 'timber_panda'].includes(task.id);
            
            taskElement.innerHTML = `
    <div class="flex items-center flex-grow">
        <div class="text-xl mr-3">${task.icon || '📋'}</div>
        <div class="mr-4">
            <div class="text-sm">${task.name}</div>
            <div class="text-xs text-yellow-400">+${task.dps} DPS</div>
            ${task.progress !== undefined ? `<div class="text-sm text-gray-400">${task.progress}/${task.maxProgress}</div>` : ''}
        </div>
    </div>
    <button class="bg-yellow-400 text-black px-4 py-2 rounded-full text-sm font-bold ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}" 
        ${isDisabled ? 'disabled' : ''} 
        data-task-id="${task.id}">
        ${buttonText}
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
                window.showPopup(`Invite more friends, your current number of friends is ${friendsCount} from ${task.maxProgress}`);
                return;
            }
    
            // Если достаточно друзей, выполняем таск
            task.isCompleted = true;
            await this.handleTaskCompletion(task);
            this.saveTasks();
            window.showPopup('Congratulations! You have completed the referral task!');
        }
    }
    async handleDailyTask(task) {
        if (task.id === 'game_level') {
            return this.handleGameLevelTask(task);
        }
        if (task.isCompleted) return;
     // Специальная обработка для ежедневного бонуса
     if (task.id === 'daily_bonus') {
        // Сразу отмечаем как выполненное и начисляем награду
        task.isCompleted = true;
        await this.handleTaskCompletion(task);
        this.saveTasks();
        return;
    }
        // Специальная обработка для тасков на количество игр
        if (task.id === 'play_5' || task.id === 'play_25') {
            const dailyPlayCount = parseInt(localStorage.getItem('dailyPlayCount')) || 0;
            const requiredGames = task.id === 'play_5' ? 5 : 25;
    
            if (dailyPlayCount < requiredGames) {
                window.showPopup(
                    `You played ${dailyPlayCount} from ${requiredGames} times\n` +
                    'Continue playing to complete the task!'
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
                    window.showPopup('First complete the "Get 500 DPS per game" task!');
                    return;
                }
            }
    
            if (highScore < requiredScore) {
                window.showPopup(
                    `Your current high score: ${highScore} DPS\n` +
                    `Continue playing to reach ${requiredScore} DPS!`
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
    async handleGameLevelTask(task) {
        if (task.isMaxLevel) {
            window.showPopup('Maximum level reached!');
            return;
        }

        const currentProgress = parseInt(localStorage.getItem('gameLevelProgress')) || 0;
        const currentLevel = parseInt(localStorage.getItem('gameLevel')) || 1;

        if (currentProgress >= task.maxProgress) {
            // Начисляем награду
            await window.updateBalance(task.dps, 'task');
            
            // Увеличиваем уровень
            const newLevel = Math.min(currentLevel + 1, 8);
            localStorage.setItem('gameLevel', newLevel.toString());
            localStorage.setItem('gameLevelProgress', '0');

            // Обновляем задание
            const newTask = this.createGameLevelTask();
            Object.assign(task, newTask);
            
            this.saveTasks();
            window.showPopup(`Level ${currentLevel} completed! Reward: +${task.dps} DPS`);
        } else {
            window.showPopup(`Progress: ${currentProgress}/${task.maxProgress}`);
        }
    }
    // Метод для обработки социальных действий
    handleSocialAction(taskId) {
        const task = this.findTaskById(taskId);
        if (!task) return null;

        // Добавляем проверку для новых социальных заданий
        if (['root_game', 'panda_game'].includes(task.id)) {
            const buttonState = this.getSocialTaskButtonState(task.id);
            
            if (buttonState === 'go') {
                // Если уже выполнено, просто открываем бота
                window.Telegram.WebApp.openTelegramLink(task.link);
                return null;
            }
            
            // Если первый раз
            task.isCompleted = true;
            this.setSocialTaskButtonState(task.id, 'go');
            this.handleTaskCompletion(task);
            this.saveTasks();
            window.Telegram.WebApp.openTelegramLink(task.link);
            return null;
        }

        // Остальная логика остается без изменений
        if (['dino_rush_news', 'root_community', 'timber_panda'].includes(task.id)) {
            const buttonState = this.getTaskButtonState(task.id);
            
            if (buttonState === 'go') {
                // Если кнопка в состоянии 'go', просто открываем ссылку
                window.Telegram.WebApp.openTelegramLink(task.link);
                return null;
            }
            
            if (!task.isChecking) {
                task.isChecking = true;
                this.saveTasks();
                window.Telegram.WebApp.openTelegramLink(task.link);
                return null;
            } else {
                this.checkChannelSubscription(task);
                return null;
            }
        }

        return task.link;
    }

    async checkChannelSubscription(task) {
        try {
            const telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
            const channelId = {
                'dino_rush_news': '@DinoRushNews',
                'root_community': '@rootcommunity',
                'timber_panda': '@timberpanda'
            }[task.id];

            const response = await fetch(`https://dino-app.ru/check-subscription?telegramId=${telegramId}&channelId=${channelId}`);
            const data = await response.json();

            if (data.isSubscribed) {
                task.isCompleted = true;
                task.isChecking = false;
                // Сохраняем состояние кнопки как 'go'
                this.setTaskButtonState(task.id, 'go');
                await this.handleTaskCompletion(task);
                this.saveTasks();
                window.showPopup('Subscription verified! Reward added to your balance.');
            } else {
                task.isChecking = false;
                window.showPopup(`Please subscribe to ${task.name.split(' ').slice(2).join(' ')} to complete this task!`);
            }
            
            if (window.updateTaskStatuses) {
                window.updateTaskStatuses('media');
            }
        } catch (error) {
            console.error('Error checking subscription:', error);
            task.isChecking = false;
            this.saveTasks();
            window.showPopup('Error checking subscription. Please try again.');
        }
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

    // Добавляем метод findTaskById
    findTaskById(taskId) {
        // Ищем задание по всем категориям
        for (const category of Object.values(this.tasks)) {
            const task = category.find(t => t.id === taskId);
            if (task) return task;
        }
        return null;
    }

    // В начале класса TaskManager добавляем метод для работы с состоянием кнопок
    setTaskButtonState(taskId, state) {
        localStorage.setItem(`button_state_${taskId}`, state);
    }

    getTaskButtonState(taskId) {
        return localStorage.getItem(`button_state_${taskId}`);
    }

    // Добавляем новые методы для социальных заданий
    setSocialTaskButtonState(taskId, state) {
        localStorage.setItem(`social_button_${taskId}`, state);
    }

    getSocialTaskButtonState(taskId) {
        return localStorage.getItem(`social_button_${taskId}`);
    }
}

const taskManager = new TaskManager();
export default taskManager;