const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { searchVesselImage } = require('./searchVesselImage');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');


puppeteer.use(StealthPlugin());

// Load the Google Sheet
const doc = new GoogleSpreadsheet(config.googleSheetId);

const captureAndSendDailyRecapScreenshot = async () => {
  try {
    // Authenticate with Google Sheets API using your existing code
    await doc.useServiceAccountAuth({
      client_email: config.googleClientEmail,
      private_key: config.googlePrivateKey,
    });
    await doc.loadInfo();

    // Fetch the desired sheet by title or index
    const sheet = doc.sheetsByIndex[0]; // Assuming it's the first sheet, adjust as needed
    await sheet.loadCells();

    // Read the IMO number from the corresponding cell
    const imoCell = sheet.getCell(ROW_INDEX, COLUMN_INDEX); // Replace ROW_INDEX and COLUMN_INDEX with the actual cell coordinates
    const imoNumber = imoCell.value;

    // Create an HTML table to display the data
    let htmlContent = '<table border="1">';

    // Iterate over each row and cell in the sheet
    for (let i = 0; i < sheet.rowCount; i++) {
      htmlContent += '<tr>';
      for (let j = 0; j < sheet.columnCount; j++) {
        const cell = sheet.getCell(i, j);
        htmlContent += `<td>${cell.value}</td>`;
      }
      htmlContent += '</tr>';
    }

    htmlContent += '</table>';

    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();

    // Set the page content with the data table
    await page.setContent(htmlContent);

    // Capture a screenshot of the content
    const screenshotPath = './images/daily_recap_screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Search for vessel image based on IMO number
    const vesselImageURL = await searchVesselImage(imoNumber);

    // Load vessel image and position it on the top right-hand corner
    if (vesselImageURL) {
      const imgTag = `<img src="${vesselImageURL}" style="position: absolute; top: 10px; right: 10px; width: 100px; height: auto;">`;
      await page.setContent(imgTag, { append: true });
    }

    // Close the browser
    await browser.close();

    // Send the screenshot to the Telegram group
    const bot = new TelegramBot(config.telegramToken, { polling: false });

    if (fs.existsSync(screenshotPath)) {
      bot.sendPhoto(config.chatId, fs.readFileSync(screenshotPath));
      console.log('Daily Recap screenshot sent successfully.');
    } else {
      console.error('Screenshot file does not exist.');
    }
  } catch (error) {
    console.error('Error capturing and sending Daily Recap screenshot:', error);
  }
};

module.exports = {
  captureAndSendDailyRecapScreenshot,
};
