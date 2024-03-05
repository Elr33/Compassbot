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

            // Create an HTML layout with vessel image above all information
            let htmlContent = '';

            // Search for vessel image based on IMO number
            const vesselImageURL = await searchVesselImage(sheet.getCell(6, 1).value); // IMO number at B7

            // Add vessel image if available
            if (vesselImageURL) {
                // Add the vessel image with specified size and margin
                htmlContent += `<div style="margin-bottom: 20px; text-align: center;"><img src="${vesselImageURL}" style="max-width: 100%; height: auto; border: 1px solid #ccc; border-radius: 5px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);"></div>`;
            }

            // Add dynamic date header
            const currentDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
            htmlContent += `<h1 style="text-align: center; font-size: 32px; font-weight: bold; margin-bottom: 20px;">Daily Operational Recap Generated on ${currentDate}</h1>`;

            // Create an HTML table to display the data
            htmlContent += '<table style="width: 100%; border-collapse: collapse; border: 1px solid #ccc;">';

            // Add headings
            for (const heading of HEADINGS) {
                htmlContent += `<tr><th colspan="2" style="background-color: #007bff; color: white; text-align: center; font-size: 24px; font-weight: bold; padding: 10px;">${heading.title}</th></tr>`;

                // Add rows within the specified range for each section
                for (let i = heading.startRow; i <= heading.endRow; i++) {
                    htmlContent += '<tr>';
                    for (let j = 0; j < 2; j++) {
                        const cell = sheet.getCell(i, j);
                        const fontSize = j === 0 ? '24px' : '20px';
                        const fontWeight = j === 0 ? 'bold' : 'normal';
                        htmlContent += `<td style="padding: 10px; font-size: ${fontSize}; font-weight: ${fontWeight};">${cell.value}</td>`;
                    }
                    htmlContent += '</tr>';
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
