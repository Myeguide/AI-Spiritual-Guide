// MSG91 API Configuration
export const MSG91_CONFIG = {
  authKey: process.env.MSG91_AUTH_KEY!,
  senderId: process.env.MSG91_SENDER_ID!,
  otpTemplateId: process.env.MSG91_OTP_TEMPLATE_ID!,
  whatsappNumber: process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER!,
  whatsappTemplateName: process.env.MSG91_WHATSAPP_TEMPLATE_NAME!,
  baseUrl: 'https://control.msg91.com/api/v5',
  whatsappBaseUrl: 'https://api.msg91.com/api/v5/whatsapp',
  // NEW: Email configuration
  emailDomain: process.env.MSG91_EMAIL_DOMAIN!,
  emailFrom: process.env.MSG91_EMAIL_FROM!,
  emailFromName: process.env.MSG91_EMAIL_FROM_NAME || 'EternalGuide',
};

// Helper for MSG91 API calls
export async function msg91Request(
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  body?: Record<string, any>
) {
  const response = await fetch(`${MSG91_CONFIG.baseUrl}${endpoint}`, {
    method,
    headers: {
      'authkey': MSG91_CONFIG.authKey,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'MSG91 API error');
  }

  return data;
}

export async function msg91WhatsAppRequest(
  endpoint: string,
  body: Record<string, any>
) {
  const response = await fetch(`${MSG91_CONFIG.whatsappBaseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'authkey': MSG91_CONFIG.authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'MSG91 WhatsApp API error');
  }

  return data;
}

// NEW: Email API request
export async function msg91EmailRequest(body: Record<string, any>) {
  const response = await fetch('https://control.msg91.com/api/v5/email/send', {
    method: 'POST',
    headers: {
      'authkey': MSG91_CONFIG.authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'MSG91 Email API error');
  }

  return data;
}