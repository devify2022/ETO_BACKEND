import axios from "axios";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
// import uniqid from ("uniqid");
// import { createPayment } from './payment.controller';

// Function to generate a unique transaction ID
function generatedTranscId() {
  return "T" + Date.now();
}

// Payment creation handler
// export const createPayment = asyncHandler(async (req, res) => {
//   // try {
//   //   console.log("MERCHANT_ID:", process.env.MERCHANT_ID);
//   //   console.log("SALT_KEY:", process.env.SALT_KEY);
//   //   console.log("SALT_INDEX:", process.env.SALT_INDEX);
//   //   console.log("PHONE_PE_HOST_URL:", process.env.PHONE_PE_HOST_URL);
//   //   console.log("Unique id:", generatedTranscId());

//   //   const payEndPoint = "/pg/v1/pay";
//   //   const merchantTransactionId = generatedTranscId(); // Unique transaction ID
//   //   const { price, user_id, phone, name, email } = req.body; // Extract from request body

//   //   if (!price || !user_id || !phone || !name || !email) {
//   //     throw new ApiError(400, "Missing required fields");
//   //   }

//   //   // Construct payload for payment
//   //   const normalPayLoad = {
//   //     merchantId: process.env.MERCHANT_ID, // Merchant ID from environment
//   //     merchantTransactionId, // Unique transaction ID
//   //     merchantUserId: `MUID${user_id}`, // Unique user ID based on input
//   //     amount: price, // Convert price to smallest currency unit (paise)
//   //     redirectUrl: `http://localhost:3002/redirect-url/${merchantTransactionId}`, // Change redirect URL as needed
//   //     redirectMode: "REDIRECT",
//   //     mobileNumber: phone,
//   //     paymentInstrument: {
//   //       type: "PAY_PAGE",
//   //     },
//   //   };

//   //   // Encode payload to base64
//   //   let bufferObj = Buffer.from(JSON.stringify(normalPayLoad), "utf8");
//   //   let base64EncodedPayload = bufferObj.toString("base64");

//   //   // Create X-VERIFY checksum => SHA256(base64EncodedPayload + "/pg/v1/pay" + SALT_KEY) + ### + SALT_INDEX
//   //   let stringToHash =
//   //     base64EncodedPayload + payEndPoint + process.env.SALT_KEY;
//   //   let sha256Hash = crypto
//   //     .createHash("sha256")
//   //     .update(stringToHash)
//   //     .digest("hex");
//   //   let xVerifyChecksum = sha256Hash + "###" + process.env.SALT_INDEX;

//   //   // Define options for axios request
//   //   const options = {
//   //     method: "post",
//   //     url: `${process.env.PHONE_PE_HOST_URL}${payEndPoint}`, // URL from environment variable
//   //     headers: {
//   //       accept: "application/json",
//   //       "Content-Type": "application/json",
//   //       "X-VERIFY": xVerifyChecksum,
//   //     },
//   //     data: { request: base64EncodedPayload },
//   //   };

//   //   // Make the API call to PhonePe
//   //   const response = await axios.request(options);

//   //   // If successful, redirect to the payment page provided by PhonePe
//   //   if (
//   //     response.data &&
//   //     response.data.data &&
//   //     response.data.data.instrumentResponse.redirectInfo.url
//   //   ) {
//   //     console.log(
//   //       "Redirect URL:",
//   //       response.data.data.instrumentResponse.redirectInfo.url
//   //     );
//   //     return res.redirect(
//   //       response.data.data.instrumentResponse.redirectInfo.url
//   //     );
//   //   } else {
//   //     throw new ApiError(500, "Failed to create payment");
//   //   }
//   // } catch (error) {
//   //   console.error(
//   //     "Payment creation error:",
//   //     error.response ? error.response.data : error.message
//   //   );
//   //   throw new ApiError(
//   //     500,
//   //     "Failed to create payment: " +
//   //       (error.response ? error.response.data : error.message)
//   //   );
//   // }
// });

