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