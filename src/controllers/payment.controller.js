import axios from "axios";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

// Function to generate a unique transaction ID
function generatedTranscId() {
  return "T" + Date.now();
}

// Payment creation handler
export const createPayment = asyncHandler(async (req, res) => {
  try {
    console.log("Request body:", req.body);

    const price = parseFloat(req.body.price);
    const { user_id, phone, name, email, tempId } = req.body;

    // Validate required fields
    if (!price || !user_id || !phone || !name || !email) {
      throw new ApiError(400, "Missing required fields");
    }

    // Store values for use in the status check
    const merchantTransactionId = generatedTranscId();
    const data = {
      merchantId: process.env.MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: "MUID" + user_id,
      name: name,
      amount: price * 100, // Amount in the smallest currency unit
      redirectUrl: `http://localhost:8000/status/${merchantTransactionId}`,
      redirectMode: "POST",
      mobileNumber: phone,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const payload = JSON.stringify(data);
    const payloadMain = Buffer.from(payload).toString("base64");
    const saltKey = process.env.SALT_KEY;
    const keyIndex = 1;
    const stringToHash = payloadMain + "/pg/v1/pay" + saltKey;
    const sha256 = crypto
      .createHash("sha256")
      .update(stringToHash)
      .digest("hex");
    const checksum = sha256 + "###" + keyIndex;

    const prodURL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay";
    const requestData = {
      method: "POST",
      url: prodURL,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
      },
      data: {
        request: payloadMain,
      },
    };

    // Send the payment request
    const response = await axios.request(requestData);
    const phonePeTransactionId = response.data.transactionId;

    // Handle the successful response
    return res.json(
      new ApiResponse(200, response.data, "Payment created successfully", {
        phonePeTransactionId,
      })
    );
  } catch (error) {
    console.error("Error during payment creation:", error.message);

    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error response status:", error.response.status);
    } else {
      console.error("Error details:", error);
    }

    throw new ApiError(500, "Failed to create payment");
  }
});

// Status check handler
export const checkStatus = asyncHandler(async (req, res) => {
  try {
    const merchantTransactionId = req.params.txnId;
    const merchantId = process.env.MERCHANT_ID;
    const saltKey = process.env.SALT_KEY;

    const keyIndex = 1;
    const stringToHash =
      `/pg/v1/status/${merchantId}/${merchantTransactionId}` + saltKey;
    const sha256 = crypto
      .createHash("sha256")
      .update(stringToHash)
      .digest("hex");
    const checksum = sha256 + "###" + keyIndex;

    const URL = `https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status/${merchantId}/${merchantTransactionId}`;
    const options = {
      method: "GET",
      url: URL,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": merchantId,
      },
    };

    const response = await axios.request(options);

    if (response.data.data.responseCode === "SUCCESS") {
      // Save order details to the database
      const newOrder = new Order({
        name: this.name,
        phone: this.phone,
        email: this.email,
        transactionId: merchantTransactionId,
        paymentStatus: response.data.data.responseCode,
        price: this.price,
        user: this.user,
        dateOrdered: Date.now(),
      });

      await newOrder.save();

      // Redirect to success URL
      const url = "http://localhost:4200/success";
      return res.redirect(url);
    } else {
      // Redirect to failure URL
      const url = `http://localhost:4200/failure`;
      return res.redirect(url);
    }
  } catch (error) {
    console.error("Error checking payment status:", error.message);

    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error response status:", error.response.status);
    } else {
      console.error("Error details:", error);
    }

    throw new ApiError(500, "Failed to check payment status");
  }
});
