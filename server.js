const https = require('https');  
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');
const crypto = require('crypto');
require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const url = require('url');

// Редис для уведомлений
const Redis = require('ioredis');
const redis = new Redis();
const schedule = require('node-schedule');

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
  },
  lastHeartNotification: {
    type: DataTypes.DATE,
    allowNull: true
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
  // Используем first_name если username отсутствует
  const username = ctx.from.username || ctx.from.first_name || `user_${telegramId}`;
  const referralCode = ctx.message.text.split(' ')[1];

  try {
    let user = await User.findOne({ where: { telegramId } });

    if (!user) {
      const newReferralCode = crypto.randomBytes(4).toString('hex');
      
      user = await User.create({
        telegramId,
        username,
        referralCode: newReferralCode,
        referredBy: referralCode || null
      });

      if (referralCode) {
        const referrer = await User.findOne({ where: { referralCode } });
        if (referrer) {
          console.log(`User ${telegramId} was referred by ${referrer.telegramId}`);
        }
      }
    } else {
      // Обновляем username если он изменился
      if (user.username !== username) {
        await user.update({ username });
      }
      
      // Если пользователь уже существует, но не имеет реферера и предоставлен реферальный код
      if (!user.referredBy && referralCode) {
        const referrer = await User.findOne({ where: { referralCode } });
        if (referrer && referrer.telegramId !== telegramId) { // Проверяем что это не самореферал
          await user.update({ referredBy: referralCode });
          console.log(`Existing user ${telegramId} was referred by ${referrer.telegramId}`);
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
// редис для уведомлений функция
async function scheduleHeartNotification(telegramId) {
  try {
    const user = await User.findOne({ where: { telegramId } });
    if (!user || user.lastHeartNotification) return;

    // Планируем уведомление через 25 минут
    const notificationTime = Date.now() + (25 * 60 * 1000);
    await redis.zadd('heart_notifications', notificationTime, telegramId);
    await user.update({ lastHeartNotification: new Date(notificationTime) });
  } catch (error) {
    console.error('Error scheduling heart notification:', error);
  }
}
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
        const initData = req.headers['x-telegram-init-data'];
        const urlParams = new URLSearchParams(initData);
        const userDataStr = urlParams.get('user');
        const userData = userDataStr ? JSON.parse(userDataStr) : {};
        
        // Используем first_name если username отсутствует
        const username = userData.username || userData.first_name || `user_${telegramId}`;

        let user = await User.findOne({ where: { telegramId } });
        const isNewUser = !user;

        if (isNewUser) {
          const newReferralCode = crypto.randomBytes(4).toString('hex');
          user = await User.create({
            telegramId,
            username,
            referralCode: newReferralCode,
            referredBy: null
          });
        } else {
          // Обновляем username если он изменился
          if (user.username !== username) {
            await user.update({ username });
          }
        }

        return {
          status: 200,
          body: {
            isNewUser,
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
    },
    '/schedule-heart-notification': async (req, res) => {
        const authError = await authMiddleware(req, res);
        if (authError) return authError;

        let body = '';
        req.on('data', chunk => { body += chunk; });
        
        return new Promise((resolve) => {
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const telegramId = data.telegramId.toString();
                    await scheduleHeartNotification(telegramId);
                    
                    resolve({
                        status: 200,
                        body: { success: true }
                    });
                } catch (error) {
                    console.error('Error scheduling notification:', error);
                    resolve({ 
                        status: 500, 
                        body: { error: 'Internal server error: ' + error.message } 
                    });
                }
            });
        });
    }
  }
};
// Проверка и отправка уведомлений каждую минуту
schedule.scheduleJob('*/1 * * * *', async () => {
  try {
    const now = Date.now();
    const notifications = await redis.zrangebyscore('heart_notifications', 0, now);
    
    for (const telegramId of notifications) {
      // Отправляем уведомление
      await bot.telegram.sendMessage(
        telegramId,
        '🦖 Все сердца восстановились!\n\nПора вернуться в игру и установить новый рекорд! 🏆'
      );
      
      // Удаляем отправленное уведомление
      await redis.zrem('heart_notifications', telegramId);
      
      // Обновляем статус уведомления в БД
      await User.update(
        { lastHeartNotification: null },
        { where: { telegramId } }
      );
    }
  } catch (error) {
    console.error('Error processing heart notifications:', error);
  }
});
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
  }[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if(error.code === 'ENOENT') {
        fs.readFile(path.join(__dirname, '..', 'client', 'main.html'), (error, content) => {
          if (error) {
            res.writeHead(404);
            res.end('Файл не найден');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end('Ошибка сервера: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
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
  const pathname = parsedUrl.pathname;
  const method = req.method;

  if (routes[method] && routes[method][pathname]) {
    const handler = routes[method][pathname];
    const result = await handler(req, res, parsedUrl.query);
    res.writeHead(result.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.body));
  } else {
    let filePath = path.join(__dirname, '..', 'dino', req.url === '/' ? 'main.html' : req.url);
    serveStaticFile(filePath, res);
  }
});

const httpsPort = 5000;
const httpPort = 5001;

server.listen(httpsPort, () => {
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