import twilio from "twilio";
import { ApiError } from "./apiError.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Standalone Test for Sending SMS
export const testSendSms = async () => {
  try {
    const message = await client.messages.create({
      body: "Hello from Twilio!",
      from: process.env.TWILIO_PHONE_NUMBER,
      to: "+917872358979", // Use a valid phone number in E.164 format
    });
    console.log(`Test SMS sent successfully with SID: ${message.sid}`);
  } catch (error) {
    console.error("Error sending test SMS:", error.message);
  }
};

// Function to Send OTP via Twilio
export const sendOtpViaTwilio = async (phone, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your OTP for login is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log(`OTP sent successfully with SID: ${message.sid}`);
  } catch (error) {
    console.error("Error sending OTP via Twilio:", error.message);
    throw new ApiError(500, "Failed to send OTP");
  }
};
