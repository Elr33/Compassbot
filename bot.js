const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const cron = require('node-cron');


// const { searchAllMscTrips } = require('./readAllMscTrips');
// const { readDailyTrips } = require('./readDailyTrips');
// const { readTomorrowTrips } = require('./tomorrowTrips');

const { fetchAndPostNews } = require('./rssNews');
const { motivationalQuote } = require('./motivationalQuotes');
const { captureAndSendGoogleSheetScreenshot } = require('./scheduleScreenshot'); // Import the captureGoogleSheetScreenshot function
const { readAllTrips } = require('./readAllTrips');

const bot = new TelegramBot(config.telegramToken, { username: 'CompassMG_bot', polling: true });

// Replace <TargetGroupChatID> with the actual chat ID of the target group
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

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
});


// Start the cron job for daily news posting at X
cron.schedule('56 12 * * *', () => {
  fetchAndPostNews(bot, targetGroupChatId);
});

// Start the cron job for daily motivational quote posting at X
cron.schedule('56 12 * * *', () => {
  motivationalQuote(bot, targetGroupChatId);
});

// // Schedule the script to run at a specific time every day at X
// cron.schedule('07 10 * * *', async () => {
//   captureAndSendGoogleSheetScreenshot(bot, targetGroupChatId);
// });

// Schedule the script to run at a specific time every day at X
cron.schedule('32 09 * * *', async () => {
  captureAndSendGoogleSheetScreenshot(bot, targetGroupChatId);
});

bot.onText(/\/alltrips/, async (msg) => {
  const chatId = msg.chat.id;

  handleRateLimitedRequest(async () => {
    try {
      await readAllTrips(bot, targetGroupChatId);
      console.log('Trip details have been fetched and sent.');
    } catch (error) {
      console.log(error);
    }
  });
});


// NOT WORKING YET***
// bot.onText(/\/tripstomorrow/, async (msg) => {
//   const chatId = msg.chat.id;

//   handleRateLimitedRequest(async () => {
//     try {
//       await readTomorrowTrips(bot, targetGroupChatId);
//       console.log('Trip details have been fetched and sent.');
//     } catch (error) {
//       console.log(error);
//     }
//   });
// });

// WORKING**
// bot.onText(/\/trip/, async (msg) => {
//   const chatId = msg.chat.id;

//   handleRateLimitedRequest(async () => {
//     try {
//       await readDailyTrips(bot, targetGroupChatId);
//       console.log('Daily trip details have been fetched and sent.');
//     } catch (error) {
//       console.log(error);
//     }
//   });
// });

//WORKING**
// bot.onText(/\/msctrips/, async (msg) => {
//   const chatId = msg.chat.id;
//   try {
//     await readMscTrips(bot, targetGroupChatId);
//     console.log('MSC trip details have been fetched and sent.');
//   } catch (error) {
//     console.error('Error fetching MSC trip details:', error);
//   }
// });

//WORKING**
// bot.onText(/\/allmsctrips/, async (msg) => {
//   const chatId = msg.chat.id;

//   try {
//     await searchAllMscTrips(bot, chatId);
//   } catch (error) {
//     console.error('Error executing searchAllMscTrips:', error);
//     bot.sendMessage(chatId, 'An error occurred while searching for MSC trips.');
//   }
// });

// Define the delay between polling cycles in milliseconds
const pollingDelay = 1000; // 1 seconds

// Function to start polling with a delay between each cycle
const startPollingWithDelay = () => {
  setTimeout(() => {
    bot.startPolling();
  }, pollingDelay);
};

// Call the function to start polling with a delay
startPollingWithDelay();
