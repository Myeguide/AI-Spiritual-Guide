// No changes needed in validator - format validation stays the same

// sms.service.ts
import { twilioClient } from '@/lib/twilio';
import { MSG91_CONFIG, msg91Request } from '@/lib/msg91';

export class SMSError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'SMSError';
  }
}

export class SMSService {
  /**
   * Validates phone number using Twilio Lookup API
   * This checks if the number is real and valid before sending SMS
   */
  static async validatePhoneNumber(phoneNumber: string): Promise<void> {
    try {
      const lookup = await twilioClient.lookups.v2
        .phoneNumbers(phoneNumber)
        .fetch();

      // Check if the number is valid
      if (!lookup.valid) {
        throw new SMSError(
          'The phone number provided is not valid',
          'INVALID_PHONE_NUMBER'
        );
      }

    } catch (error: any) {
      // Handle Twilio Lookup errors
      if (error.code) {
        switch (error.code) {
          case 20404:
            throw new SMSError(
              'The phone number provided is not a valid mobile number',
              'PHONE_NOT_FOUND',
              400
            );
          case 60200:
            throw new SMSError(
              'Invalid phone number format',
              'INVALID_FORMAT',
              400
            );
          default:
            throw new SMSError(
              'Unable to validate phone number',
              'VALIDATION_FAILED',
              400
            );
        }
      }

      // Re-throw SMSError
      if (error instanceof SMSError) {
        throw error;
      }

      throw new SMSError(
        'Phone number validation failed',
        'VALIDATION_ERROR',
        400
      );
    }
  }

  // static async sendOTP(phoneNumber: string, code: string): Promise<void> {
  //   try {
  //     // No need to validate again - already done in the route
  //     console.log(`Sending OTP ${code} to ${phoneNumber}`);

  //     const message = await twilioClient.messages.create({
  //       body: `Your EternalGuide verification code is: ${code}\n\nValid for 10 minutes.`,
  //       from: process.env.TWILIO_PHONE_NUMBER,
  //       to: phoneNumber,
  //     });

  //     console.log(`OTP sent successfully. Message SID: ${message.sid}`);
  //   } catch (error: any) {
  //     // Handle Twilio SMS sending errors
  //     if (error.code) {
  //       switch (error.code) {
  //         case 21211:
  //           throw new SMSError(
  //             'Invalid phone number format',
  //             'TWILIO_INVALID_NUMBER',
  //             400
  //           );
  //         case 21614:
  //           throw new SMSError(
  //             'The phone number provided is not a valid mobile number',
  //             'TWILIO_NOT_MOBILE',
  //             400
  //           );
  //         case 21408:
  //           throw new SMSError(
  //             'Permission denied for this phone number',
  //             'TWILIO_PERMISSION_DENIED',
  //             403
  //           );
  //         case 21610:
  //           throw new SMSError(
  //             'This phone number is unsubscribed from receiving messages',
  //             'TWILIO_UNSUBSCRIBED',
  //             400
  //           );
  //         case 30007:
  //           throw new SMSError(
  //             'Message blocked by carrier',
  //             'TWILIO_CARRIER_BLOCK',
  //             400
  //           );
  //         default:
  //           throw new SMSError(
  //             `Failed to send SMS: ${error.message}`,
  //             'TWILIO_ERROR',
  //             500
  //           );
  //       }
  //     }

  //     // Generic error
  //     throw new SMSError(
  //       'Failed to send SMS',
  //       'SMS_SEND_ERROR',
  //       500
  //     );
  //   }
  // }

  /**
   * Send OTP via MSG91
   */
  static async sendOTP(phoneNumber: string, code: string): Promise<void> {
    try {
      // Remove the + prefix if present, MSG91 expects just the number
      const formattedNumber = phoneNumber.startsWith('+')
        ? phoneNumber.slice(1)
        : phoneNumber;

      const response = await msg91Request('/otp', 'POST', {
        template_id: MSG91_CONFIG.otpTemplateId,
        mobile: formattedNumber,
        otp: code, // Send your generated OTP
      });

    } catch (error: any) {
      console.error('MSG91 OTP error:', error);
      throw new SMSError(
        error.message || 'Failed to send OTP',
        'MSG91_OTP_ERROR',
        500
      );
    }
  }

  /**
   * Verify OTP via MSG91 (optional - you can use your existing DB verification)
   * This is if you want MSG91 to handle OTP storage/verification
   */
  static async verifyOTPViaMSG91(phoneNumber: string, otp: string): Promise<boolean> {
    try {
      const formattedNumber = phoneNumber.startsWith('+')
        ? phoneNumber.slice(1)
        : phoneNumber;

      const response = await msg91Request(
        `/otp/verify?mobile=${formattedNumber}&otp=${otp}`,
        'GET'
      );

      return response.type === 'success';
    } catch (error) {
      return false;
    }
  }

  /**
   * Resend OTP via MSG91
   */
  static async resendOTP(phoneNumber: string, retryType: 'text' | 'voice' = 'text'): Promise<void> {
    try {
      const formattedNumber = phoneNumber.startsWith('+')
        ? phoneNumber.slice(1)
        : phoneNumber;

      await msg91Request(
        `/otp/retry?mobile=${formattedNumber}&retrytype=${retryType}`,
        'GET'
      );
    } catch (error: any) {
      throw new SMSError(
        error.message || 'Failed to resend OTP',
        'MSG91_RESEND_ERROR',
        500
      );
    }
  }
}

// route.ts
