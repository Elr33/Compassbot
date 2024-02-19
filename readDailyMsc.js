const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment');
const config = require('./config');

async function readMscTrips(bot, targetGroupChatId) {
  try {
    console.log('Fetching MSC trips from Google Sheets...');

    // Load the Google Sheet
    const doc = new GoogleSpreadsheet(config.googleSheetId);
    await doc.useServiceAccountAuth({
      client_email: config.googleClientEmail,
      private_key: config.googlePrivateKey,
    });
    await doc.loadInfo();

    // Get the current date and format it as needed
    const today = moment().format('YYYY-MM-DD');

    // Find the sheet closest to today's date
    const availableSheets = doc.sheetsByIndex.sort((a, b) => {
      const diffA = Math.abs(moment(a.title, 'YYYY-MM-DD').diff(today));
      const diffB = Math.abs(moment(b.title, 'YYYY-MM-DD').diff(today));
      return diffA - diffB;
    });

    const closestSheet = availableSheets[0];

    console.log('Available sheets:', doc.sheetTitles);
    console.log('Selected sheet:', closestSheet.title);

    // Read rows from row 8 onwards
    const rows = await closestSheet.getRows({ offset: 0 });

    let hasTrips = false; // Flag to track if any MSC trips are found

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

        const tripDetails = `MSC Trip Details:
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
        hasTrips = true; // Set the flag to true if at least one MSC trip is found
      }
    }

    if (!hasTrips) {
      console.log('No scheduled MSC trips for today.');
      bot.sendMessage(targetGroupChatId, 'No scheduled MSC trips for today.');
    }

    console.log('MSC trips have been fetched and sent.');
  } catch (error) {
    console.error('Error fetching MSC trips:', error);
    throw error;
  }
}

module.exports = {
  readMscTrips,
};
