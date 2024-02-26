const { google } = require('googleapis');
const config = require('./config');

async function main() {
  try {
    // Authenticate with Google Sheets API using service account credentials
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.googleClientEmail,
        private_key: config.googlePrivateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    // Create Google Sheets API client
    const sheets = google.sheets({ version: 'v4', auth });

    // Spreadsheet ID and range
    const spreadsheetId = '1-NHOedDJfjTLBCaJMcrpvQwcoYfeG1Jh6ckM_jG5qqM'; // Replace with your actual spreadsheet ID
    const range = 'Sheet1!A1:C2'; // Range containing headers and data

    // Fetch data from Google Sheets
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    // Extract values from response
    const values = response.data.values;

    // Log values to the console
    console.log('Values from Google Sheets:');
    console.log(values);
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
  }
}

// Call the main function
main();
