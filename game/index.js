const canvas = document.getElementById("board");
const canvas_ctx = canvas.getContext('2d');

const CELL_SIZE = 2;
const ROWS = 300;
let COLUMNS = 1000;
const FLOOR_VELOCITY = new Velocity(0, -3.5);
let CACTUS_MIN_GAP = 80;
let currentCombo = 0;
let lastJumpTime = Date.now(); // Инициализируем lastJumpTime
let gameStartTime = Date.now(); // Добавляем gameStartTime здесь
if (screen.width < COLUMNS) {
    COLUMNS = screen.width;
}

const DINO_INITIAL_TRUST = new Velocity(-11, 0);
const ENVIRONMENT_GRAVITY = new Velocity(-0.6, 0);
const DINO_FLOOR_INITIAL_POSITION = new Position(200, 10);
let dino_current_trust = new Velocity(0, 0);
let dino_ready_to_jump = true;
let game_over = null;
let is_first_time = true;
let game_score = 0;
let game_score_step = 0;
let game_hi_score = null;
let step_velocity = new Velocity(0, -0.05);
let cumulative_velocity = null;
let current_theme = null;

let harmless_characters_pool = null;
let harmfull_characters_pool = null;

let harmless_character_allocator = [
    new CharacterAllocator(
        new AllocatorCharacterArray()
            .add_character(new CharacterMeta([stone_layout.large], 0, new Position(240, COLUMNS), FLOOR_VELOCITY), 0.9)
            .add_character(new CharacterMeta([stone_layout.medium], 0, new Position(243, COLUMNS), FLOOR_VELOCITY), 0.75)
            .add_character(new CharacterMeta([stone_layout.small], 0, new Position(241, COLUMNS), FLOOR_VELOCITY), 0.6)
        , 2, 0
    ),
    new CharacterAllocator(
        new AllocatorCharacterArray()
            .add_character(new CharacterMeta([cloud_layout], 0, new Position(100, COLUMNS), new Velocity(0, -1), 'cloud'), 0.9)
            .add_character(new CharacterMeta([cloud_layout], 0, new Position(135, COLUMNS), new Velocity(0, -1), 'cloud'), 0.85)
            .add_character(new CharacterMeta([cloud_layout], 0, new Position(150, COLUMNS), new Velocity(0, -1), 'cloud'), 0.8)
        , 350, 300
    ),
    new CharacterAllocator(
        new AllocatorCharacterArray()
            .add_character(new CharacterMeta([star_layout.small_s1], 0, new Position(90, COLUMNS), new Velocity(0, -0.3)), 0.9)
            .add_character(new CharacterMeta([star_layout.small_s2], 0, new Position(125, COLUMNS), new Velocity(0, -0.3)), 0.85)
            .add_character(new CharacterMeta([star_layout.small_s1], 0, new Position(140, COLUMNS), new Velocity(0, -0.3)), 0.8)
        , 350, 250
    ),
    new CharacterAllocator(
        new AllocatorCharacterArray()
            .add_character(new CharacterMeta([pit_layout.large], 0, new Position(223, COLUMNS), FLOOR_VELOCITY), 0.97)
            .add_character(new CharacterMeta([pit_layout.up], 0, new Position(227, COLUMNS), FLOOR_VELOCITY), 0.90)
            .add_character(new CharacterMeta([pit_layout.down], 0, new Position(230, COLUMNS), FLOOR_VELOCITY), 0.85)
        , 100, 50
    )
];

