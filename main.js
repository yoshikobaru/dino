let progressBar, balanceElement, canElement, energyElement, bubblesContainer;
let progress, balance, energy, hourlyProfit, tapProfit;
const clicksToFill = 10;

let lastExitTime, accumulatedCoins;
let totalEarnedCoins;
const progressLevels = [100000, 500000, 1000000, 5000000, 10000000];

let isOnline = true;

function initializeVariables() {
    console.log('Инициализация переменных');
    balance = parseInt(localStorage.getItem('balance')) || 0;
    if (isNaN(balance)) {
        console.warn('Баланс в localStorage некорректен, сбрасываем на 0');
        balance = 0;
        localStorage.setItem('balance', '0');
    }
    energy = parseInt(localStorage.getItem('energy')) || 100;
    hourlyProfit = parseInt(localStorage.getItem('hourlyProfit')) || 0;
    tapProfit = parseInt(localStorage.getItem('tapProfit')) || 1;
    lastExitTime = parseInt(localStorage.getItem('lastExitTime')) || Date.now();
    accumulatedCoins = parseFloat(localStorage.getItem('accumulatedCoins')) || 0;
    totalEarnedCoins = parseInt(localStorage.getItem('totalEarnedCoins')) || 0;
    console.log('Баланс после инициализации:', balance);
}

function updateBalanceDisplay(newBalance) {
    console.log('Вызвана функция updateBalanceDisplay с аргументом:', newBalance);
    
    if (typeof newBalance === 'undefined' || isNaN(newBalance)) {
        console.log('newBalance не определен или NaN, получаем значение из localStorage');
        newBalance = parseInt(localStorage.getItem('balance')) || 0;
    }
    
    newBalance = Math.max(0, Math.floor(newBalance));
    console.log('Обработанный новый баланс:', newBalance);
    
    const balanceElement = document.getElementById('balance');
    if (balanceElement) {
        balanceElement.textContent = newBalance.toLocaleString();
        console.log('Баланс обновлен в DOM:', newBalance);
    } else {
    }
    
    localStorage.setItem('balance', newBalance.toString());
    console.log('Баланс сохранен в localStorage:', newBalance);
}
function initializeMainPage() {
    console.log('Вызвана функция initializeMainPage');
    
    progressBar = document.getElementById('progressBar');
    balanceElement = document.getElementById('balance');
    canElement = document.getElementById('can');
    energyElement = document.getElementById('energy');
    bubblesContainer = document.querySelector('.bubbles');

    console.log('Найденные элементы:', {
        progressBar,
        balanceElement,
        canElement,
        energyElement,
        bubblesContainer
    });

    if (!progressBar || !balanceElement || !canElement || !energyElement || !bubblesContainer) {
        console.error('Один или несколько необходимых элементов не найдены');
        return;
    }

    initializeVariables();
    updateBalanceDisplay();
    calculateOfflineEarnings();
    startOfflineEarningInterval();

    isOnline = true;

    updateProgress();
    updateBalance();
    updateEnergy();
    updateHourlyProfit();
    updateTapProfit();
    updateUserProfile();

    canElement.addEventListener('click', handleCanClick);

    document.querySelectorAll('.footer-btn').forEach(btn => {
        btn.addEventListener('click', handleFooterButtonClick);
    });
}
function updateUserProfile() {
    if (window.Telegram && window.Telegram.WebApp) {
        const webApp = window.Telegram.WebApp;
        webApp.ready();
        
        // Проверяем, инициализированы ли данные
        if (webApp.initDataUnsafe && webApp.initDataUnsafe.user) {
            const user = webApp.initDataUnsafe.user;
            document.getElementById('profileName').textContent = user.first_name + (user.last_name ? ' ' + user.last_name : '');
            document.getElementById('profileUsername').textContent = user.username ? '@' + user.username : '';
            if (user.photo_url) {
                document.getElementById('profilePic').src = user.photo_url;
            }
        } else {
            console.error('Данные пользователя недоступны');
            // Можно добавить здесь код для отображения заглушки или сообщения об ошибке
        }
    } else {
        console.error('Telegram WebApp не инициализирован');
    }
}

// Вызываем функцию после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
    }
    updateUserProfile();
});

