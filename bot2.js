const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const cron = require('node-cron');

// Import necessary functions/modules
const { captureAndSendGoogleSheetScreenshot } = require('./scheduleScreenshot');
const { readAllTrips } = require('./readAllTrips');

// Create a new Telegram bot instance
const bot = new TelegramBot(config.telegramToken, { polling: true });

// Define the target group chat ID
const targetGroupChatId = '-1002128280650';

// Define rate limiting parameters
const requestDelay = 5000; // 5 seconds
const maxRetryCount = 5;

// Function to handle rate-limited requests
const handleRateLimitedRequest = (func) => {
  let retryCount = 0;

  const executeRequest = async () => {
    try {
      await func();
      console.log('Request successfully processed.');
    } catch (error) {
      if (error.response && error.response.statusCode === 429 && retryCount < maxRetryCount) {
        console.log(`Rate limit exceeded. Retrying after ${requestDelay}ms...`);
        retryCount++;
        setTimeout(executeRequest, requestDelay * (2 ** retryCount));
      } else {
        console.error('Error processing request:', error);
      }
    }
  };

  executeRequest();
};

// Handle '/start' command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  // Define the inline keyboard markup with two buttons
  const keyboardMarkup = {
    inline_keyboard: [
      [{ text: 'All Upcoming Trips', callback_data: 'alltrips' }],
      [{ text: 'Tomorrows Transport Schedule', callback_data: 'captureschedule' }]
    ]
  };

  // Send initial message with inline keyboard
  bot.sendMessage(chatId, 'Welcome! Please select an action:', {
    reply_markup: JSON.stringify(keyboardMarkup)
  });
});

// Handle button clicks
bot.on('callback_query', (callbackQuery) => {
  const action = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;

  // Execute corresponding action based on button click
  switch (action) {
    case 'alltrips':
      handleRateLimitedRequest(async () => {
        try {
          await readAllTrips(bot, targetGroupChatId);
          console.log('Trip details have been fetched and sent.');
        } catch (error) {
          console.log(error);
        }
      });
      break;
    case 'captureschedule':
      handleRateLimitedRequest(() => {
        captureAndSendGoogleSheetScreenshot(bot, config.chatId);
      });
      break;
    // Add more cases for other actions
  }
});

// Schedule the script to run at a specific time every day
cron.schedule('07 10 * * *', () => {
  handleRateLimitedRequest(() => {
    captureAndSendGoogleSheetScreenshot(bot, config.chatId);
  });
});

// Start the bot polling
bot.startPolling();
