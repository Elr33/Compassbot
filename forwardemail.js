const { simpleParser } = require('mailparser');
const Imap = require('imap');
const nodemailer = require('nodemailer');

// Email account credentials
const sourceEmail = 'etienne@compassmaritime.co.za';
const sourcePassword = 'Compass@M@123';
const destinationEmail = 'digitalsphere33@gmail.com';

// IMAP configuration
const imapConfig = {
  user: sourceEmail,
  password: sourcePassword,
  host: 'imap.compassmaritime.co.za',
  port: 143,
  tls: true
};

// Create an IMAP connection
const imap = new Imap(imapConfig);

// Forward email function
async function forwardEmail(email) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.compassmaritime.co.za',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: sourceEmail,
      pass: sourcePassword
    }
  });

  // Forward email
  await transporter.sendMail({
    from: sourceEmail,
    to: destinationEmail,
    subject: email.subject,
    html: email.html,
    text: email.text
  });

  console.log('Email forwarded successfully');
}

// Connect to IMAP server
imap.once('ready', () => {
  imap.openBox('INBOX', true, (err, box) => {
    if (err) throw err;

    // Search for all unread emails
    imap.search(['UNSEEN'], (err, results) => {
      if (err) throw err;

      // Fetch unread emails
      const fetch = imap.fetch(results, { bodies: '' });
      fetch.on('message', (msg) => {
        msg.on('body', async (stream, info) => {
          const parsedEmail = await simpleParser(stream);
          console.log('Received email:', parsedEmail.subject);

          // Forward the email
          await forwardEmail(parsedEmail);
        });
      });

      fetch.once('end', () => {
        imap.end();
      });
    });
  });
});

// Handle IMAP errors
imap.once('error', (err) => {
  console.error('IMAP error:', err);
});

// Connect to the IMAP server
imap.connect();