// Добавляем обработчик события viewportChanged
if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.onEvent('viewportChanged', updateUserProfile);
}
function updateProgress() {
    let currentLevel = 0;
    for (let i = 0; i < progressLevels.length; i++) {
        if (totalEarnedCoins >= progressLevels[i]) {
            currentLevel = i + 1;
        } else {
            break;
        }
    }

    let progressPercentage;
    if (currentLevel === progressLevels.length) {
        progressPercentage = 100;
    } else {
        const levelStart = currentLevel > 0 ? progressLevels[currentLevel - 1] : 0;
        const levelEnd = progressLevels[currentLevel];
        progressPercentage = ((totalEarnedCoins - levelStart) / (levelEnd - levelStart)) * 100;
    }

    progressBar.style.width = `${progressPercentage}%`;
    
    // Обновляем отображение текущего уровня прогресса
    const levelDisplay = document.getElementById('levelDisplay');
    if (levelDisplay) {
        levelDisplay.textContent = `Liga ${currentLevel + 1}`;
    }

    localStorage.setItem('totalEarnedCoins', totalEarnedCoins.toString());
}
function updateBalance(amount) {
    console.log('Вызвана функция updateBalance с аргументом:', amount);
    let currentBalance = parseInt(localStorage.getItem('balance')) || 0;
    if (isNaN(currentBalance)) {
        console.warn('Текущий баланс в localStorage некорректен, сбрасываем на 0');
        currentBalance = 0;
    }
    currentBalance += amount;
    updateBalanceDisplay(currentBalance);
    console.log('Новый баланс:', currentBalance);
}

function updateHourlyProfit() {
    const hourlyProfitElement = document.getElementById('hourlyProfit');
    if (hourlyProfitElement) {
        hourlyProfitElement.textContent = hourlyProfit;
    }
    localStorage.setItem('hourlyProfit', hourlyProfit.toString());
}

function updateTapProfit() {
    // Обновляем значение в профиле
    const tapProfitProfileElement = document.querySelector('.profit-item:first-child .profit-value');
    if (tapProfitProfileElement) {
        tapProfitProfileElement.innerHTML = `<img src="assets/litcoin.png" alt="LIT" class="lit-coin-small">+<span>${tapProfit}</span>`;
    }

    // Обновляем значение, которое отображается при нажатии на банку
    const tapProfitElement = document.getElementById('tapProfit');
    if (tapProfitElement) {
        tapProfitElement.textContent = tapProfit;
    }

    localStorage.setItem('tapProfit', tapProfit.toString());
}

function updateEnergy() {
    energyElement.textContent = `${energy}/100`;
    localStorage.setItem('energy', energy.toString());
}

function createBubble() {
    const bubble = document.createElement('div');
    bubble.classList.add('bubble');
    
    const size = Math.random() * 10 + 5;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    
    const startAngle = Math.random() * Math.PI * 2;
    const startRadius = 75; // Половина ширины банки
    const endRadius = 100 + Math.random() * 50;
    
    const startX = Math.cos(startAngle) * startRadius;
    const startY = Math.sin(startAngle) * startRadius;
    
    bubble.style.left = `calc(50% + ${startX}px)`;
    bubble.style.top = `calc(50% + ${startY}px)`;
    
    const endX = Math.cos(startAngle) * endRadius;
    const endY = Math.sin(startAngle) * endRadius;
    
    const tx = endX - startX;
    const ty = endY - startY;
    
    bubble.style.setProperty('--tx', `${tx}px`);
    bubble.style.setProperty('--ty', `${ty}px`);
    
    bubblesContainer.appendChild(bubble);
    setTimeout(() => bubble.remove(), 1000);
}

function handleCanClick() {
    if (energy > 0) {
        canElement.classList.add('shake');
        setTimeout(() => canElement.classList.remove('shake'), 200);

        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                createBubble();
            }, Math.random() * 200);
        }

        showTapProfit();

        totalEarnedCoins += tapProfit;
        updateBalance(tapProfit);
        updateProgress();

        energy -= 1;
        updateEnergy();
    }
}

