function initializeFriendsPage() {
    console.log('Инициализация страницы друзей');
    const inviteButton = document.getElementById('inviteButton');
    if (inviteButton) {
        console.log('Кнопка найдена, добавляем обработчик');
        inviteButton.addEventListener('click', handleInviteButtonClick);
    } else {
        console.error('Кнопка приглашения не найдена');
    }

    // Получаем список приглашенных друзей
    getReferredFriends();

    // Проверяем текущую выбранную банку при загрузке страницы
    const selectedCan = localStorage.getItem('selectedCan');
    if (selectedCan) {
        updateCanImage(parseInt(selectedCan));
    }
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

    fetch(`https://litwin-tap.ru/get-referred-friends?telegramId=${telegramId}`)
    .then(response => response.json())
    .then(data => {
        if (data.referredFriends) {
            displayReferredFriends(data.referredFriends);
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
    const friendsList = document.getElementById('friendsList');
    if (friendsList) {
        friendsList.innerHTML = ''; // Очищаем список перед добавлением новых элементов
        if (friends.length === 0) {
            friendsList.innerHTML = '<p>У вас пока нет приглашенных друзей.</p>';
        } else {
            friends.forEach(friendId => {
                const friendItem = document.createElement('div');
                friendItem.className = 'friend-item';
                friendItem.innerHTML = `
                    <span class="friend-name">Друг ID: ${friendId}</span>
                    <span class="friend-xp">Приглашен</span>
                `;
                friendsList.appendChild(friendItem);
            });
        }
        console.log('Список друзей отображен');
    }
}

    // Проверяем текущую выбранную банку при загрузке страницы
    const selectedCan = localStorage.getItem('selectedCan');
    if (selectedCan) {
        updateCanImage(parseInt(selectedCan));
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

    fetch(`https://litwin-tap.ru/get-referral-link?telegramId=${telegramId}`)
    .then(response => {
        console.log('Ответ получен:', response);
        return response.json();
    })
    .then(data => {
        console.log('Данные получены:', data);
        if (data.inviteLink) {
            console.log('Реферальная ссылка получена:', data.inviteLink);
            
            // Копируем ссылку в буфер обмена
            navigator.clipboard.writeText(data.inviteLink).then(() => {
                console.log('Ссылка скопирована в буфер обмена');
                showPopup('Успех', 'Реферальная ссылка скопирована в буфер обмена. Отправьте её друзьям!');
            }).catch(err => {
                console.error('Не удалось скопировать ссылку:', err);
                showPopup('Внимание', `Не удалось скопировать ссылку. Пожалуйста, скопируйте её вручную: ${data.inviteLink}`);
            });
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

// Остальные вспомогательные функции (updateCansImage, showPopup и т.д.) остаются без изменений