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
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;
const Redis = require('ioredis');
const redis = new Redis({
    host: '127.0.0.1',
    port: 6379,
    retryStrategy: function(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: null
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

redis.on('connect', () => {
    console.log('Successfully connected to Redis');
});
const schedule = require('node-schedule');
const isAdmin = (telegramId) => {
  return telegramId.toString() === ADMIN_ID;
};

// Создаем подключение к базе данных
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD, 
  {
      host: process.env.DB_HOST,
      dialect: process.env.DB_DIALECT,
      logging: false,
      logQueryParameters: false,
      benchmark: false,
      // Настраиваем кастомный logger
      logger: {
        error: (err) => {
          // Логируем ошибки БД
          if (err.original) { // Ошибки базы данных
            console.error('Database Error:', {
              message: err.original.message,
              code: err.original.code,
              timestamp: new Date().toISOString()
            });
          } else if (err.name === 'SequelizeValidationError') { // Ошибки валидации
            console.error('Validation Error:', {
              message: err.message,
              errors: err.errors.map(e => e.message),
              timestamp: new Date().toISOString()
            });
          } else { // Другие ошибки запросов
            console.error('Query Error:', {
              message: err.message,
              timestamp: new Date().toISOString()
            });
          }
        }
      },
      pool: {
        max: 50,
        min: 10,
        acquire: 30000,
        idle: 10000
      }
    }
  );
  sequelize.authenticate()
    .then(() => {
      console.log('Database connection has been established successfully.');
    })
    .catch(err => {
      console.error('Unable to connect to the database:', err);
    });
  
  // Если нужно отслеживать отключение:
  process.on('SIGINT', async () => {
    try {
      await sequelize.close();
      console.log('Database connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error closing database connection:', err);
      process.exit(1);
    }
  });

// Определяем модель User
const User = sequelize.define('User', {
  telegramId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    index: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  highScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    index: true
  },
  referralCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    index: true
  },
  referredBy: {
    type: DataTypes.STRING,
    allowNull: true,
    index: true
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
        }
      }
    }

    ctx.reply('🦖 Welcome to Dino Rush 🦖💨!\n\n' + 
      '🎮 Help the dinosaur overcome obstacles and set a new record!\n' +
      '🏆 Compete with friends and climb the leaderboard.\n\n' +
      '👇 Click the button below to start the adventure:', {
      reply_markup: {
        resize_keyboard: true
      }
    });

  } catch (error) {
    console.error('Error in start command:', error);
    ctx.reply('An error occurred. Please try again later.');
  }
});

