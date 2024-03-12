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
    { title: 'Vessel Port Call Details', startRow: 4, endRow: 13 },
    { title: 'Compass Maritime Husbandry Appointment Details', startRow: 14, endRow: 21 },
    { title: 'Launch Boat Schedule', startRow: 22, endRow: 35 },
    { title: 'In Port Crew Change Details', startRow: 36, endRow: 48 },
    { title: 'Berthing Prospects', startRow: 49, endRow: 52 }
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

            // Add company logo at the top left
            htmlContent += `<div style="position: absolute; top: 10px; left: 10px;"><img src="${config.companyLogoURL}" style="height: 50px; width: auto;"></div>`;

            // Search for vessel image based on IMO number
            const vesselImageURL = await searchVesselImage(sheet.getCell(6, 1).value); // IMO number at B7

            // Add vessel image in the middle
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
                // Check if any row within the range has data
                let hasData = false;
                for (let i = heading.startRow; i <= heading.endRow; i++) {
                    const cell1 = sheet.getCell(i, 0);
                    const cell2 = sheet.getCell(i, 1);
                    if (cell1.value || cell2.value) {
                        hasData = true;
                        break;
                    }
                }

                // Add section only if it has data
                if (hasData) {
                    htmlContent += `<tr><th colspan="2" style="background-color: #007bff; color: white; text-align: center; font-size: 42px; font-weight: bold; padding: 10px;">${heading.title}</th></tr>`;

                    // Add rows within the specified range for each section
                    let isLightBlueBackground = false;
                    for (let i = heading.startRow; i <= heading.endRow; i++) {
                        const cell1 = sheet.getCell(i, 0);
                        const cell2 = sheet.getCell(i, 1);
                        // Only add rows with data
                        if (cell1.value || cell2.value) {
                            htmlContent += `<tr style="background-color: ${isLightBlueBackground ? '#f0f8ff' : 'white'};">`;
                            const fontWeight = 'bold';
                            htmlContent += `<td style="padding: 10px; font-weight: ${fontWeight};">${cell1.value}</td>`;
                            htmlContent += `<td style="padding: 10px; font-weight: ${fontWeight};">${cell2.value}</td>`;
                            htmlContent += '</tr>';
                            isLightBlueBackground = !isLightBlueBackground; // Toggle background color
                        }
                    }
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
