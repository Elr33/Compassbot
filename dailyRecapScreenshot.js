const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// Load the Google Sheet
const doc = new GoogleSpreadsheet(config.googleSheetId2);

const captureAndSendGoogleSheetScreenshot2 = async () => {
  try {
    // Authenticate with Google Sheets API using your existing code
    await doc.useServiceAccountAuth({
      client_email: config.googleClientEmail,
      private_key: config.googlePrivateKey,
    });
    await doc.loadInfo();

    // Create a headless browser instance
    const browser = await puppeteer.launch({
      headless: true,
    });

    const bot = new TelegramBot(config.telegramToken, { polling: false });

    // Iterate over each sheet in the Google Spreadsheet
    for (const sheet of doc.sheetsByIndex) {
      await sheet.loadCells();

      // Find the last row and column with data
      let lastRow = 0;
      let lastCol = 0;
      for (let i = 0; i < sheet.rowCount; i++) {
        for (let j = 0; j < sheet.columnCount; j++) {
          const cell = sheet.getCell(i, j);
          if (cell.value !== null && cell.value !== '') {
            lastRow = Math.max(lastRow, i);
            lastCol = Math.max(lastCol, j);
          }
        }
      }

      // Create an HTML table to display the data
      let htmlContent = '<table border="1">';

      // Iterate over each row and cell up to the last row and column with data
      for (let i = 0; i <= lastRow; i++) {
        htmlContent += '<tr>';
        for (let j = 0; j <= lastCol; j++) {
          const cell = sheet.getCell(i, j);
          htmlContent += `<td>${cell.value}</td>`;
        }
        htmlContent += '</tr>';
      }

      htmlContent += '</table>';

      const page = await browser.newPage();

      // Set the page content with the data table
      await page.setContent(htmlContent);

      // Capture a screenshot of the content
      const screenshotPath = `./images/sheet_${sheet.title}_screenshot.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });

      // Send the screenshot to the Telegram group
      if (fs.existsSync(screenshotPath)) {
        bot.sendPhoto(config.chatId, fs.readFileSync(screenshotPath));
        console.log(`Google Sheet screenshot for ${sheet.title} sent successfully.`);
      } else {
        console.error(`Screenshot file for ${sheet.title} does not exist.`);
      }

      // Close the page after processing
      await page.close();
    }

    // Close the browser after processing all sheets
    await browser.close();
  } catch (error) {
    console.error('Error capturing and sending Google Sheet screenshots:', error);
  }
};

module.exports = {
    captureAndSendGoogleSheetScreenshot2,
};
