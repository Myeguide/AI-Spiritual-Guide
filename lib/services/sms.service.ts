import { twilioClient } from "../twilio";

// Example with Twilio or any SMS provider
export class SMSService {
    static async sendOTP(phoneNumber: string, code: string): Promise<void> {
        console.log(`Sending OTP ${code} to ${phoneNumber}`);
        await twilioClient.messages.create({
            body: `Your EternalGuide verification code is: ${code}\n\nValid for 10 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber,
        });

    }
}