function showTapProfit() {
    const profitElement = document.createElement('div');
    profitElement.className = 'tap-profit';
    profitElement.textContent = `+${tapProfit}`;

    const canRect = canElement.getBoundingClientRect();
    const canCenterX = canRect.left + canRect.width / 2;
    const canCenterY = canRect.top + canRect.height / 2;

    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * (canRect.width / 2);
    const x = canCenterX + Math.cos(angle) * radius;
    const y = canCenterY + Math.sin(angle) * radius;

    profitElement.style.left = `${x}px`;
    profitElement.style.top = `${y}px`;

    document.body.appendChild(profitElement);

    setTimeout(() => {
        profitElement.style.opacity = '0';
        profitElement.style.transform = 'translateY(-20px)';
        setTimeout(() => profitElement.remove(), 500);
    }, 10);
}

function regenerateEnergy() {
    if (energy < 100) {
        energy = Math.min(energy + 1, 100);
        updateEnergy();
    }
}
let isShaking = false;
let lastShakeTime = 0;
const shakeThreshold = 15;
const shakeCooldown = 1000;

function requestMotionPermission() {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        // iOS 13+ устройства
        DeviceMotionEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('devicemotion', handleShake);
                }
            })
            .catch(console.error);
    } else {
        // Устройства, не требующие разрешения
        window.addEventListener('devicemotion', handleShake);
    }
}

function handleShake(event) {
    const currentTime = new Date().getTime();
    if (currentTime - lastShakeTime < shakeCooldown) return;

    let acceleration = event.acceleration;
    
    // Для устройств, которые не предоставляют event.acceleration
    if (!acceleration || acceleration.x === null) {
        acceleration = event.accelerationIncludingGravity;
    }

    const { x, y, z } = acceleration;
    const accelerationMagnitude = Math.sqrt(x*x + y*y + z*z);

    if (accelerationMagnitude > shakeThreshold) {
        if (!isShaking) {
            isShaking = true;
            shakeReward();
        }
    } else {
        isShaking = false;
    }

    lastShakeTime = currentTime;
}

function shakeReward() {
    if (energy > 0) {
        const shakeProfit = Math.floor(tapProfit / 2);
        totalEarnedCoins += shakeProfit;
        updateBalance(shakeProfit);
        updateProgress();

        energy -= 1;
        updateEnergy();

        showShakeProfit(shakeProfit);
    }
}

function showShakeProfit(profit) {
    const profitElement = document.createElement('div');
    profitElement.className = 'shake-profit';
    profitElement.textContent = `+${profit}`;

    const containerRect = document.querySelector('.container').getBoundingClientRect();
    const x = Math.random() * (containerRect.width - 50);
    const y = Math.random() * (containerRect.height - 50);

    profitElement.style.left = `${x}px`;
    profitElement.style.top = `${y}px`;

    document.querySelector('.container').appendChild(profitElement);

    setTimeout(() => {
        profitElement.style.opacity = '0';
        profitElement.style.transform = 'translateY(-20px)';
        setTimeout(() => profitElement.remove(), 500);
    }, 10);
}

// Добавляем обработчик события тряски
if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', handleShake, false);
} else {
    console.log('DeviceMotionEvent не поддерживается на этом устройстве');
}
// Инициализация обработчика тряски
document.addEventListener('DOMContentLoaded', () => {
    const shakeButton = document.createElement('button');
    shakeButton.textContent = 'Разрешить тряску устройства';
    shakeButton.addEventListener('click', requestMotionPermission);
    document.body.appendChild(shakeButton);
});

function handleFooterButtonClick(event) {
    const page = event.target.closest('.footer-btn').dataset.page;
    loadPage(page);

    // Обновляем активную кнопку
    document.querySelectorAll('.footer-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.footer-btn').classList.add('active');
}

function loadPage(pageName) {
    const fileName = pageName === 'tasks' ? 'task' : pageName;
    
    fetch(`${fileName}.html`)
        .then(response => response.text())
        .then(html => {
            document.querySelector('.container').innerHTML = html;
            if (pageName === 'main') {
                initializeMainPage();
            } else {
                const script = document.createElement('script');
                script.src = `${fileName}.js`;
                script.onload = function() {
                    console.log(`Скрипт ${fileName}.js загружен и выполнен`);
                };
                document.body.appendChild(script);
            }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `${fileName}.css`;
            document.head.appendChild(link);
            
            addFooter();
        })
        .catch(error => console.error(`Ошибка загрузки страницы ${fileName}:`, error));
}