let harmfull_character_allocator = [
    new CharacterAllocator(
        new AllocatorCharacterArray()
            .add_character(new CharacterMeta([cactus_layout.small_d1], 0, new Position(201, COLUMNS), FLOOR_VELOCITY), 0.8)
            .add_character(new CharacterMeta([cactus_layout.small_s1], 0, new Position(201, COLUMNS), FLOOR_VELOCITY), 0.7)
            .add_character(new CharacterMeta([cactus_layout.small_s2], 0, new Position(201, COLUMNS), FLOOR_VELOCITY), 0.6)
            .add_character(new CharacterMeta([cactus_layout.medium_d1], 0, new Position(193, COLUMNS), FLOOR_VELOCITY), 0.5)
            .add_character(new CharacterMeta([cactus_layout.medium_s1], 0, new Position(193, COLUMNS), FLOOR_VELOCITY), 0.4)
            .add_character(new CharacterMeta([cactus_layout.medium_s2], 0, new Position(193, COLUMNS), FLOOR_VELOCITY), 0.3)
        , CACTUS_MIN_GAP, 150
    ),
    new CharacterAllocator(
        new AllocatorCharacterArray()
            .add_character(new CharacterMeta(bird_layout.fly, 0, new Position(170, COLUMNS), FLOOR_VELOCITY.clone().add(new Velocity(0, -1)), 'bird'), 0.98)
            .add_character(new CharacterMeta(bird_layout.fly, 0, new Position(190, COLUMNS), FLOOR_VELOCITY.clone().add(new Velocity(0, -1)), 'bird'), 0.9)
        , 500, 50
    )
]
let currentSkin = localStorage.getItem('currentDinoSkin') || 'default';
if (dino_skins[currentSkin]) {
    dino_layout = dino_skins[currentSkin];
}

function updateScore() {
    const currentScoreElement = document.getElementById('current-score');
    const highScoreElement = document.getElementById('high-score');
    
    currentScoreElement.textContent = Math.floor(game_score);
    highScoreElement.textContent = Math.floor(game_hi_score);
}
const handleJump = () => {
    if (!game_over && dino_ready_to_jump) {
        const now = Date.now();
        if (now - lastJumpTime < 2000) { // 2 секунды на комбо
            currentCombo++;
        } else {
            currentCombo = 1;
        }
        lastJumpTime = now;

        // Проверяем достижение за комбо
        window.parent.postMessage({
            type: 'checkAchievements',
            score: game_score,
            combo: currentCombo,
            timeAlive: (Date.now() - gameStartTime) / 1000,
            theme: current_theme.id
        }, '*');

        dino_ready_to_jump = false;
        dino_current_trust = DINO_INITIAL_TRUST.clone();
    }
};
function initialize() {
    gameStartTime = Date.now();
    currentCombo = 0;
    lastJumpTime = Date.now();
    current_theme = themes.classic;
    cumulative_velocity = new Velocity(0, 0);
    
    // Инициализируем скорость до создания объектов
    initSkinAbilities();
    game_over = false;
    game_score = 0;
    game_hi_score = parseInt(localStorage.getItem("project.github.chrome_dino.high_score")) || 0;
    updateScore();
    canvas.height = ROWS;
    canvas.width = COLUMNS;

    harmless_characters_pool = [];
    harmfull_characters_pool = [
        new Character(new CharacterMeta(dino_layout.run, 4, DINO_FLOOR_INITIAL_POSITION.clone(), new Velocity(0, 0)))
    ];


    const gravity = ENVIRONMENT_GRAVITY;

    // Добавляем обработчики событий, использующие существующую функцию handleJump
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Space' || event.key === ' ') {
            handleJump();
        }
    });

    document.addEventListener('click', handleJump);
    document.addEventListener('touchstart', handleJump);

    // Изменим обработчики событий
    hideGameOver();

    return { gravity };
}

