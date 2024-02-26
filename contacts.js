const { google } = require('googleapis');
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

// Initialize Telegram Bot
const bot = new TelegramBot(config.telegramToken, { username: 'CompassG_bot', polling: true });

// Define the target group chat ID
const targetGroupChatId = '-1002128280650';

// Function to fetch contacts from Google Sheets
async function fetchContactsFromGoogleSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.googleClientEmail,
      private_key: config.googlePrivateKey
    }
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1-NHOedDJfjTLBCaJMcrpvQwcoYfeG1Jh6ckM_jG5qqM';
  const range = 'Sheet1!A1:C1'; // Adjust the range to cover your contact information in sheet number 3

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const contacts = response.data.values;
    return contacts;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
}

// Function to send contacts to Telegram group
async function sendContactsToTelegram(chatId, contacts) {
  try {
    let formattedContacts = '';
    if (contacts && contacts.length > 0) {
      formattedContacts = 'Contacts:\n';
      contacts.forEach(contact => {
        const name = contact[0] || '-';
        const number = contact[1] || '-';
        const email = contact[2] || '-';
        formattedContacts += `Name: ${name}\nNumber: ${number}\nEmail: ${email}\n\n`;
      });
    } else {
      formattedContacts = 'No contacts found.';
    }

    await bot.sendMessage(chatId, formattedContacts);
    console.log('Contacts sent to Telegram group.');
  } catch (error) {
    console.error('Error sending contacts to Telegram:', error);
  }
}

module.exports = { fetchContactsFromGoogleSheets, sendContactsToTelegram };
