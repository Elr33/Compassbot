const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment');
const config = require('./config');
const { searchVesselImage } = require('./vesselImageSearch');

async function readDailyTrips(bot, targetGroupChatId) {
  try {
    console.log('Fetching trip details from Google Sheets...');

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

    const sortedRows = rows
      .map((row) => ({
        tripNumber: row['TRIP NO'] === 'N/A' ? Infinity : parseInt(row['TRIP NO']),
        time: row.Time, // Modify the column name to match the header
        flightNumber: row['FLIGHT NO'],
        pickupLocation: row['PICK UP'],
        dropoffLocation: row['DROP OFF'],
        client: row.CLIENT,
        vessel: row.VESSEL,
        imoNumber: row['IMO NUMBER'], // Add the IMO number column
        remarks: row['ADDITIONAL TRIP DETAILS'] || '',
      }))
      .filter((row) => row.time && !isNaN(row.tripNumber))
      .sort((a, b) => {
        const timeA = moment(a.time, 'HH:mm');
        const timeB = moment(b.time, 'HH:mm');
        return timeA - timeB;
      });

    console.log('Sorted Rows:', sortedRows);

    if (sortedRows.length === 0) {
      console.log('No scheduled trips for the day.');
      bot.sendMessage(targetGroupChatId, 'No scheduled trips for the day.');
      return;
    }

    for (const row of sortedRows) {
      console.log('Processing Row:', row);
      const tripNumber = row.tripNumber;
      const time = row.time;
      const flightNumber = row.flightNumber;
      const pickupLocation = row.pickupLocation;
      const dropoffLocation = row.dropoffLocation;
      const client = row.client;
      const vessel = row.vessel;
      const imoNumber = row.imoNumber;
      const remarks = row.remarks;

      // Add ship emoji to vessel name
      const vesselWithEmoji = `\u{1F6A2} ${vessel}`;

      const tripDetails = ` Time: ${time}
                            Flight: ${flightNumber}
                            Pickup: ${pickupLocation}
                            Drop-off: ${dropoffLocation}
                            Client: ${client}
                            Vessel: ${vesselWithEmoji}
                            IMO: ${imoNumber}
                            Remarks: ${remarks}`;

      const normalizedTripDetails = tripDetails.replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize first letter of each word

      console.log('Sending Trip Details:', normalizedTripDetails);

      // Search for vessel image based on IMO number
      const vesselImage = await searchVesselImage(imoNumber);

      if (vesselImage) {
        // Create the card-like structure using HTML formatting
        const cardContent = `<b>${vesselWithEmoji}</b>\n\n${normalizedTripDetails}`;

        // Send the card as a photo with the caption as the trip details
        bot.sendPhoto(targetGroupChatId, vesselImage, { caption: cardContent, parse_mode: 'HTML' });
      } else {
        // If vessel image is not available, send the trip details as a plain text message
        bot.sendMessage(targetGroupChatId, normalizedTripDetails);
      }
    }

    console.log('Trip details have been fetched and sent.');
  } catch (error) {
    console.error('Error fetching daily trip details:', error);
    throw error;
  }
}


module.exports = {
  readDailyTrips,
};
