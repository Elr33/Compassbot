const Parser = require('rss-parser');
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const cron = require('node-cron');

const bot = new TelegramBot(config.telegramToken, { username: 'CompassPe_bot', polling: true });
const targetGroupChatId = '-1001635794980';

const motivationalQuote = async (bot, targetGroupChatId) => {
  const parser = new Parser();
  try {
    const feed = await parser.parseURL('https://stunningmotivation.com/feed/');
    if (feed && feed.items && feed.items.length > 0) {
      const randomIndex = Math.floor(Math.random() * feed.items.length);
      const randomArticle = feed.items[randomIndex];

      const message = `
        📰 *Motivational Quote of the Day* 📰\n\n
        *Title:* ${randomArticle.title}\n
        *Link:* ${randomArticle.link}
      `;

      await bot.sendMessage(targetGroupChatId, message, { parse_mode: 'Markdown' });
      console.log('Random motivational quote posted to the group.');
    }
  } catch (error) {
    console.error('Error fetching and posting motivational Quote:', error);
  }
};

module.exports = { motivationalQuote };
