const { GoogleSpreadsheet } = require('google-spreadsheet');
const config = require('./config');
const { searchVesselImage } = require('./vesselImageSearch');

async function readAllTrips(bot, targetGroupChatId) {
  try {
    console.log('Fetching trip details from Google Sheets...');

    // Load the Google Sheet
    const doc = new GoogleSpreadsheet(config.googleSheetId);
    await doc.useServiceAccountAuth({
      client_email: config.googleClientEmail,
      private_key: config.googlePrivateKey,
    });
    await doc.loadInfo();

    const sheets = doc.sheetsByIndex;

    if (sheets.length === 0) {
      console.log('No sheets found');
      bot.sendMessage(targetGroupChatId, 'No trip sheets found.');
      return;
    }

    for (const sheet of sheets) {
      console.log('Selected sheet:', sheet.title);

      // Read all rows from the sheet
      const rows = await sheet.getRows();

      if (rows.length === 0) {
        console.log('No scheduled trips');
        bot.sendMessage(targetGroupChatId, `No scheduled trips for ${sheet.title}.`);
        continue;
      }

      console.log('Sheet Date:', sheet.title);

      for (const row of rows) {
        console.log('Processing Row:', row);
        const time = row.TIME;
        const flightNumber = row['FLIGHT NO'];
        const pickupLocation = row['PICK UP'];
        const dropoffLocation = row['DROP OFF'];
        const client = row.CLIENT;
        const vessel = row.VESSEL;
        const additionalTripDetails = row['ADDITIONAL TRIP DETAILS'] || '';
        const imoNumber = row['IMO NUMBER'];
        const port = row.PORT;
        const berth = row.BERTH;
        const logsReceived = row['LOGS RECEIVED'];
        const passportReceived = row['PASSPORT RECEIVED'];
        const seamansReceived = row['SEAMANS RECEIVED'];
        const permissionsReceived = row['PERMISSIONS RECEIVED'];

        // Exclude undefined trips
        if (
          time !== undefined &&
          flightNumber !== undefined &&
          pickupLocation !== undefined &&
          dropoffLocation !== undefined &&
          client !== undefined &&
          vessel !== undefined
        ) {
          const tripDate = sheet.title; // Get the date from the sheet title

          // Add ship emoji to vessel name and capitalize it
          const vesselWithEmoji = `\u{1F6A2} ${vessel.toUpperCase()}`;

          // Search for vessel image using IMO number
          const vesselImage = await searchVesselImage(imoNumber);

          const tripDetails = `
            Date: ${tripDate}
            Time: ${time}
            Flight: ${flightNumber}
            Pickup: ${pickupLocation}
            Drop-off: ${dropoffLocation}
            Client: ${client}
            Remarks: ${additionalTripDetails}
            Port: ${port}
            Berth: ${berth}
            Logs Received: ${logsReceived}
            Passport Received: ${passportReceived}
            Seamans Received: ${seamansReceived}
            Permissions Received: ${permissionsReceived}`;

          const normalizedTripDetails = tripDetails.replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize first letter of each word

          console.log('Sending Trip Details:', normalizedTripDetails);

          // Sending the trip details with vessel image as a card
          if (vesselImage) {
            const cardContent = `<b>${vesselWithEmoji}</b>\n\n${normalizedTripDetails}`;

            // Send the card as a photo with the caption as the trip details
            bot.sendPhoto(targetGroupChatId, vesselImage, {
              caption: cardContent,
              parse_mode: 'HTML',
              caption_entities: [{ offset: 0, length: vesselWithEmoji.length + 3, type: 'bold' }],
            });
          } else {
            // If vessel image is not available, send the trip details as a plain text message
            bot.sendMessage(targetGroupChatId, normalizedTripDetails);
          }
        }
      }

      console.log('Trip details from sheet', sheet.title, 'have been fetched and sent.');
    }

    console.log('All trip details have been fetched and sent.');
  } catch (error) {
    console.error('Error fetching trip details:', error);
    throw error;
  }
}

module.exports = {
  readAllTrips,
};
