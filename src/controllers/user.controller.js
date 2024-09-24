import { ObjectId } from "bson";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import generateOtp from "../utils/otpGenerate.js";
import checkRateLimit from "../utils/checkRateLimit.js";
import { Rider } from "../models/rider.model.js";
import { Driver } from "../models/driver.model.js";
import {
  sendOtpViaMessageCentral,
  validateOtpViaMessageCentral,
} from "../utils/sentOtp.js";
// import { sendOtpViaTwilio, testSendSms } from "../utils/sentOtpViaTwillio.js";

// Generate Access and Refresh Tokens
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiResponse(404, null, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error.message);
    throw new ApiResponse(
      500,
      null,
      "Something went wrong while generating tokens"
    );
  }
};

// Login User Function
export const loginAndSendOtp = asyncHandler(async (req, res) => {
  const { phone, isDriver } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Phone number is required"));
  }

  let role = null;
  let userDetails = null;
  let otpResponse = null;

  // Determine role and find existing user details (Driver or Passenger)
  if (isDriver) {
    userDetails = await Driver.findOne({ phone });
    role = "driver";
  } else {
    userDetails = await Rider.findOne({ phone });
    role = "passenger";
  }

  let user = await User.findOne({ phone });

  if (userDetails) {
    // If the user exists in either Driver or Passenger collection
    if (!user) {
      return res.status(404).json(new ApiResponse(404, null, "User not found"));
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    // Reset the isVerified flag
    user.isVerified = false;
    await user.save();

    // Send OTP via Message Central
    try {
      otpResponse = await sendOtpViaMessageCentral(phone);
    } catch (error) {
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to send OTP"));
    }

    const data = {
      role,
      accessToken,
      refreshToken,
      userDetails: userDetails || {}, // Send user details if available
      otpdata: otpResponse.data,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, data, "Logged in successfully, OTP sent"));
  } else {
    // Handle new user registration
    if (user) {
      // Check if the existing user role (isDriver) conflicts with the login attempt
      if (user.isDriver !== isDriver) {
        return res
          .status(409)
          .json(
            new ApiResponse(
              409,
              null,
              `This number is already used as a ${user.isDriver ? "driver" : "passenger"}.`
            )
          );
      }

      // Reset verification status
      user.isVerified = false;
      await user.save();
    } else {
      // Create a new user with the provided role and unverified status
      user = new User({
        phone,
        isVerified: false,
        isDriver,
        isAdmin: false, // Assuming normal users are not admins by default
      });

      await user.save();
    }

    // Send OTP via Message Central
    try {
      otpResponse = await sendOtpViaMessageCentral(phone);
    } catch (error) {
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to send OTP"));
    }

    const newData = {
      user,
      otpdata: otpResponse.data,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, newData, "OTP sent successfully"));
  }
});

// OTP Verification Controller
export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, verificationId, code } = req.body;
  let validateData = null;

  // Check if all required fields are present
  if (!phone || !verificationId || !code) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "Phone number, verification ID, and OTP code are required"
        )
      );
  }

  // Find user by phone
  let user = await User.findOne({ phone });

  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }

  try {
    // Validate the OTP via Message Central
    const validationResponse = await validateOtpViaMessageCentral(
      phone,
      verificationId,
      code
    );

    // Check if the response is already an object
    if (typeof validationResponse === "string") {
      validateData = JSON.parse(validationResponse); // Parse only if it's a string
    } else {
      validateData = validationResponse; // Use directly if it's already an object
    }

    // Check if OTP validation was successful
    if (
      validateData.data.responseCode !== "200" ||
      validateData.data.verificationStatus !== "VERIFICATION_COMPLETED"
    ) {
      return res.status(400).json(new ApiResponse(400, null, "Invalid OTP"));
    }

    // OTP is valid, mark the user as verified
    user.isVerified = true;
    await user.save();

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    // If the user is a driver
    if (user.isDriver) {
      const driverDetails = await Driver.findOne({ phone });

      const msg = {
        role: "driver",
        isNewDriver: !driverDetails, // New driver if no details found
        phone: user.phone,
        accessToken,
        refreshToken,
        driverDetails: driverDetails || {}, // Send driver details if available
      };

      return res
        .status(200)
        .json(new ApiResponse(200, msg, "OTP verified for driver"));
    } else {
      // If the user is a passenger (non-driver)
      let passengerDetails = await Rider.findOne({ phone });

      if (!passengerDetails) {
        // Create a new rider profile if not found
        passengerDetails = new Rider({
          name: "Rider", // Default name, can be updated later
          phone,
          userId: user._id,
          current_location: {
            type: "Point",
            coordinates: [0, 0], // Default coordinates, can be updated later
          },
        });

        await passengerDetails.save();
      }

      const msg = {
        role: "passenger",
        isNewPassenger: !passengerDetails, // New passenger if no details found
        phone: user.phone,
        accessToken,
        refreshToken,
        passengerDetails,
      };

      return res
        .status(200)
        .json(new ApiResponse(200, msg, "OTP verified for rider"));
    }
  } catch (error) {
    console.error("Error validating OTP:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to validate OTP"));
  }
});

// Refresh Access Token Function
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.body.refreshToken;
  if (!incomingRefreshToken) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "Unauthorized request"));
  }

  try {
    const decodedToken = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    if (!decodedToken) {
      return res
        .status(401)
        .json(new ApiResponse(401, null, "Unauthorized request"));
    }

    const user = await User.findById(decodedToken._id).select(
      "-phone -otp -isVerified -isAdmin -createdAt -updatedAt"
    );

    if (!user || incomingRefreshToken !== user.refreshToken) {
      return res
        .status(401)
        .json(new ApiResponse(401, null, "Invalid refresh token"));
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "New tokens generated"
        )
      );
  } catch (error) {
    console.error("Error refreshing token:", error.message);
    return res
      .status(401)
      .json(new ApiResponse(401, null, "Invalid refresh token"));
  }
});

// Resend OTP Function
export const resendOtp = asyncHandler(async (req, res) => {
  const { phone, isDriver } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Phone number is required"));
  }

  let user = await User.findOne({ phone });

  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }

  // Reset the isVerified flag to false
  user.isVerified = false;
  await user.save();

  // Send OTP via Message Central
  try {
    const otpResponse = await sendOtpViaMessageCentral(phone);
    const otpCredentials = JSON.parse(otpResponse);

    // Prepare response data
    const data = {
      role: user.isDriver ? "driver" : "passenger",
      phone: user.phone,
      otpdata: otpCredentials.data,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, data, "OTP resent successfully"));
  } catch (error) {
    console.error("Error resending OTP:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to resend OTP"));
  }
});

// Logout User Function
export const logoutUser = asyncHandler(async (req, res) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      { $set: { refreshToken: undefined } },
      { new: true } // Return the updated document
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User logged out"));
  } catch (error) {
    console.error("Error logging out user:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to log out user"));
  }
});
