import dotenv from 'dotenv';
dotenv.config();

/**
 * Sends an email using ZeptoMail REST API over HTTPS.
 * Falls back to SMTP_PASS if ZEPTOMAIL_API_TOKEN is not defined.
 *
 * @param {Object} options
 * @param {string} options.email - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Plain text content
 * @param {string} [options.html] - HTML content
 */
const sendEmail = async (options) => {
  const fromName = process.env.FROM_NAME || 'Literature Chronicle';
  const fromEmail = process.env.FROM_EMAIL || 'noreply@yourdomain.com';
  
  // Use ZEPTOMAIL_API_TOKEN as primary, fallback to SMTP_PASS, clean up whitespaces
  const apiToken = (process.env.ZEPTOMAIL_API_TOKEN || process.env.SMTP_PASS || '').replace(/\s/g, '');
  const apiUrl = process.env.ZEPTOMAIL_API_URL || 'https://api.zeptomail.in/v1.1/email';

  // Logging environment variable availability safely (never logging actual tokens)
  console.log('=== ZeptoMail REST API Config Checklist ===');
  console.log(`- API URL: ${apiUrl}`);
  console.log(`- Custom API Token present: ${!!process.env.ZEPTOMAIL_API_TOKEN}`);
  console.log(`- Fallback SMTP Password present: ${!!process.env.SMTP_PASS}`);
  console.log(`- Resolved API Token active: ${!!apiToken}`);
  console.log(`- Sender Name: ${fromName}`);
  console.log(`- Sender Email: ${fromEmail}`);
  console.log(`- Recipient Email: ${options.email}`);
  console.log(`- Subject: ${options.subject}`);
  console.log('===========================================');

  if (!apiToken) {
    console.error('[ZeptoMail Config Error] No API token/password available.');
    throw new Error('Email service configuration error: Missing API Token.');
  }

  if (!options.email) {
    throw new Error('Email service invocation error: Missing recipient email address.');
  }

  const payload = {
    from: {
      address: fromEmail,
      name: fromName,
    },
    to: [
      {
        email_address: {
          address: options.email,
        },
      },
    ],
    subject: options.subject,
    htmlbody: options.html || `<p>${options.message}</p>`,
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `zoho-enczapikey ${apiToken}`,
      },
      body: JSON.stringify(payload),
    });

    const responseStatus = response.status;
    console.log(`[ZeptoMail HTTP Status] ${responseStatus}`);

    let responseData;
    const rawText = await response.text();
    try {
      responseData = JSON.parse(rawText);
    } catch (parseErr) {
      responseData = { rawText };
    }

    // Log sanitized response
    console.log('[ZeptoMail API Response]', JSON.stringify(responseData));

    if (!response.ok) {
      const errorMsg = responseData?.message || responseData?.error?.message || 'Unknown ZeptoMail rejection';
      throw new Error(`ZeptoMail API rejected request: ${errorMsg} (HTTP ${responseStatus})`);
    }

    return responseData;
  } catch (error) {
    console.error('[ZeptoMail Integration Failure]', error.message);
    throw error;
  }
};

export default sendEmail;