function addFooter() {
    const footer = document.createElement('footer');
    footer.className = 'footer';
    footer.innerHTML = `
        <nav>
            <ul>
                <li><button class="footer-btn" data-page="main">
                    <img src="assets/icon.svg" alt="Главная" class="footer-icon">
                    <span>Главная</span>
                </button></li>
                <li><button class="footer-btn" data-page="collection">
                    <img src="assets/koll.png" alt="Коллекция" class="footer-icon">
                    <span>Коллекция</span>
                </button></li>
                <li><button class="footer-btn" data-page="task">
                    <img src="assets/diamond-sharp.svg" alt="Задания" class="footer-icon">
                    <span>Задания</span>
                </button></li>
                <li><button class="footer-btn" data-page="friends">
                    <img src="assets/users.svg" alt="Друзья" class="footer-icon">
                    <span>Друзья</span>
                </button></li>
            </ul>
        </nav>
    `;
    document.body.appendChild(footer);
    
    // Добавляем обработчики событий для кнопок футера
    document.querySelectorAll('.footer-btn').forEach(btn => {
        btn.addEventListener('click', handleFooterButtonClick);
    });
}

// Заменяем существующие функции loadCollectionPage, loadMainPage, loadTasksPage, loadFriendsPage
function loadCollectionPage() {
    loadPage('collection');
}

function loadMainPage() {
    loadPage('main');
}

function loadTasksPage() {
    loadPage('task');
}

function loadFriendsPage() {
    loadPage('friends');
}
function initializeTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        console.log('WebApp инициализирован:', window.Telegram.WebApp.initDataUnsafe);
    } else {
        console.error('Telegram WebApp не доступен');
    }
}
// Инициализация главной страницы при згрузке
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.container').children.length === 0) {
        loadPage('main');
    } else {
        initializeTelegramWebApp();
        initializeMainPage();
    }
});

// Запуск регенерации энергии
setInterval(regenerateEnergy, 5000);

function calculateOfflineEarnings() {
    const currentTime = Date.now();
    const timeDiff = (currentTime - lastExitTime) / 1000; // разница в секундах
    const maxOfflineTime = 5 * 60 * 60; // 5 часов в секундах

    if (timeDiff > 0) {
        const earnedCoins = Math.min(timeDiff, maxOfflineTime) * (hourlyProfit / 3600);
        accumulatedCoins += earnedCoins;
        balance += Math.floor(accumulatedCoins);
        totalEarnedCoins += Math.floor(accumulatedCoins);
        accumulatedCoins -= Math.floor(accumulatedCoins);
        updateBalance();
        updateProgress();
    }

    lastExitTime = currentTime;
    localStorage.setItem('lastExitTime', lastExitTime.toString());
    localStorage.setItem('accumulatedCoins', accumulatedCoins.toString());
}

function startOfflineEarningInterval() {
    setInterval(() => {
        if (!isOnline) {
            const earnedCoins = (hourlyProfit / 3600) * (1 / 60); // монеты за 1 секунду
            accumulatedCoins += earnedCoins;
            if (accumulatedCoins >= 1) {
                const earnedWholeCoins = Math.floor(accumulatedCoins);
                balance += earnedWholeCoins;
                totalEarnedCoins += earnedWholeCoins;
                accumulatedCoins -= earnedWholeCoins;
                updateBalance();
                updateProgress();
            }
            localStorage.setItem('accumulatedCoins', accumulatedCoins.toString());
        }
    }, 1000); // обновляем каждую секунду
}

// Добавьте эту функцию для сохранения времени выхода
function saveExitTime() {
    isOnline = false;
    localStorage.setItem('lastExitTime', Date.now().toString());
}

// Вызывайте эту функцию при закрытии страницы
window.addEventListener('beforeunload', saveExitTime);

// Добавьте эту функцию для обработки возвращения в игру
window.addEventListener('focus', () => {
    if (!isOnline) {
        isOnline = true;
        calculateOfflineEarnings();
    }
});

// Добавьте этот код в конец файла main.js
window.addEventListener('message', function(event) {
    if (event.data.type === 'updateBalance') {
        const newBalance = event.data.balance;
        updateBalanceDisplay(newBalance);
    }
});


// Добавьте обработчик события storage
window.addEventListener('storage', function(event) {
    if (event.key === 'balance') {
        updateBalanceDisplay();
    }
});
window.addEventListener('message', function(event) {
    if (event.data.type === 'updateBalance') {
        const newBalance = event.data.balance;
        updateBalanceDisplay(newBalance);
    }
});