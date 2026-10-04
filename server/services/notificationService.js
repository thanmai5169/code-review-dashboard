const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');
const { emitNotification } = require('../socket/reviewSocket');

// Setup Nodemailer SMTP transport using credentials (if defined)
const createTransport = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    // If not configured, return null; we will log email send requests instead of crashing.
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    }
  });
};

/**
 * Sends a summary email alert via Gmail SMTP
 */
const sendEmailAlert = async (to, subject, text, html) => {
  const transporter = createTransport();
  if (!transporter) {
    console.log(`[Email Mock Alert to ${to}]: ${subject}\nMessage: ${text}`);
    return;
  }

  const mailOptions = {
    from: `"CodeLens" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html: html || `<p>${text}</p>`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email notification successfully sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Nodemailer SMTP email send failure:', error);
  }
};

/**
 * Creates an in-app notification in DB and pushes it over socket
 */
const sendInAppNotification = async (userId, type, message) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      message,
      read: false
    });

    // Push over WebSocket
    emitNotification(userId, notification);

    return notification;
  } catch (error) {
    console.error('Error creating in-app notification:', error);
  }
};

module.exports = {
  sendEmailAlert,
  sendInAppNotification
};
