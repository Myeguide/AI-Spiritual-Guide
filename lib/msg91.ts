// MSG91 API Configuration
export const MSG91_CONFIG = {
  authKey: process.env.MSG91_AUTH_KEY!,
  senderId: process.env.MSG91_SENDER_ID!,
  otpTemplateId: process.env.MSG91_OTP_TEMPLATE_ID!,
  // WhatsApp integrated number - ensure no + prefix
  whatsappNumber: (process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || '').replace(/^\+/, ''),
  whatsappTemplateName: process.env.MSG91_WHATSAPP_TEMPLATE_NAME!,
  baseUrl: 'https://control.msg91.com/api/v5',
  whatsappBaseUrl: 'https://control.msg91.com/api/v5/whatsapp',
  // Email configuration
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
  const url = `${MSG91_CONFIG.whatsappBaseUrl}${endpoint}`;
  const authKey = MSG91_CONFIG.authKey;
  
  // Check if auth key is configured
  if (!authKey) {
    throw new Error('MSG91_AUTH_KEY is not configured in environment variables');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'authkey': authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[MSG91 WhatsApp] Error Response:', data);
    throw new Error(data.message || data.error || JSON.stringify(data) || 'MSG91 WhatsApp API error');
  }

  return data;
}

// MSG91 WhatsApp send message using query parameters (as per their API docs)
export async function msg91WhatsAppSendMessage(params: {
  recipientNumber: string;
  contentType: 'text' | 'template';
  text?: string;
}) {
  const authKey = MSG91_CONFIG.authKey;
  const integratedNumber = MSG91_CONFIG.whatsappNumber;
  
  if (!authKey) {
    throw new Error('MSG91_AUTH_KEY is not configured');
  }
  
  if (!integratedNumber) {
    throw new Error('MSG91_WHATSAPP_INTEGRATED_NUMBER is not configured');
  }

  // Build query string as per MSG91 docs
  const queryParams = new URLSearchParams({
    integrated_number: integratedNumber,
    recipient_number: params.recipientNumber,
    content_type: params.contentType,
  });
  
  if (params.text) {
    queryParams.append('text', params.text);
  }

  const url = `${MSG91_CONFIG.whatsappBaseUrl}/whatsapp-outbound-message/?${queryParams.toString()}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'authkey': authKey,
      'content-type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[MSG91 WhatsApp] Error Response:', data);
    throw new Error(data.message || data.error || JSON.stringify(data) || 'MSG91 WhatsApp API error');
  }

  return data;
}

// MSG91 Email API request - Using templates
export async function msg91EmailRequest(params: {
  templateId: string;
  to: { email: string; name?: string }[];
  variables: Record<string, string>;
}) {
  const requestBody = {
    recipients: [
      {
        to: params.to.map(recipient => ({
          email: recipient.email,
          name: recipient.name || '',
        })),
        variables: params.variables,
      },
    ],
    from: {
      email: MSG91_CONFIG.emailFrom,
      name: MSG91_CONFIG.emailFromName,
    },
    domain: MSG91_CONFIG.emailDomain,
    template_id: params.templateId,
  };

  const response = await fetch('https://control.msg91.com/api/v5/email/send', {
    method: 'POST',
    headers: {
      'authkey': MSG91_CONFIG.authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || JSON.stringify(data) || 'MSG91 Email API error');
  }

  return data;
}