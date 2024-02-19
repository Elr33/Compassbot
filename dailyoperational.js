const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

// Load the Google Sheet
const doc = new GoogleSpreadsheet(config.googleSheetId);

const captureAndSendGoogleSheetScreenshot = async () => {
  try {
    // Calculate the date for the following day
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Format the date as "dd-mm-yyyy"
    const formattedDate = formatDate(tomorrow);

    // Authenticate with Google Sheets API using your existing code
    await doc.useServiceAccountAuth({
      client_email: config.googleClientEmail,
      private_key: config.googlePrivateKey,
    });
    await doc.loadInfo();

    // Check if a sheet with the following day's name exists
    const sheets = doc.sheetsByIndex;

    const matchingSheet = sheets.find((sheet) => {
      // Compare the sheet title in "dd-mm-yyyy" format directly
      return sheet.title === formattedDate;
    });

    if (!matchingSheet) {
      console.log(`Sheet for ${formattedDate} does not exist.`);
      return;
    }

    // Define the desired range (A1:G15)
    const range = 'A1:G20';

    // Fetch data from the specified range
    await matchingSheet.loadCells(range);

    // Create an HTML table to display the data with the company logo and date
    const logoUrl = 'https://i.imgur.com/htQo8be.jpg'; // URL of the logo hosted on Imgur

    let htmlContent = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <img src="${logoUrl}" alt="Company Logo" style="width: 80px; height: auto;">
        </div>
        <div style="text-align: center;">
          <h2 style="font-size: 25px; color: #4686bc; margin: 0;">Vehicle Trips</h2>
        </div>
        <div>
          <h3 style="font-size: 14px; color: #4686bc; margin: 0;">${formattedDate}</h3>
        </div>
      </div>
      <table style="border-collapse: collapse; width: 100%;">
    `;

    for (let row = 0; row < 20; row++) {
      const isHeaderRow = row === 0;
      const rowClass = isHeaderRow ? 'header-row' : '';
      const rowData = [];

      htmlContent += `<tr class="${rowClass}">`;

      for (let col = 0; col < 7; col++) {
        const cell = matchingSheet.getCell(row, col);
        const cellValue = cell.value || ''; // Replace null with an empty string

        // Determine if it's a header cell and apply styling if needed
        const cellTag = isHeaderRow ? 'th' : 'td';
        const cellStyle = isHeaderRow
          ? 'background-color: #0072bb; color: white; padding: 4px; font-size: 12px; font-weight: bold;'
          : 'border: 1px solid #000; padding: 3px; font-size: 10px;';
        rowData.push(cellValue);

        // Include the cell value in the HTML table with appropriate styling
        htmlContent += `<${cellTag} style="${cellStyle}">${cellValue}</${cellTag}>`;
      }

      // Check if all cells in the row are empty (no data)
      const isRowEmpty = rowData.every(cellValue => cellValue === '');

      if (!isHeaderRow && isRowEmpty) {
        // If it's not a header row and all cells are empty, make it white
        htmlContent = htmlContent.replace(`class="${rowClass}"`, 'class="empty-row"');
      }

      htmlContent += '</tr>';
    }

    htmlContent += '</table>';

    // Add the Windguru script to the HTML content with an adjusted height
    const windguruScript = `
      <div id="weather" style="height: 175px;"> <!-- Adjust the height as needed -->
        <script id="wg_fwdg_51679_100_1695720286807">
          (function (window, document) {
            var loader = function () {
              var arg = ["s=51679", "m=100", "uid=wg_fwdg_51679_100_1695720286807", "wj=knots", "tj=c", "waj=m", "tij=cm", "odh=0", "doh=24", "fhours=72", "hrsm=2", "vt=forecasts", "lng=en", "idbs=1", "p=WINDSPD,SMER,TMPE,APCP1s"];
              var script = document.createElement("script");
              var tag = document.getElementsByTagName("script")[0];
              script.src = "https://www.windguru.cz/js/widget.php?" + (arg.join("&"));
              tag.parentNode.insertBefore(script, tag);
            };
            window.addEventListener ? window.addEventListener("load", loader, false) : window.attachEvent("onload", loader);
          })(window, document);
        </script>
      </div>
    `;

    // Center the "Quote of the Day" section
    const brainyQuoteScript = `
      <div style="text-align: center; margin-bottom: 5px; margin-top: 5px; ">
        <script type="text/javascript" src="https://www.brainyquote.com/link/quotebr.js"></script>
        <small><i><a href="/quote_of_the_day" target="_blank" rel="nofollow">more Quotes</a></i></small>
      </div>
    `;

    htmlContent += windguruScript;
    // htmlContent += vesseltrack;
    htmlContent += brainyQuoteScript;

    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();

    // Set the page content with the data table and Windguru script
    await page.setContent(htmlContent);

    // Wait for a moment to allow Windguru script to load
    await page.waitForTimeout(10000); // Adjust the delay as needed

    // Capture a screenshot of the content
    const screenshotPath = './images/Schedule.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Close the browser
    await browser.close();

    // Send the screenshot to the Telegram group
    const bot = new TelegramBot(config.telegramToken, { polling: false });

    if (fs.existsSync(screenshotPath)) {
      bot.sendPhoto(config.chatId, fs.readFileSync(screenshotPath));
      console.log('Google Sheet screenshot sent successfully.');
    } else {
      console.error('Screenshot file does not exist.');
    }
  } catch (error) {
    console.error('Error capturing and sending Google Sheet screenshot:', error);

    // Check for DNS resolution error
    if (error.code === 'ENOTFOUND' && error.hostname === 'www.googleapis.com') {
      console.error('DNS resolution issue: Unable to resolve www.googleapis.com.');
      console.error('Please check your server\'s DNS settings and internet connection.');
    }
  }
};

// Function to format a date as "dd-mm-yyyy"
const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

module.exports = {
  captureAndSendGoogleSheetScreenshot,
};
