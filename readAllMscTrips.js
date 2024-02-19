const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment');
const config = require('./config');

async function searchAllMscTrips(bot, targetGroupChatId) {
  try {
    console.log('Searching all MSC trips from Google Sheets...');

    // Load the Google Sheet
    const doc = new GoogleSpreadsheet(config.googleSheetId);
    await doc.useServiceAccountAuth({
      client_email: config.googleClientEmail,
      private_key: config.googlePrivateKey,
    });
    await doc.loadInfo();

    // Get all the sheets in the document
    const sheets = doc.sheetsByIndex;

    let mscTripsFound = false; // Flag to track if any MSC trips are found

    for (const sheet of sheets) {
      console.log('Sheet:', sheet.title);

      // Extract the date from the sheet title
      const sheetDate = moment(sheet.title, 'YYYY-MM-DD').format('MMMM Do, YYYY');
      console.log('Date:', sheetDate);

      // Read rows from row 8 onwards
      const rows = await sheet.getRows({ offset: 1 });

      for (const row of rows) {
        const client = row.CLIENT;
        if (client && client.toLowerCase() === 'msc') {
          const tripNumber = row['TRIP NO'];
          const time = row.TIME;
          const flightNumber = row['FLIGHT NO'];
          const pickupLocation = row['PICK UP'];
          const dropoffLocation = row['DROP OFF'];
          const vessel = row.VESSEL;
          const remarks = row['ADDITIONAL TRIP DETAILS'] || '';

          // Add ship emoji to vessel name
          const vesselWithEmoji = `\u{1F6A2} ${vessel}`;

          const tripDetails = `MSC Trip Details (${sheetDate}):
            Trip Number: ${tripNumber}
            Time: ${time}
            Flight: ${flightNumber}
            Pickup: ${pickupLocation}
            Drop-off: ${dropoffLocation}
            Vessel: ${vesselWithEmoji}
            Remarks: ${remarks}`;

          const normalizedTripDetails = tripDetails.replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize first letter of each word

          console.log('Sending MSC Trip Details:', normalizedTripDetails);
          bot.sendMessage(targetGroupChatId, normalizedTripDetails);

          mscTripsFound = true; // Set the flag to indicate MSC trips were found
        }
      }

      console.log(`MSC trips for ${sheetDate} have been fetched and sent.`);
    }

    if (!mscTripsFound) {
      // Send a message if no MSC trips are found
      console.log('No MSC trips found.');
      bot.sendMessage(targetGroupChatId, 'No MSC trips found.');
    }

    console.log('All MSC trips have been fetched and sent.');
  } catch (error) {
    console.error('Error searching all MSC trips:', error);
    throw error;
  }
}

module.exports = {
  searchAllMscTrips,
};
