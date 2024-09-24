import dotenv from 'dotenv';
import { ApiError } from './apiError.js';
import request from 'request';

dotenv.config();

const authToken = process.env.MESSAGE_CENTRAL_AUTH_TOKEN; // Ensure this is stored in your .env file
const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID; // Store this in .env as well

// Function to Send OTP via Message Central
export const sendOtpViaMessageCentral = async (phone) => {
  const options = {
    method: 'POST',
    url: `https://cpaas.messagecentral.com/verification/v3/send?countryCode=91&customerId=${customerId}&flowType=SMS&mobileNumber=${phone}`,
    headers: {
      'authToken': authToken,
    },
  };

  return new Promise((resolve, reject) => {
    request(options, function (error, response) {
      if (error) {
        console.error("Error sending OTP via Message Central:", error.message);
        reject(new ApiError(500, "Failed to send OTP"));
      } else {
        // console.log("OTP sent successfully:", response.body);
        resolve(response.body); // Return the response if needed
      }
    });
  });
};

// Function to Validate OTP via Message Central
export const validateOtpViaMessageCentral = async (phone, verificationId, code) => {
  const options = {
    method: 'GET',
    url: `https://cpaas.messagecentral.com/verification/v3/validateOtp?countryCode=91&mobileNumber=${phone}&verificationId=${verificationId}&customerId=${customerId}&code=${code}`,
    headers: {
      'authToken': authToken,
    },
  };

  return new Promise((resolve, reject) => {
    request(options, function (error, response) {
      if (error) {
        console.error("Error validating OTP via Message Central:", error.message);
        reject(new ApiError(500, "Failed to validate OTP"));
      } else {
        // console.log("OTP validation successful:", response.body);
        resolve(response.body); // Return the response if needed
      }
    });
  });
};



