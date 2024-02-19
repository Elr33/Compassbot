const { GoogleSpreadsheet } = require('google-spreadsheet');
const config = require('./config');
const { searchVesselImage } = require('./vesselImageSearch');
const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');

async function scrapeVesselInfo(vesselName) {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const keyword = vesselName; // Use the vessel name from your Google Sheet

    // Navigate to the Vessel Finder page for the specified vessel
    const url = `https://www.vesselfinder.com/vessels?name=${keyword}`;
    await page.goto(url, { timeout: 60000 });

    // Add your Puppeteer logic here to scrape vessel information, including the text snippet, vessel particulars, and recent port calls
    // ...

    // Scrape the vessel data
    const vesselData = {
      // Add the scraped vessel data here
      // Example: name: 'MSC ALLEGRA',
      //           type: 'Container Ship',
      //           flag: 'Liberia',
      //           length: '2021',
      //           width: '228786',
      //           gwt: '228406',
      //           textSnippet: 'The current position of ...',
      //           vesselParticulars: { ... },
      //           recentPortCalls: { ... },
    };

    await browser.close();

    return vesselData;
  } catch (error) {
    console.error('Error scraping vessel information:', error);
    throw error;
  }
}

async function sendVesselInfoToTelegram(bot, chatId, vesselName, sheetData) {
  try {
    console.log(`Fetching and sending vessel information for ${vesselName} to Telegram...`);

    // Scrape vessel information
    const vesselData = await scrapeVesselInfo(vesselName);

    // Format vessel information for sending to Telegram
    const formattedInfo = `
    Vessel Name: ${vesselData.name}
    Type: ${vesselData.type}
    Flag: ${vesselData.flag}
    Length: ${vesselData.length}
    Width: ${vesselData.width}
    GWT: ${vesselData.gwt}
    Text Snippet: ${vesselData.textSnippet}
    Vessel Particulars: ${JSON.stringify(vesselData.vesselParticulars)}
    Recent Port Calls: ${JSON.stringify(vesselData.recentPortCalls)}
    
    Additional Sheet Data:
    Date: ${sheetData.date}
    Time: ${sheetData.time}
    Flight: ${sheetData.flightNumber}
    Pickup: ${sheetData.pickupLocation}
    Drop-off: ${sheetData.dropoffLocation}
    Client: ${sheetData.client}
    Port: ${sheetData.port}
    Berth: ${sheetData.berth}
    Logs Received: ${sheetData.logsReceived}
    Passport Received: ${sheetData.passportReceived}
    Seamans Received: ${sheetData.seamansReceived}
    Permissions Received: ${sheetData.permissionsReceived}
    `;

    // Send the formatted vessel information to the Telegram group
    bot.sendMessage(chatId, formattedInfo);

    console.log(`Vessel information for ${vesselName} has been sent to Telegram.`);
  } catch (error) {
    console.error('Error sending vessel information to Telegram:', error);
    throw error;
  }
}

// Initialize the Telegram bot
const bot = new TelegramBot(config.telegramBotToken, { polling: true });

// Handle incoming messages and commands
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome to the Vessel Info Bot! Enter the name of the vessel to get information.');
});

bot.onText(/\/vesselinfo (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const vesselName = match[1];

  // For demonstration purposes, create sample sheet data
  const sheetData = {
    date: '2023-10-12',
    time: '10:00 AM',
    flightNumber: 'FL123',
    pickupLocation: 'Port A',
    dropoffLocation: 'Port B',
    client: 'ABC Corp',
    port: 'Port C',
    berth: 'Berth 1',
    logsReceived: 'Yes',
    passportReceived: 'No',
    seamansReceived: 'Yes',
    permissionsReceived: 'Yes',
  };

  // Send vessel information to Telegram
  sendVesselInfoToTelegram(bot, chatId, vesselName, sheetData);
});

// Export the readAllTrips function
module.exports = {
  readAllTrips2,
};
