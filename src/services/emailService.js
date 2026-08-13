import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zeptomail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true' || false, 
    auth: {
      user: process.env.SMTP_USER || 'emailapikey',
      pass: (process.env.SMTP_PASS || '').replace(/\s/g, ''),
    },
  });

  const fromName = process.env.FROM_NAME || 'Literature Chronicle';
  const fromEmail = process.env.FROM_EMAIL || 'noreply@yourdomain.com';

  const message = {
    from: `"${fromName}" <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  const info = await transporter.sendMail(message);
};

export default sendEmail;
