const https = require('https');  
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');
const crypto = require('crypto');
require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const url = require('url');
const defaultCharset = 'utf-8';
const rootDir = process.cwd();

const requiredFiles = [
  '/main.html',
  '/dist/main.js',
  '/dist/game.js',
  '/dist/friends.js',
  '/dist/tasks.js',
  '/dist/output.css'
];
// Создаем подключение к базе данных
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD, 
  {
      host: process.env.DB_HOST,
      dialect: process.env.DB_DIALECT
  }
);

// Определяем модель User
const User = sequelize.define('User', {
  telegramId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  referralCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  referredBy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  balance: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  taskEarnings: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  gameEarnings: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  inviteEarnings: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  adWatchCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastAdUniqueId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastAdWatchTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  skins: {
    type: DataTypes.JSON,
    defaultValue: ['default'], // По умолчанию доступен только базовый скин
    allowNull: false
  }
});

// Синхронизируем модель с базой данных
sequelize.sync({ alter: true });
// Создаем экземпляр бота с вашим токеном
const bot = new Telegraf(process.env.DINO_BOT_TOKEN);
// WebApp URL
const webAppUrl = 'https://dino-app.ru';

// Обработчик команды /start
bot.command('start', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const username = ctx.from.username;
  const referralCode = ctx.message.text.split(' ')[1];

  try {
    let user = await User.findOne({ where: { telegramId } });

    if (!user) {
      const newReferralCode = crypto.randomBytes(4).toString('hex');
      
      user = await User.create({
        telegramId,
        username, // Сохраняем username
        referralCode: newReferralCode,
        referredBy: referralCode || null
      });

      if (referralCode) {
        const referrer = await User.findOne({ where: { referralCode } });
        if (referrer) {
          // Здесь можно добавить логику начисления бонусов рефереру
          console.log(`User ${telegramId} was referred by ${referrer.telegramId}`);
        }
      }
    }

    ctx.reply('🦖 Добро пожаловать в игру "Dinosaur"!\n\n' + 
      '🎮 Помоги динозаврику преодолеть препятствия и установи новый рекорд!\n' +
      '🏆 Соревнуйся с друзьями и поднимайся в таблице лидеров.\n\n' +
      '👇 Нажми кнопку ниже, чтобы начать приключение:', {
      reply_markup: {
        resize_keyboard: true
      }
    });

  } catch (error) {
    console.error('Error in start command:', error);
    ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
});

// Запускаем бота
bot.launch();
bot.on('pre_checkout_query', async (ctx) => {
  try {
    await ctx.answerPreCheckoutQuery(true);
  } catch (error) {
    console.error('Error in pre_checkout_query:', error);
  }
});

// Обработка successful_payment
bot.on('successful_payment', async (ctx) => {
  try {
    const payment = ctx.message.successful_payment;
    const [type, telegramId, skinName] = payment.invoice_payload.split('_');

    if (type === 'skin') {
      const user = await User.findOne({ where: { telegramId } });
      if (!user) {
        console.error('User not found:', telegramId);
        return;
      }

      // Добавляем новый скин
      const updatedSkins = [...new Set([...user.skins, skinName])];
      await user.update({ skins: updatedSkins });

      await ctx.reply('✨ Скин успешно приобретен! Теперь вы можете выбрать его в игре.');
    }
  } catch (error) {
    console.error('Error in successful_payment:', error);
  }
});
const checkRequiredFiles = () => {
  console.log('Checking required files...');
  requiredFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
          console.log(`✅ ${file} exists`);
      } else {
          console.error(`❌ ${file} is missing!`);
      }
  });
};
function validateInitData(initData) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  // Сортируем оставшиеся параметры
  const params = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
    
  // Создаем HMAC
  const secret = crypto.createHmac('sha256', 'WebAppData')
    .update(process.env.DINO_BOT_TOKEN)
    .digest();
    
  const generatedHash = crypto.createHmac('sha256', secret)
    .update(params)
    .digest('hex');
    
  return generatedHash === hash;
}

async function authMiddleware(req, res) {
  const initData = req.headers['x-telegram-init-data'];
  if (!initData || !validateInitData(initData)) {
    return { status: 401, body: { error: 'Unauthorized' } };
  }
  return null;
}