// Status check handler
// export const checkStatus = asyncHandler(async (req, res) => {
//   const { merchantTransactionId } = req.params;

//   if (!merchantTransactionId) {
//     return res.status(400).json({ message: "Transaction ID is required." });
//   }

//   try {
//     // Construct status URL
//     const statusUrl = `${process.env.PHONE_PE_HOST_URL}/pg/v1/status/${process.env.MERCHANT_ID}/${merchantTransactionId}`;

//     // Generate X-VERIFY checksum
//     const stringToHash = `/pg/v1/status/${process.env.MERCHANT_ID}/${merchantTransactionId}${process.env.SALT_KEY}`;
//     const sha256_val = crypto
//       .createHash("sha256")
//       .update(stringToHash)
//       .digest("hex");
//     const xVerifyChecksum = `${sha256_val}###${process.env.SALT_INDEX}`;

//     // Make API request to check status
//     const response = await axios.get(statusUrl, {
//       headers: {
//         "Content-Type": "application/json",
//         "X-VERIFY": xVerifyChecksum,
//         accept: "application/json",
//       },
//     });

//     const { data } = response;

//     // Handle different payment statuses
//     if (data && data.success && data.code === "PAYMENT_SUCCESS") {
//       // If payment is successful, send success response
//       return res.status(200).json({ message: "Payment Successful", data });
//     } else if (data && data.code === "PAYMENT_PENDING") {
//       // Handle pending payments
//       return res.status(202).json({ message: "Payment Pending", data });
//     } else {
//       // Handle payment failure or other statuses
//       return res
//         .status(400)
//         .json({ message: "Payment Failed or Not Found", data });
//     }
//   } catch (error) {
//     // Log the error and return a failure response
//     console.error("Payment status check error:", error);
//     return res.status(500).json({
//       message: "Failed to check payment status",
//       error: error.message,
//     });
//   }
// });

export const createPayment = async function (req, res) {
  try {
    const payEndPoint = "/pg/v1/pay";
    const merchantUserId = generatedTranscId(); // Generate unique transaction ID
    const { price, phone, user_id, email } = req.body; // Extract fields from request body

    // Ensure required fields are present
    if (!price || !phone || !user_id || !email) {
      throw new ApiError(400, "Missing required fields");
    }

    const normalPayLoad = {
      merchantId: process.env.MERCHANT_ID, // Merchant ID from environment
      merchantTransactionId: merchantUserId,
      merchantUserId: user_id, // Changed to dynamic user ID from request
      amount: price * 100, // Convert to smallest currency unit
      redirectUrl: `http://localhost:3002/redirect-url/${merchantUserId}`, // Correct URL format
      redirectMode: "REDIRECT",
      mobileNumber: phone,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    // Encode payload to base64
    let bufferObj = Buffer.from(JSON.stringify(normalPayLoad), "utf8");
    let base64EncodedPayload = bufferObj.toString("base64");

    // Create X-VERIFY checksum
    let stringToHash =
      base64EncodedPayload + payEndPoint + process.env.SALT_KEY;
    let sha256Hash = crypto
      .createHash("sha256")
      .update(stringToHash)
      .digest("hex");
    let xVerifyChecksum = sha256Hash + "###" + process.env.SALT_INDEX;

    // Define options for axios request
    const options = {
      method: "post",
      url: `${process.env.PHONE_PE_HOST_URL}${payEndPoint}`, // URL from environment variable
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": xVerifyChecksum,
      },
      data: { request: base64EncodedPayload },
    };

    // Make the API call to PhonePe
    const response = await axios.request(options);

    // If successful, redirect to the payment page provided by PhonePe
    if (
      response.data &&
      response.data.data &&
      response.data.data.instrumentResponse.redirectInfo.url
    ) {
      res.redirect(response.data.data.instrumentResponse.redirectInfo.url);
    } else {
      throw new ApiError(500, "Failed to create payment");
    }
  } catch (error) {
    console.error(
      "Payment creation error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      message: "Failed to create payment",
      error: error.response ? error.response.data : error.message,
    });
  }
};