// Добавляем обработчик команды /paysupport
bot.command('paysupport', async (ctx) => {
  try {
    await ctx.reply('If you have any issues or questions, please contact our moderator:\n@mirror_of_callandra\n\nWith ❤️,\nDino Rush Team.');
  } catch (error) {
    console.error('Error in paysupport command:', error);
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

      await ctx.reply('✨ Skin purchased successfully! Now you can select it in the game.');
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

const getRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
};

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
          // Логируем нового пользователя
          console.log('\x1b[32m%s\x1b[0m', `🎉 New user joined: ${username} (${telegramId})`);
        } else {
          // Логируем возвращение существующего пользователя
          console.log('\x1b[36m%s\x1b[0m', `👋 User returned: ${username} (${telegramId})`);
          
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
    console.log('Searching for referred friends for user with telegramId:', telegramId);
    const user = await User.findOne({ where: { telegramId } });
    if (user) {
      const referredFriends = await User.findAll({
        where: { referredBy: user.referralCode },
        attributes: ['telegramId', 'username']
      });
      console.log('Found referred friends:', referredFriends.length);
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
      console.log('User not found');
      return { status: 404, body: { error: 'User not found' } };
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return { status: 500, body: { error: 'Internal server error' } };
  }
},
'/create-skin-invoice': async (req, res, query) => {
  const authError = await authMiddleware(req, res);
      if (authError) return authError;

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
            title: 'Purchase of a Dino skin',
            description: `${skinName === 'red' ? 'Red' : 'Green'} skin for your dinosaur`,
            payload: `skin_${telegramId}_${skinName}`,
            provider_token: "",
            currency: 'XTR',
            prices: [{
                label: '⭐️ Skin',
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
      const authError = await authMiddleware(req, res);
      if (authError) return authError;

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
      const authError = await authMiddleware(req, res);
      if (authError) return authError;

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
    '/get-friends-leaderboard': async (req, res, query) => {
    const telegramId = query.telegramId;
    
    if (!telegramId) {
        return { status: 400, body: { error: 'Missing telegramId parameter' } };
    }

    try {
        // Получаем текущего пользователя
        const currentUser = await User.findOne({ 
            where: { telegramId },
            attributes: ['telegramId', 'username', 'highScore']
        });

        if (!currentUser) {
            return { status: 404, body: { error: 'User not found' } };
        }

        // Получаем топ-100 игроков с наивысшими рекордами
        const topPlayers = await User.findAll({
          where: {
              highScore: {
                  [Sequelize.Op.gt]: 0
              }
          },
          attributes: ['telegramId', 'username', 'highScore'],
          order: [['highScore', 'DESC']],
          limit: 50  // Уменьшаем лимит до 50
      });

        // Преобразуем данные
        const leaderboardData = topPlayers.map(player => ({
            id: player.telegramId,
            username: player.username,
            highScore: player.highScore,
            isCurrentUser: player.telegramId === telegramId
        }));

        // Если текущий пользователь не в топ-100, добавляем его отдельно
        if (!leaderboardData.some(player => player.isCurrentUser)) {
            leaderboardData.push({
                id: currentUser.telegramId,
                username: currentUser.username,
                highScore: currentUser.highScore,
                isCurrentUser: true
            });
        }

        return { 
            status: 200, 
            body: { 
                leaderboard: leaderboardData,
                timestamp: Date.now()
            } 
        };
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        return { status: 500, body: { error: 'Internal server error' } };
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
    },
    '/check-subscription': async (req, res, query) => {
        console.log('Получен запрос на /check-subscription');
        const telegramId = query.telegramId;
        const channelId = query.channelId;
        
        if (!telegramId || !channelId) {
            console.log('Отсутствует telegramId или channelId');
            return { status: 400, body: { error: 'Missing required parameters' } };
        }

        try {
            console.log('Проверка подписки для пользователя:', telegramId, 'на канал:', channelId);
            const chatMember = await bot.telegram.getChatMember(channelId, telegramId);
            
            const isSubscribed = ['member', 'administrator', 'creator'].includes(chatMember.status);
            
            console.log('Статус подписки:', isSubscribed);
            return { 
                status: 200, 
                body: { 
                    isSubscribed,
                    status: chatMember.status 
                } 
            };
        } catch (error) {
            console.error('Ошибка при проверке подписки:', error);
            
            // Добавляем специальное сообщение для этой ошибки
            if (error.message.includes('member list is inaccessible')) {
                return { 
                    status: 400, 
                    body: { 
                        error: 'Bot needs admin rights in the channel',
                        details: 'Please contact administrator to fix this issue'
                    } 
                };
            }
            
            return { status: 500, body: { error: 'Internal server error' } };
        }
    },
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
      '/update-high-score': async (req, res) => {
        const authError = await authMiddleware(req, res);
        if (authError) return authError;

        let body = '';
        req.on('data', chunk => { body += chunk; });
        
        return new Promise((resolve) => {
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const telegramId = data.telegramId.toString();
                    const highScore = parseInt(data.highScore);
                    
                    console.log('Updating high score for user:', telegramId, highScore);
                    
                    const user = await User.findOne({ 
                        where: { telegramId: telegramId }
                    });
                    
                    if (!user) {
                        console.log('User not found:', telegramId);
                        resolve({ status: 404, body: { error: 'User not found' } });
                        return;
                    }
                    console.log('Current DB high score:', user.highScore);
                    console.log('New high score:', highScore);
                    if (highScore > user.highScore) {
                        await user.update({ highScore });
                        console.log('High score updated successfully');
                        resolve({
                            status: 200,
                            body: { success: true }
                        });
                    } else {
                        console.log('New score is not higher than the current high score');
                        resolve({
                            status: 200,
                            body: { success: false, message: 'Score is not a new high score' }
                        });
                    }
                } catch (error) {
                    console.error('Error updating high score:', error);
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
      },
      '/admin/broadcast': async (req, res) => {
    const authError = await authMiddleware(req, res);
    if (authError) return authError;
    
    let body = '';
    req.on('data', chunk => { body += chunk; });
    
    return new Promise((resolve) => {
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const adminId = data.adminId.toString();
                
                if (!isAdmin(adminId)) {  // Используем функцию isAdmin
                    resolve({
                        status: 403,
                        body: { error: 'Unauthorized: Admin access required' }
                    });
                    return;
                }
  
                      const { message, button } = data;
                      
                      // Получаем всех пользователей
                      const users = await User.findAll();
                      const results = {
                          total: users.length,
                          success: 0,
                          failed: 0
                      };
  
                      // Отправляем сообщение каждому пользователю
                      for (const user of users) {
                          try {
                              const messageData = {
                                  chat_id: user.telegramId,
                                  text: message,
                                  parse_mode: 'HTML'
                              };
  
                              // Если есть кнопка, добавляем её
                              if (button) {
                                  messageData.reply_markup = {
                                      inline_keyboard: [[{
                                          text: button.text,
                                          web_app: { url: button.url }
                                      }]]
                                  };
                              }
  
                              await bot.telegram.sendMessage(
                                  user.telegramId,
                                  message,
                                  messageData
                              );
                              results.success++;
                          } catch (error) {
                              console.error(`Failed to send message to ${user.telegramId}:`, error);
                              results.failed++;
                          }
                          
                          // Добавляем задержку между сообщениями
                          await new Promise(resolve => setTimeout(resolve, 50));
                      }
  
                      resolve({
                          status: 200,
                          body: { 
                              success: true,
                              results
                          }
                      });
                  } catch (error) {
                      console.error('Error in broadcast:', error);
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
      try {
        // Отправляем уведомление
        await bot.telegram.sendMessage(
          telegramId,
          '🦖 All hearts have been restored!\n\nIt\'s time to return to the game and set a new record! 🏆'
        );
      } catch (error) {
        // Обрабатываем ошибки отправки сообщений
        if (error.response && (
          error.response.error_code === 403 || // Бот заблокирован
          error.response.error_code === 400 || // Чат не найден
          error.response.description.includes('chat not found') ||
          error.response.description.includes('blocked') ||
          error.response.description.includes('deactivated')
        )) {
          console.log(`User ${telegramId} has blocked the bot or deleted the chat. Removing notification.`);
        } else {
          // Логируем неожиданные ошибки
          console.error(`Unexpected error sending notification to ${telegramId}:`, error.message);
        }
      }
      
      // В любом случае удаляем уведомление из Redis и обновляем статус
      try {
        await redis.zrem('heart_notifications', telegramId);
        await User.update(
          { lastHeartNotification: null },
          { where: { telegramId } }
        );
      } catch (dbError) {
        console.error('Error updating notification status:', dbError);
      }
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

// Функция очистки с мониторингом памяти
const cleanupRequestData = () => {
  try {
    // Записываем состояние памяти до очистки
    const beforeClean = process.memoryUsage();
    
    // Очищаем временные данные
    global.gc && global.gc();
    
    // Очищаем кэш Redis для rate-limit
    redis.keys('user-ratelimit:*').then(keys => {
      if (keys.length) redis.del(...keys);
    });

    // Проверяем результат очистки
    const afterClean = process.memoryUsage();
    const freedMemory = Math.round((beforeClean.heapUsed - afterClean.heapUsed) / 1024 / 1024);
    
    if (freedMemory > 0) {
      console.log(`Memory cleaned: ${freedMemory}MB freed`);
    }
    
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

// Запускаем очистку каждый час
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 час
const cleanup = setInterval(cleanupRequestData, CLEANUP_INTERVAL);

// Запускаем первую очистку сразу
cleanupRequestData();

const LIMITED_ENDPOINTS = [
  '/sync-user-data',
  '/get-referral-link',
  '/get-referred-friends',
  '/get-user-skins',
  '/reward',
  '/update-high-score',
  '/update-user-skins',
];

const checkUserRateLimit = async (userId) => {
  const key = `user-ratelimit:${userId}`;
  const limit = 50; // 20 запросов
  const window = 1; // за 1 секунду
  
  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, window);
    }
    return current <= limit;
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return true; // В случае ошибки пропускаем запрос
  }
};

const rateLimitMiddleware = async (req) => {
  const pathname = new URL(req.url, 'https://dino-app.ru').pathname;
  
  // Проверяем только указанные эндпоинты
  if (!LIMITED_ENDPOINTS.includes(pathname)) {
    return null;
  }

  // Получаем Telegram ID пользователя
  const initData = req.headers['x-telegram-init-data'];
  let userId;

  try {
    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get('user'));
    userId = user.id.toString();
  } catch (e) {
    return null; // Если не удалось получить ID, пропускаем запрос
  }

  const allowed = await checkUserRateLimit(userId);
  if (!allowed) {
    return {
      status: 429,
      body: {
        error: 'Too Many Requests',
        message: 'Please slow down your requests.'
      }
    };
  }

  return null;
};

const server = https.createServer(options, async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Проверяем rate limit только для определенных эндпоинтов
if (LIMITED_ENDPOINTS.includes(pathname)) {
  const rateLimitError = await rateLimitMiddleware(req);
  if (rateLimitError) {
    res.writeHead(rateLimitError.status, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data'
    });
    res.end(JSON.stringify(rateLimitError.body));
    return;
  }
}

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
process.once('SIGINT', () => {
  clearInterval(cleanup);  // Очищаем таймер
  bot.stop('SIGINT');     // Останавливаем бота
});

process.once('SIGTERM', () => {
  clearInterval(cleanup);  // Очищаем таймер
  bot.stop('SIGTERM');    // Останавливаем бота
});