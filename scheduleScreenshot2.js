const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

puppeteer.use(StealthPlugin());

// Load the Google Sheet
const doc = new GoogleSpreadsheet(config.googleSheetId);

const captureAndSendGoogleSheetPDF = async () => {
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
    const matchingSheet = sheets.find((sheet) => sheet.title === formattedDate);

    if (!matchingSheet) {
      console.log(`Sheet for ${formattedDate} does not exist.`);
      return;
    }

    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: true,
    });

    const page = await browser.newPage();

    // Create an HTML table to display the data with the company logo and date
    const logoUrl = 'https://i.imgur.com/htQo8be.jpg'; // URL of the logo hosted on Imgur

    let htmlContent = `
      <div style="position: absolute; top: 0; left: 0;">
        <img src="${logoUrl}" alt="Company Logo" style="width: 80px; height: auto;">
      </div>
      <div style="text-align: center; margin-top: 55px;">
        <h2 style="font-size: 25px; color: #4686bc; font-weight: bold;">Vehicle Trips</h2>
      </div>
      <div style="text-align: right; margin-top: -20px;">
        <h3 style="font-size: 14px; color: #4686bc;">${formattedDate}</h3>
      </div>
      <table style="border-collapse: collapse; width: 100%;">
    `;

    // ... (rest of your HTML content)

    htmlContent += '</table>';

    // Add the Windguru script to the HTML content with an adjusted height
    const windguruScript = `
      <!-- Windguru script here -->
    `;

    // Add the BrainyQuote script to the HTML content
    const brainyQuoteScript = `
      <div style="text-align: center;">
        <script type="text/javascript" src="https://www.brainyquote.com/link/quotebr.js"></script>
        <small><i><a href="/quote_of_the_day" target="_blank" rel="nofollow">more Quotes</a></i></small>
      </div>
    `;

    htmlContent += windguruScript;
    htmlContent += brainyQuoteScript;

    // Set the page content with the data table and Windguru script
    await page.setContent(htmlContent);

    // Wait for a moment to allow Windguru script to load
    await page.waitForTimeout(10000); // Adjust the delay as needed

    // Capture a screenshot of the content
    const screenshotPath = './images/Schedule.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Convert the image to PDF
    const pdfPath = './images/Schedule.pdf';
    const pdfDoc = await PDFDocument.create();
    const imageBytes = fs.readFileSync(screenshotPath);
    const image = await pdfDoc.embedPng(imageBytes);
    const pageWidth = image.width;
    const pageHeight = image.height;
    const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);
    pdfPage.drawImage(image, { x: 0, y: 0 });

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(pdfPath, pdfBytes);

    // Send the PDF to the Telegram group
    const bot = new TelegramBot(config.telegramToken, { polling: false });

    if (fs.existsSync(pdfPath)) {
      bot.sendDocument(config.chatId, fs.readFileSync(pdfPath), {
        caption: 'Google Sheet in PDF format',
      });
      console.log('Google Sheet PDF sent successfully.');
    } else {
      console.error('PDF file does not exist.');
    }

    // Close the browser
    await browser.close();
  } catch (error) {
    console.error('Error capturing and sending Google Sheet PDF:', error);

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
  captureAndSendGoogleSheetPDF,
};
