const { GoogleSpreadsheet } = require('google-spreadsheet');
const config = require('./config');

// Load the Google Sheet
const doc = new GoogleSpreadsheet(config.googleSheetId2);

// Function to fetch vessel names for the daily recap from all sheets in the Google Sheet
const fetchVesselDailyRecap = async () => {
  try {
    // Authenticate with Google Sheets API using your existing code
    await doc.useServiceAccountAuth({
      client_email: config.googleClientEmail,
      private_key: config.googlePrivateKey,
    });
    await doc.loadInfo();

    const vesselNames = [];
    
    // Iterate through each sheet in the Google Sheet
    for (const sheet of doc.sheetsByIndex) {
      // Extract vessel name from sheet title and push it to the vesselNames array
      vesselNames.push(sheet.title);
    }

    return vesselNames;
  } catch (error) {
    console.error('Error fetching vessel names for daily recap:', error);
    throw error;
  }
};

module.exports = {
  fetchVesselDailyRecap,
};
