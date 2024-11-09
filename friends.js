function updateRewardSection() {
    // Находим элементы для обновления
    const rewardDPSText = document.querySelector('#friends-page .bg-gray-800 .text-yellow-400');
    const rewardButton = document.querySelector('#friends-page .bg-gray-800 button');
    const todayText = document.querySelector('#friends-page .bg-gray-800 .text-sm');
    
    if (!rewardDPSText || !rewardButton) return;

    const friendsCount = parseInt(localStorage.getItem('referredFriendsCount')) || 0;
    const rewardAmount = friendsCount * 35;
    const lastRewardTime = parseInt(localStorage.getItem('friendsRewardCooldown')) || 0;
    const now = Date.now();
    const cooldownTime = 24 * 60 * 60 * 1000; // 24 часа
    const timeLeft = lastRewardTime + cooldownTime - now;

    // Обновляем текст награды слева
    rewardDPSText.textContent = `+${rewardAmount} DPS`;
    
    // Обновляем состояние кнопки справа
    if (timeLeft > 0) {
        const hoursLeft = Math.ceil(timeLeft / (60 * 60 * 1000));
        rewardButton.textContent = `${hoursLeft}ч`;
        rewardButton.className = 'bg-gray-500 text-white px-4 py-2 rounded-full text-sm cursor-not-allowed';
        rewardButton.disabled = true;
    } else {
        rewardButton.textContent = 'Get a reward';
        rewardButton.className = 'bg-yellow-400 text-black px-4 py-2 rounded-full text-sm font-bold';
        rewardButton.disabled = false;
    }
}

function handleRewardClick() {
    const friendsCount = parseInt(localStorage.getItem('referredFriendsCount')) || 0;
    const rewardAmount = friendsCount * 35;
    
    // Сохраняем время получения награды
    localStorage.setItem('friendsRewardCooldown', Date.now().toString());
    
    // Добавляем награду к общему DPS
    const currentDPS = parseInt(localStorage.getItem('totalDPS')) || 0;
    localStorage.setItem('totalDPS', (currentDPS + rewardAmount).toString());
    
    // Обновляем отображение
    updateRewardSection();
    updateAllBalances(); // Убедитесь, что эта функция существует в main.js
    
    // Показываем уведомление
    showPopup('Успех', `Вы получили ${rewardAmount} DPS!`);
}

function initializeFriendsPage() {
    console.log('Инициализация страницы друзей');
    const inviteButton = document.getElementById('inviteButton');
    const rewardButton = document.querySelector('#friends-page .bg-gray-800 button');
    
    if (inviteButton) {
        console.log('Кнопка приглашения найдена, добавляем обработчик');
        inviteButton.addEventListener('click', handleShareLinkButtonClick);
    }
    
    if (rewardButton) {
        rewardButton.addEventListener('click', handleRewardClick);
    }

    // Запускаем таймер обновления
    updateRewardSection();
    setInterval(updateRewardSection, 60000); // Обновляем каждую минуту
    
    getReferredFriends();
}

function getReferredFriends() {
    let telegramId;
    try {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
            telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
        } else {
            throw new Error('Telegram WebApp не инициализирован или не содержит данных пользователя');
        }
    } catch (error) {
        console.error('Ошибка при получении Telegram ID:', error);
        displayReferredFriends([]); // Отображаем пустой список друзей
        return;
    }

    fetch(`https://dino-app.ru/get-referred-friends?telegramId=${telegramId}`)
    .then(response => response.json())
    .then(data => {
        if (data.referredFriends) {
            displayReferredFriends(data.referredFriends);
            localStorage.setItem('referredFriendsCount', data.referredFriends.length.toString());
            if (currentCategory === 'refs') {
                renderTasks('refs');
            }
        } else {
            console.error('Не удалось получить список рефералов:', data.error);
            displayReferredFriends([]);
        }
    })
    .catch(error => {
        console.error('Ошибка при получении списка рефералов:', error);
        displayReferredFriends([]);
    });
}

function displayReferredFriends(friends) {
    const friendsList = document.querySelector('#friends-page .space-y-3');
    if (friendsList) {
        friendsList.innerHTML = '';
        if (friends.length === 0) {
            friendsList.innerHTML = '<p class="text-center text-gray-400">У вас пока нет приглашенных друзей</p>';
        } else {
            friends.forEach(friend => {
                const friendItem = document.createElement('div');
                friendItem.className = 'bg-gray-800 rounded-lg p-3 flex justify-between items-center';
                
                const friendName = friend.username ? `@${friend.username}` : `Пользователь ${friend.id}`;
                
                friendItem.innerHTML = `
                    <div>
                        <div class="text-sm">${friendName}</div>
                        <div class="text-xs text-yellow-400">+15 DPS</div>
                    </div>
                    <div class="text-xs text-gray-400">16 Tasks</div>
                `;
                friendsList.appendChild(friendItem);
            });
        }
    }
}