const routes = {
  GET: {
    '/sync-user-data': async (req, res, query) => {
      const authError = await authMiddleware(req, res);
      if (authError) return authError;

      const { telegramId } = query;
      try {
        const user = await User.findOne({ where: { telegramId } });
        if (!user) {
          return { status: 404, body: { error: 'User not found' } };
        }

        return {
          status: 200,
          body: {
            balance: user.balance,
            taskEarnings: user.taskEarnings,
            gameEarnings: user.gameEarnings,
            inviteEarnings: user.inviteEarnings,
            skins: user.skins
          }
        };
      } catch (error) {
        console.error('Error syncing user data:', error);
        return { status: 500, body: { error: 'Internal server error' } };
      }
    },
    '/get-referral-link': async (req, res, query) => {
      console.log('Получен запрос на /get-referral-link');
      const telegramId = query.telegramId;
      
      if (!telegramId) {
        console.log('Отсутствует telegramId');
        return { status: 400, body: { error: 'Missing telegramId parameter' } };
      }

      try {
        console.log('Поиск пользователя с telegramId:', telegramId);
        const user = await User.findOne({ where: { telegramId } });
        if (user) {
          const inviteLink = `https://t.me/Dinosaur_Gamebot?start=${user.referralCode}`;
          console.log('Сгенерирована ссылка:', inviteLink);
          return { status: 200, body: { inviteLink } };
        } else {
          console.log('Пользователь не найден');
          return { status: 404, body: { error: 'User not found' } };
        }
      } catch (error) {
        console.error('Ошибка при обработке запроса:', error);
        return { status: 500, body: { error: 'Internal server error' } };
      }
    },
    '/get-referred-friends': async (req, res, query) => {
  console.log('Получен запрос на /get-referred-friends');
  const telegramId = query.telegramId;
  
  if (!telegramId) {
    console.log('Отсутствует telegramId');
    return { status: 400, body: { error: 'Missing telegramId parameter' } };
  }

  try {
    console.log('Поиск рефералов для пользователя с telegramId:', telegramId);
    const user = await User.findOne({ where: { telegramId } });
    if (user) {
      const referredFriends = await User.findAll({
        where: { referredBy: user.referralCode },
        attributes: ['telegramId', 'username']
      });
      console.log('Найдено рефералов:', referredFriends.length);
      return { 
        status: 200, 
        body: { 
          referredFriends: referredFriends.map(friend => ({
            id: friend.telegramId,
            username: friend.username || null // Возвращаем null, если username не установлен
          })) 
        } 
      };
    } else {
      console.log('Пользователь не найден');
      return { status: 404, body: { error: 'User not found' } };
    }
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    return { status: 500, body: { error: 'Internal server error' } };
  }
},
'/create-skin-invoice': async (req, res, query) => {
    const { telegramId, stars, skinName } = query;
    
    if (!telegramId || !skinName || !stars) {
        return { status: 400, body: { error: 'Missing required parameters' } };
    }

    try {
        const user = await User.findOne({ where: { telegramId } });
        if (!user) {
            return { status: 404, body: { error: 'User not found' } };
        }

        if (user.skins.includes(skinName)) {
            return { status: 400, body: { error: 'Skin already purchased' } };
        }

        const invoice = await bot.telegram.createInvoiceLink({
            title: 'Покупка скина динозавра',
            description: `${skinName === 'red' ? 'Красный' : 'Зеленый'} скин для вашего динозавра`,
            payload: `skin_${telegramId}_${skinName}`,
            provider_token: "",
            currency: 'XTR',
            prices: [{
                label: '⭐️ Скин',
                amount: parseInt(stars)
            }]
        });

        return { status: 200, body: { slug: invoice } };
    } catch (error) {
        console.error('Error creating skin invoice:', error);
        return { status: 500, body: { error: 'Failed to create invoice: ' + error.message } };
    }
},
    '/update-user-skins': async (req, res, query) => {
      const { telegramId, skinName } = query;
      
      if (!telegramId || !skinName) {
        return { status: 400, body: { error: 'Missing required parameters' } };
      }

      try {
        const user = await User.findOne({ where: { telegramId } });
        if (!user) {
          return { status: 404, body: { error: 'User not found' } };
        }

        // Добавляем новый скин к существующим
        const updatedSkins = [...new Set([...user.skins, skinName])];
        await user.update({ skins: updatedSkins });

        return { 
          status: 200, 
          body: { 
            success: true,
            skins: updatedSkins
          }
        };
      } catch (error) {
        console.error('Error updating user skins:', error);
        return { status: 500, body: { error: 'Failed to update user skins' } };
      }
    },

    '/get-user-skins': async (req, res, query) => {
      const { telegramId } = query;
      
      if (!telegramId) {
        return { status: 400, body: { error: 'Missing telegramId parameter' } };
      }

      try {
        const user = await User.findOne({ where: { telegramId } });
        if (!user) {
          return { status: 404, body: { error: 'User not found' } };
        }

        return { 
          status: 200, 
          body: { 
            skins: user.skins 
          }
        };
      } catch (error) {
        console.error('Error getting user skins:', error);
        return { status: 500, body: { error: 'Failed to get user skins' } };
      }
    },
'/reward': async (req, res, query) => {
    const telegramId = query.userid;
    
    if (!telegramId) {
        return { status: 400, body: { error: 'Missing userid parameter' } };
    }

    try {
        const user = await User.findOne({ where: { telegramId } });
        if (!user) {
            return { status: 404, body: { error: 'User not found' } };
        }

        // Обновляем только счетчик просмотров рекламы
        await user.update({
            adWatchCount: (user.adWatchCount || 0) + 1
        });

        return { status: 200, body: { 
            success: true, 
            message: 'Ad view recorded',
            adWatchCount: user.adWatchCount + 1
        }};
    } catch (error) {
        console.error('Error in reward endpoint:', error);
        return { status: 500, body: { error: 'Internal server error' } };
    }
    }
  },
  POST: {
    '/update-balance': async (req, res) => {
        const authError = await authMiddleware(req, res);
        if (authError) return authError;

        let body = '';
        req.on('data', chunk => { body += chunk; });
        
        return new Promise((resolve) => {
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    // Преобразуем telegramId в строку
                    const telegramId = data.telegramId.toString();
                    const { balance, taskEarnings, gameEarnings, inviteEarnings } = data;
                    
                    console.log('Updating balance for user:', telegramId, {
                      balance,
                      taskEarnings,
                      gameEarnings,
                      inviteEarnings
                  });
                    
                    const user = await User.findOne({ 
                        where: { telegramId: telegramId }
                    });
                    
                    if (!user) {
                        console.log('User not found:', telegramId);
                        resolve({ status: 404, body: { error: 'User not found' } });
                        return;
                    }

                    await user.update({
                        balance,
                        taskEarnings,
                        gameEarnings,
                        inviteEarnings
                    });

                    console.log('Balance updated successfully');
                    resolve({
                        status: 200,
                        body: { success: true }
                    });
                } catch (error) {
                    console.error('Error updating balance:', error);
                    resolve({ status: 500, body: { error: 'Internal server error: ' + error.message } });
                }
            });
        });
    }
  }
}

