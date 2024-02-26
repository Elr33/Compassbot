// Import necessary modules
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { captureAndSendGoogleSheetScreenshot } = require('./scheduleScreenshot');
const { readAllTrips } = require('./readAllTrips');
const { sendContactsToTelegram } = require('./contacts');

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

  // Define the inline keyboard markup with three buttons
  const keyboardMarkup = {
    inline_keyboard: [
      [{ text: 'All Upcoming Trips', callback_data: 'alltrips' }],
      [{ text: 'Tomorrows Transport Schedule', callback_data: 'captureschedule' }],
      [{ text: 'Fetch Contacts', callback_data: 'fetchcontacts' }] // New button for fetching contacts
    ]
  };

  // Send initial message with inline keyboard
  bot.sendMessage(chatId, 'Welcome! Please select an action:', {
    reply_markup: JSON.stringify(keyboardMarkup)
  });
});

// Handle button clicks
bot.on('callback_query', async (callbackQuery) => {
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
    case 'fetchcontacts':
      // Handle 'fetchcontacts' action
      try {
        const contacts = [
          ['Port Control PE', '041 507 2909', 'none'],
          ['Port Control Coega', '041 507 8444', 'none'],
          ['Port Health', '041 391 8065', 'porthealth@gov.co.za'],
          ['VTS / Harbour Master', 'none', 'VTS.CONTROL@transnet.net'],
          ['TNPA', 'Mongameli.Robile@transnet.net', 'Jostinas.Bosman@transnet.net', 'TPTNCTSecurity@transnet.net']
        ]; // Hardcoded contacts
        await sendContactsToTelegram(chatId, contacts); // Send contacts to Telegram group
        console.log('Contacts sent successfully.');
      } catch (error) {
        console.error('Error sending contacts:', error);
      }
      break;
    default:
      console.log('Invalid action:', action);
  }
});

// Start the bot polling
bot.startPolling();