function showPopup(title, message) {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = 'var(--tertiary-color)'; // Используем цвет из CSS переменных
    popup.style.color = '#fff'; // Белый текст для контраста
    popup.style.padding = '20px';
    popup.style.borderRadius = '10px';
    popup.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    popup.style.zIndex = '1000';
    popup.style.maxWidth = '80%'; // Ограничиваем ширину попапа
    popup.style.textAlign = 'center'; // Центрируем текст

    const closeButton = document.createElement('button');
    closeButton.textContent = 'OK';
    closeButton.style.backgroundColor = 'var(--secondary-color)';
    closeButton.style.color = '#fff';
    closeButton.style.border = 'none';
    closeButton.style.padding = '10px 20px';
    closeButton.style.borderRadius = '5px';
    closeButton.style.marginTop = '15px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => popup.remove();

    popup.innerHTML = `
        <h2 style="margin-top: 0; color: #FFD700;">${title}</h2>
        <p style="margin-bottom: 20px;">${message}</p>
    `;
    popup.appendChild(closeButton);

    document.body.appendChild(popup);
}

    window.handleInviteButtonClick = function(event) {
        console.log('Функция handleInviteButtonClick вызвана');
        event.preventDefault();
        // Добавляем лёгкую вибрацию
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
        
        if (!window.Telegram || !window.Telegram.WebApp) {
            console.error('Telegram WebApp не доступен');
            showPopup('Ошибка', 'Telegram WebApp не доступен');
            return;
        }
        
        console.log('Telegram WebApp доступен');
        
        let telegramId;
        try {
            telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
            console.log('Telegram ID:', telegramId);
        } catch (error) {
            console.error('Не удалось получить Telegram ID:', error);
            showPopup('Ошибка', 'Не удалось получить информацию о пользователе');
            return;
        }
    
        if (!telegramId) {
            console.error('Telegram ID не определен');
            showPopup('Ошибка', 'Не удалось получить информацию о пользователе');
            return;
        }
    
        fetch(`https://dino-app.ru/get-referral-link?telegramId=${telegramId}`)
        .then(response => {
            console.log('Ответ получен:', response);
            return response.json();
        })
        .then(data => {
            console.log('Данные получены:', data);
            if (data.inviteLink) {
                console.log('Реферальная ссылка получена:', data.inviteLink);
                
                // Создаем временное текстовое поле для копирования
                const tempInput = document.createElement('input');
                tempInput.style.position = 'absolute';
                tempInput.style.left = '-9999px';
                tempInput.value = data.inviteLink;
                document.body.appendChild(tempInput);
                tempInput.select();
                tempInput.setSelectionRange(0, 99999); // Для мобильных устройств
    
                try {
                    const successful = document.execCommand('copy');
                    if (successful) {
                        console.log('Ссылка скопирована в буфер обмена');
                        showPopup('Успех', 'Реферальная ссылка скопирована в буфер обмена. Отправьте её друзьям!');
                    } else {
                        throw new Error('Копирование не удалось');
                    }
                } catch (err) {
                    console.error('Не удалось скопировать ссылку:', err);
                    showPopup('Внимание', `Не удалось скопировать ссылку. Пожалуйста, скопируйте её вручную: ${data.inviteLink}`);
                }
    
                document.body.removeChild(tempInput);
            } else {
                console.error('Ссылка не получена:', data);
                showPopup('Ошибка', 'Не удалось получить реферальную ссылку. Попробуйте позже.');
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            showPopup('Ошибка', 'Произошла ошибка при получении реферальной ссылки. Попробуйте позже.');
        });
    }
    function handleShareLinkButtonClick(event) {
        console.log('Функция handleShareLinkButtonClick вызвана');
        event.preventDefault();
        // Добавляем лёгкую вибрацию
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
        }
        
        if (!window.Telegram || !window.Telegram.WebApp) {
            console.error('Telegram WebApp не доступен');
            showPopup('Ошибка', 'Telegram WebApp не доступен');
            return;
        }
        
        let telegramId;
        try {
            telegramId = window.Telegram.WebApp.initDataUnsafe.user.id;
            console.log('Telegram ID:', telegramId);
        } catch (error) {
            console.error('Не удалось получить Telegram ID:', error);
            showPopup('Ошибка', 'Не удалось получить информацию о пользователе');
            return;
        }
    
        if (!telegramId) {
            console.error('Telegram ID не определен');
            showPopup('Ошибка', 'Не удалось получить информацию о пользователе');
            return;
        }
    
        fetch(`https://dino-app.ru/get-referral-link?telegramId=${telegramId}`)
        .then(response => response.json())
        .then(data => {
            if (data.inviteLink) {
                const message = "Присоединяйся к Dino вместе со мной!";
                const shareUrl = `https://t.me/share/url?text=${encodeURIComponent(message)}&url=${encodeURIComponent(data.inviteLink)}`;
                
                if (window.Telegram && window.Telegram.WebApp) {
                    Telegram.WebApp.openTelegramLink(shareUrl);
                } else {
                    window.open(shareUrl, "_blank");
                }
            } else {
                console.error('Ссылка не получена:', data);
                showPopup('Ошибка', 'Не удалось получить реферальную ссылку. Попробуйте позже.');
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            showPopup('Ошибка', 'Произошла ошибка при получении реферальной ссылки. Попробуйте позже.');
        });
    }

// Добавьте эту функцию в конец файла
document.addEventListener('DOMContentLoaded', initializeFriendsPage);