// Функция для обработки статических файлов
const serveStaticFile = (filePath, res) => {
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain'
  }[extname] || 'application/octet-stream';

  console.log('Current working directory:', process.cwd()); // Добавим для отладки
  console.log('Trying to serve file:', filePath);

  // Проверяем существование файла
  if (!fs.existsSync(filePath)) {
      console.error('File does not exist:', filePath);
      if (filePath.endsWith('main.html')) {
          const mainHtmlPath = path.join(process.cwd(), 'main.html');
          console.log('Trying alternative path:', mainHtmlPath); // Добавим для отладки
          if (fs.existsSync(mainHtmlPath)) {
              filePath = mainHtmlPath;
          } else {
              res.writeHead(404);
              res.end('File not found');
              return;
          }
      } else {
          res.writeHead(404);
          res.end('File not found');
          return;
      }
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
        console.error('Error reading file:', error);
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
    } else {
        const headers = {
            'Content-Type': `${contentType}; charset=${defaultCharset}`,
            'Cache-Control': 'no-cache',
            'X-Content-Type-Options': 'nosniff'
        };
        
        // Добавляем заголовок для .js файлов
        if (contentType === 'text/javascript') {
            headers['Content-Type'] = 'application/javascript; charset=UTF-8';
        }
        
        res.writeHead(200, headers);
        res.end(content, 'utf-8');
    }
});
};

const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/dino-app.ru/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/dino-app.ru/fullchain.pem')
};

const server = https.createServer(options, async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  const method = req.method;

  console.log('Incoming request:', method, pathname);
 // Добавим CORS заголовки
 res.setHeader('Access-Control-Allow-Origin', '*');
 res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
 res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (pathname === '/') {
      pathname = '/main.html';
  }

  // Проверяем API запросы
  if (routes[method] && routes[method][pathname]) {
      const handler = routes[method][pathname];
      const result = await handler(req, res, parsedUrl.query);
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.body));
      return;
  }

  // Обработка статических файлов
  let filePath;
  if (pathname.startsWith('/dist/')) {
      // Для файлов в dist (включая чанки и лицензии)
      filePath = path.join(rootDir, pathname);
  } else if (pathname.startsWith('/assets/')) {
      // Для файлов в assets
      filePath = path.join(rootDir, pathname);
  } else {
      // Для остальных файлов
      filePath = path.join(rootDir, pathname);
  }
  
  console.log('Resolved file path:', filePath);
  serveStaticFile(filePath, res);
});

const httpsPort = 5000;
const httpPort = 5001;

server.listen(httpsPort, () => {
  checkRequiredFiles();
  console.log(`HTTPS Сервер запущен на порту ${httpsPort}`);
  console.log('Telegram бот запущен');
  console.log(`HTTPS Сервер запущен на https://dino-app.ru`);
});

// HTTP to HTTPS redirect
http.createServer((req, res) => {
  res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
  res.end();
}).listen(httpPort, () => {
  console.log(`HTTP сервер запущен на порту ${httpPort} для перенаправления на HTTPS`);
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));