function paint_layout(character_layout, character_position) {
    for (let j = 0; j < character_layout.length; j++) {
        for (let k = 0; k < character_layout[j].length; k++) {
            if (current_theme.layout[character_layout[j][k]]) {
                canvas_ctx.fillStyle = current_theme.layout[character_layout[j][k]];
                let x_pos = character_position[1] + (k * CELL_SIZE);
                let y_pos = character_position[0] + (j * CELL_SIZE);

                canvas_ctx.fillRect(x_pos, y_pos, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}

// Обновляем функцию showGameOver
function showGameOver(score) {
     // Проверяем достижения в конце игры
     window.parent.postMessage({
        type: 'checkAchievements',
        score: game_score,
        combo: currentCombo,
        timeAlive: (Date.now() - gameStartTime) / 1000,
        theme: current_theme.id
    }, '*');
     // Добавляем сильную вибрацию при смерти
     if (window.parent && window.parent.Telegram && window.parent.Telegram.WebApp) {
        window.parent.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
    }
    const gameOverScreen = document.getElementById('game-over');
    const finalScoreElement = document.getElementById('final-score');
    
    // Сначала удаляем все существующие кнопки рекламы
    const existingButtons = gameOverScreen.querySelectorAll('#watch-ad-button');
    existingButtons.forEach(button => button.remove());
    
    // Создаем новую кнопку рекламы
    const watchAdButton = document.createElement('button');
    watchAdButton.id = 'watch-ad-button';
    watchAdButton.innerHTML = '<span>Watch <span class="yellow-text">ad</span> for x3 DPS</span>';
    
    // Добавляем обработчик клика
    watchAdButton.addEventListener('click', () => {
        window.parent.postMessage({
            type: 'showAd',
            currentScore: game_score
        }, '*');
        // Сразу удаляем кнопку после клика
        watchAdButton.remove();
    });
    
    finalScoreElement.textContent = `+${Math.floor(score)} DPS`;
    gameOverScreen.style.display = 'block';
    
    // Добавляем новую кнопку
    gameOverScreen.appendChild(watchAdButton);
    
    window.parent.postMessage({
        type: 'gameOver',
        score: Math.floor(score)
    }, '*');
}

function hideGameOver() {
    const gameOverScreen = document.getElementById('game-over');
    gameOverScreen.style.display = 'none';
}

function event_loop(gravity) {
    game_score_step += 0.1;

    if (game_score_step > 1) {
        game_score_step -= 1;
        game_score++;
    }

    if (game_score != 0 && game_score % 300 == 0) {
        game_score++;
        if (current_theme.id == 1) {
            current_theme = themes.dark;
        } else {
            current_theme = themes.classic;
        }
    }

    canvas_ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas_ctx.fillStyle = current_theme.background;
    canvas_ctx.fillRect(0, 0, canvas.width, canvas.height);
    canvas_ctx.beginPath();

    // Road
    for (let i = 0; i < canvas.width; i++) {
        canvas_ctx.fillStyle = current_theme.road;
        canvas_ctx.fillRect(0, 232, canvas.width, CELL_SIZE * 0.2);
    }

    updateScore();

    // first time
    if (is_first_time) {
        is_first_time = false;
        paint_layout(dino_layout.stand, harmfull_characters_pool[0].get_position().get());
        game_over = Date.now();
        return;
    }

    // characters
    [[harmless_character_allocator, harmless_characters_pool], [harmfull_character_allocator, harmfull_characters_pool]].forEach(character_allocator_details => {
        for (let i = 0; i < character_allocator_details[0].length; i++) {
            const ALLOCATOR = character_allocator_details[0][i];
            ALLOCATOR.tick();
            const RANDOM_CHARACTER = ALLOCATOR.get_character();
            if (RANDOM_CHARACTER) {
                RANDOM_CHARACTER.get_velocity().add(cumulative_velocity);
                character_allocator_details[1].push(RANDOM_CHARACTER);
            }
        }
    });

    // increase velocity
    if (game_score % 200 == 0) {
        cumulative_velocity.add(step_velocity);
    }

    // characters display
    [harmless_characters_pool, harmfull_characters_pool].forEach((characters_pool, index) => {
        for (let i = characters_pool.length - 1; i >= 0; i--) {
            if ((!(index == 1 && i == 0)) && (game_score % 200 == 0)) {
                characters_pool[i].get_velocity().add(step_velocity);
            }

            characters_pool[i].tick();
            let CHARACTER_LAYOUT = characters_pool[i].get_layout();

            if (!dino_ready_to_jump && index == 1 && i == 0) {
                CHARACTER_LAYOUT = dino_layout.stand;
            }

            const CHARACTER_POSITION = characters_pool[i].get_position().get();

            if (CHARACTER_POSITION[1] < -150) {
                characters_pool.splice(i, 1);
                continue;
            }

            paint_layout(CHARACTER_LAYOUT, CHARACTER_POSITION);
        }
    });

    // collision detection
    let dino_character = harmfull_characters_pool[0];
    let dino_current_position = dino_character.get_position();
    let dino_current_layout = dino_character.get_layout();

    for (let i = harmfull_characters_pool.length - 1; i > 0; i--) {
        const HARMFULL_CHARACTER_POSITION = harmfull_characters_pool[i].get_position();
        const HARMFULL_CHARACTER_LAYOUT = harmfull_characters_pool[i].get_layout();
        
        if (isCollided(
            dino_current_position.get()[0],
            dino_current_position.get()[1],
            dino_current_layout.length,
            dino_current_layout[0].length,
            HARMFULL_CHARACTER_POSITION.get()[0],
            HARMFULL_CHARACTER_POSITION.get()[1],
            HARMFULL_CHARACTER_LAYOUT.length,
            HARMFULL_CHARACTER_LAYOUT[0].length
        )) {
            if (currentArmor > 0) {
                // Если есть броня, уменьшаем её и продолжаем игру
                currentArmor--;
                
                // Показываем визуальный эффект потери брони
                showArmorBreakEffect();
                
                // Удаляем объект, с которым произошло столкновение
                harmfull_characters_pool.splice(i, 1);
                continue;
            }

            // Если нет брони, игра заканчивается
            paint_layout(dino_layout.dead, harmfull_characters_pool[0].get_position().get());
            
            if (game_hi_score < game_score) {
                game_hi_score = game_score;
                localStorage.setItem("project.github.chrome_dino.high_score", Math.floor(game_hi_score));
            }
            
            showGameOver(game_score);
            return;
        }
    }

    // dino jump1
    dino_character.set_position(applyVelocityToPosition(dino_character.get_position(), dino_current_trust));

    if (dino_character.get_position().get()[0] > DINO_FLOOR_INITIAL_POSITION.get()[0]) {
        dino_character.set_position(DINO_FLOOR_INITIAL_POSITION.clone());
        dino_ready_to_jump = true;
    }

    dino_current_trust.sub(gravity);

    if (game_score > game_hi_score) {
        game_hi_score = game_score;
        localStorage.setItem("project.github.chrome_dino.high_score", Math.floor(game_hi_score));
    }

    requestAnimationFrame(() => event_loop(gravity));
}

function main() {
    const { gravity } = initialize();
    
    // Устанавливаем правильный скин при старте
    if (dino_skins[currentSkin]) {
        dino_layout = dino_skins[currentSkin];
    }
    
    event_loop(gravity);
}

document.fonts.load('1rem "Arcade"').then(() => {
    main();
});

// Добавьте эту функцию для получения текущего счета
window.getScore = function() {
    return game_score;
};

document.getElementById('watch-ad-button').addEventListener('click', () => {
    // Отправляем сообщение родительскому окну
    window.parent.postMessage({
        type: 'showAd',
        currentScore: game_score
    }, '*');
});

// Слушаем сообщения от родительского окна
window.addEventListener('message', (event) => {
    if (event.data.type === 'adWatched') {
        // Умножаем счет после просмотра рекламы
        game_score *= 3;
        updateScore();
        
        // Скрываем экран Game Over и удаляем кнопку рекламы
        const gameOverScreen = document.getElementById('game-over');
        const watchAdButton = document.getElementById('watch-ad-button');
        
        if (watchAdButton) {
            watchAdButton.remove();
        }
        
        if (gameOverScreen) {
            gameOverScreen.style.display = 'none';
        }
    } else if (event.data.type === 'hideAd') {
        // Удаляем кнопку рекламы и скрываем экран Game Over
        const gameOverScreen = document.getElementById('game-over');
        const watchAdButton = document.getElementById('watch-ad-button');
        
        if (watchAdButton) {
            watchAdButton.remove();
        }
        
        if (gameOverScreen) {
            gameOverScreen.style.display = 'none';
        }
    } else if (event.data.type === 'startGame') {
        hideGameOver();
        main();
    }
});
function drawLayout(ctx, layout, position, colors) {
    if (!layout || !colors) return;

    // Определяем тип объекта по его метаданным
    let useColors = colors;
    
    // Проверяем, является ли layout массивом птицы
    const isBird = bird_layout.fly.includes(layout);
    // Проверяем, является ли layout облаком
    const isCloud = layout === cloud_layout;

    // Выбираем правильные цвета в зависимости от типа объекта
    if (isBird && current_theme && current_theme.bird) {
        useColors = current_theme.bird;
    } else if (isCloud && current_theme && current_theme.cloud) {
        useColors = current_theme.cloud;
    }

    // Если colors это строка (например, для дороги), преобразуем в массив
    const colorArray = typeof useColors === 'string' ? [false, 'transparent', useColors] : useColors;

    for (let i = 0; i < layout.length; i++) {
        for (let j = 0; j < layout[i].length; j++) {
            if (layout[i][j] !== 0) {
                ctx.fillStyle = colorArray[layout[i][j]];
                ctx.fillRect(
                    (position.y + j) * CELL_SIZE,
                    (position.x + i) * CELL_SIZE,
                    CELL_SIZE,
                    CELL_SIZE
                );
            }
        }
    }
}
// Добавляем функцию для перерисовки начального состояния
function redrawInitialState() {
    if (!game_over && is_first_time) {
        canvas_ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Перерисовываем дорогу
        drawLayout(
            canvas_ctx,
            road_layout,
            new Position(0, 0),
            current_theme.road
        );
        
        // Перерисовываем начального динозавра
        drawLayout(
            canvas_ctx,
            dino_layout.stand,
            DINO_FLOOR_INITIAL_POSITION,
            current_theme.layout
        );
    }
}
window.addEventListener('message', (event) => {
    if (event.data.type === 'changeSkin') {
        const skinName = event.data.skin;
        if (dino_skins[skinName]) {
            dino_layout = dino_skins[skinName];
            // Если игра уже запущена, обновляем текущий спрайт
            if (typeof main_character !== 'undefined' && main_character) {
                main_character._character_meta._movements_array = [
                    dino_layout.stand,
                    ...dino_layout.run
                ];
                initSkinAbilities();
            }
            // Перерисовываем начальное состояние
            redrawInitialState();
        }
    }
});

const SKIN_ABILITIES = {
    default: {
        speed: 1,
        armor: 0,
        description: "Классический динозавр"
    },
    ninja: {
        speed: 0.7,
        armor: 0,
        description: "Замедляет время для лучшей реакции"
    },
    robot: {
        speed: 1,
        armor: 1,
        description: "Имеет защитную броню от одного столкновения"
    }
};

// Добавляем новые переменные
let currentArmor = 0;
let gameSpeed = 1;

// Добавляем функцию инициализации способностей
function initSkinAbilities() {
    const skinName = localStorage.getItem('currentDinoSkin') || 'default';
    const abilities = SKIN_ABILITIES[skinName];
    
    // Базовая скорость
    gameSpeed = abilities.speed;
    
    // Корректируем скорость для iOS
    if (window.navigator.platform.match(/iPhone|iPod|iPad/i)) {
        FLOOR_VELOCITY.y = -3.5;  // Фиксированная базовая скорость для iOS
        step_velocity.y = -0.05;
    } else {
        FLOOR_VELOCITY.y = -3.5 * gameSpeed;
        step_velocity.y = -0.05 * gameSpeed;
    }
    
    currentArmor = abilities.armor;
}

// Функция для добавления визуального эффекта брони
function addArmorEffect(layout) {
    // Создаем копию макета
    const armoredLayout = layout.map(row => [...row]);
    // Добавляем эффект брони (например, изменяем цвет контура)
    // Здесь можно настроить визуальный эффект
    return armoredLayout;
}
// Функция для визуального эффекта потери брони
function showArmorBreakEffect() {
    canvas_ctx.save();
    canvas_ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    canvas_ctx.fillRect(0, 0, canvas.width, canvas.height);
    setTimeout(() => {
        canvas_ctx.restore();
    }, 100);
}


window.addEventListener('message', (event) => {
    if (event.data.type === 'jump') {
        // Проверяем условия для прыжка
        if (!game_over && dino_ready_to_jump) {
            const now = Date.now();
            if (now - lastJumpTime < 2000) {
                currentCombo++;
            } else {
                currentCombo = 1;
            }
            lastJumpTime = now;
    
            dino_ready_to_jump = false;
            dino_current_trust = DINO_INITIAL_TRUST.clone();
        }
    }
}, false);