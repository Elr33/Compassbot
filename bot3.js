const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { captureAndSendDailyRecapScreenshot2 } = require('./dailyRecapScreenshot2');
const { captureAndSendGoogleSheetScreenshot } = require('./scheduleScreenshot');
const { readAllTrips } = require('./readAllTrips');
const { sendContactsToTelegram } = require('./contacts');

// Create a new Telegram bot instance
const bot = new TelegramBot(config.telegramToken, { polling: true });

// Define the target group chat ID
const targetGroupChatId = '-1002128280650';

// Define rate limiting parameters
const requestDelay = 2000; // 2 seconds
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

  // Define the inline keyboard markup with four buttons
  const keyboardMarkup = {
    inline_keyboard: [
      [{ text: 'Upcoming Trips', callback_data: 'alltrips' }],
      [{ text: 'Transport Schedule', callback_data: 'captureschedule' }],
      [{ text: 'Important Contacts', callback_data: 'fetchcontacts' }],
      [{ text: 'Capture Sheet Screenshot', callback_data: 'capturesheet' }] // New button for capturing sheet screenshot
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
      // Call the function to capture and send Google Sheet screenshots
      captureAndSendGoogleSheetScreenshot(bot, targetGroupChatId);
      break;
    case 'fetchcontacts':
      // Handle 'fetchcontacts' action
      try {
        const contacts = [
          ['Port Control PE', '041 507 2909', 'none'],
          ['Port Control Coega', '041 507 8444', 'none'],
          ['Port Health', '041 391 8065', 'porthealth@gov.co.za'],
          ['VTS / Harbour Master', 'none', 'VTS.CONTROL@transnet.net'],
          ['ISPS Clearance', 'TBC', 'Lindeni.Marobela@transnet.net'],
          ['TNPA', 'TBC', 'Jostinas.Bosman@transnet.net', ],
          ['TNPA', 'TBC', 'Mongameli.Robile@transnet.net'],
          ['TNPA', 'TBC', 'TPTNCTSecurity@transnet.net']
        ]; // Hardcoded contacts
        await sendContactsToTelegram(chatId, contacts); // Send contacts to Telegram group
        console.log('Contacts sent successfully.');
      } catch (error) {
        console.error('Error sending contacts:', error);
      }
      break;
    case 'capturesheet':
      // Call the function to capture and send Google Sheet screenshots
      captureAndSendDailyRecapScreenshot2(bot, targetGroupChatId);
      break;
    default:
      console.log('Invalid action:', action);
  }
});

// Start the bot polling
bot.startPolling();