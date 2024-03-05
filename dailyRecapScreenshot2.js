const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const { searchVesselImage } = require('./vesselImageSearch');

puppeteer.use(StealthPlugin());

// Load the Google Sheet
const doc = new GoogleSpreadsheet(config.googleSheetId2);

// Define the row indices for each section heading
const HEADINGS = [
    { title: 'Vessel Port Call Details', startRow: 3, endRow: 14 },
    { title: 'Compass Maritime Husbandry Appointment Details', startRow: 15, endRow: 23 },
    { title: 'Launch Boat Schedule', startRow: 24, endRow: 38 },
    { title: 'In Port Crew Change Details', startRow: 39, endRow: 52 },
    { title: 'Berthing Prospects', startRow: 53, endRow: 57 }
];

const captureAndSendDailyRecapScreenshot2 = async () => {
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
            defaultViewport: null, // Set the viewport to null to allow custom viewport
            args: ['--window-size=1920,1080', '--disable-infobars'] // Adjust the window size
        });

        const bot = new TelegramBot(config.telegramToken, { polling: false });

        // Iterate over each sheet in the Google Spreadsheet
        for (const sheet of doc.sheetsByIndex) {
            await sheet.loadCells();

            // Create an HTML layout with company logo on the top left
            let htmlContent = '';

            // Search for vessel image based on IMO number
            const vesselImageURL = await searchVesselImage(sheet.getCell(6, 1).value); // IMO number at B7

            // Add vessel image above the main heading
            if (vesselImageURL) {
                htmlContent += `<div style="text-align: center;"><img src="${vesselImageURL}" style="max-width: 800px; height: auto; margin-bottom: 40px;"></div>`;
            }

            // Add dynamic date header
            const currentDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
            htmlContent += `<h1 style="text-align: center; font-size: 48px; font-weight: bold; margin-bottom: 40px;">Daily Operational Recap Generated on ${currentDate}</h1>`;

            // Create an HTML table to display the data
            htmlContent += '<table style="width: 100%; border-collapse: collapse; border: 2px solid #000; font-size: 36px;">';

            // Add headings and information rows
            for (const heading of HEADINGS) {
                htmlContent += `<tr><th colspan="2" style="background-color: #007bff; color: white; text-align: center; font-size: 42px; font-weight: bold; padding: 10px;">${heading.title}</th></tr>`;

                // Add rows within the specified range for each section
                let isLightBlueBackground = false;
                for (let i = heading.startRow; i <= heading.endRow; i++) {
                    htmlContent += `<tr style="background-color: ${isLightBlueBackground ? '#f0f8ff' : 'white'};">`;
                    for (let j = 0; j < 2; j++) {
                        const cell = sheet.getCell(i, j);
                        const fontWeight = j === 0 ? 'bold' : 'normal';
                        htmlContent += `<td style="padding: 10px; font-weight: ${fontWeight};">${cell.value}</td>`;
                    }
                    htmlContent += '</tr>';
                    isLightBlueBackground = !isLightBlueBackground; // Toggle background color
                }
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
                console.log(`Daily Recap screenshot for ${sheet.title} sent successfully.`);
            } else {
                console.error(`Screenshot file for ${sheet.title} does not exist.`);
            }

            // Close the page after processing
            await page.close();
        }

        // Close the browser after processing all sheets
        await browser.close();
    } catch (error) {
        console.error('Error capturing and sending Daily Recap screenshots:', error);
    }
};

module.exports = {
    captureAndSendDailyRecapScreenshot2,
};
