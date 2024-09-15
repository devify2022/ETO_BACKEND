import { ObjectId } from "bson";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import generateOtp from "../utils/otpGenerate.js";
import checkRateLimit from "../utils/checkRateLimit.js";
import { Rider } from "../models/rider.model.js";
import { Driver } from "../models/driver.model.js";
import { sendOtpViaTwilio, testSendSms } from "../utils/sentOtpViaTwillio.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error; // Re-throw known ApiError
    }
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

// Login User Function
export const loginUser = asyncHandler(async (req, res) => {
  const { phone, isDriver } = req.body;

  if (!phone) {
    throw new ApiError(400, "Phone number is required");
  }

  let role = null;
  let userDetails = null;

  if (isDriver) {
    userDetails = await Driver.findOne({ phone });
    role = "driver";
  } else {
    userDetails = await Rider.findOne({ phone });
    role = "passenger";
  }

  let user = await User.findOne({ phone });

  if (userDetails) {
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    const newOtp = generateOtp();
    user.otp = newOtp;
    user.isVerified = false;
    await user.save();

    // Send OTP via Twilio
    // await sendOtpViaTwilio(phone, newOtp);

    // Execute Standalone Test
    // testSendSms(newOtp)

    const data = {
      role,
      accessToken,
      refreshToken,
      userDetails: userDetails || {},
      otp: newOtp,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, data, "Logged in Successfully"));
  } else {
    const newOtp = generateOtp();

    if (user) {
      if (user.isDriver !== isDriver) {
        throw new ApiError(
          409,
          `This number is already used as a ${user.isDriver ? "driver" : "passenger"}.`
        );
      }

      user.otp = newOtp;
      user.isVerified = false;
      await user.save();
    } else {
      user = new User({
        phone,
        otp: newOtp,
        isVerified: false,
        isDriver,
        isAdmin: false,
      });

      await user.save();
    }

    // Send OTP via Twilio
    // await sendOtpViaTwilio(phone, newOtp);
    // Execute Standalone Test
    // testSendSms(newOtp)

    return res
      .status(200)
      .json(new ApiResponse(200, newOtp, "OTP Sent Successfully"));
  }
});

// Verify OTP Function
export const verify_OTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw new ApiError(400, "Phone number and OTP are required");
  }

  const user = await User.findOne({ phone });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const now = new Date();
  const otpTimestamp = new Date(user.updatedAt);
  const timeDifference = (now - otpTimestamp) / 1000;

  if (timeDifference > 300) {
    throw new ApiError(400, "OTP has expired");
  }

  const isOtpVerified = user.otp === otp;
  if (!isOtpVerified) {
    throw new ApiError(400, "Invalid OTP");
  }

  user.isVerified = true;
  await user.save();

  if (user.isDriver) {
    const driverDetails = await Driver.findOne({ phone });

    const msg = {
      role: "driver",
      isNewDriver: !driverDetails,
      phone: user.phone,
      accessToken,
      refreshToken,
      driverDetails: driverDetails || {},
    };
    return res.status(200).json(new ApiResponse(200, msg, "OTP Verified"));
  } else {
    let passengerDetails = await Rider.findOne({ phone });

    if (!passengerDetails) {
      passengerDetails = new Rider({
        name: "Rider", // Default name if not provided
        phone,
        userId: user._id,
        current_location: {
          type: "Point",
          coordinates: [0, 0], // Default location if not provided
        },
      });

      await passengerDetails.save();
    }

    const msg = {
      role: "passenger",
      isNewPassenger: !passengerDetails,
      phone: user.phone,
      accessToken,
      refreshToken,
      passengerDetails,
    };
    return res.status(200).json(new ApiResponse(200, msg, "OTP Verified"));
  }
});

// Refresh Access Token Function
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    if (!decodedToken) {
      throw new ApiError(401, "Unauthorized request");
    }

    const user = await User.findById(decodedToken._id).select(
      "-phone -otp -isVerified -isAdmin -createdAt -updatedAt"
    );

    if (!user || incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
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
    throw new ApiError(401, error.message || "Invalid refresh token");
  }
});

// Resend OTP Function
export const resendOTP = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    throw new ApiError(400, "Phone number is required");
  }

  const { allowed, remainingTime } = checkRateLimit(phone);
  if (!allowed) {
    throw new ApiError(
      429,
      `Too many requests. Try again in ${Math.ceil(remainingTime / 60000)} minutes.`
    );
  }

  let user = await User.findOne({ phone });
  const newOtp = generateOtp();

  if (user) {
    user.otp = newOtp;
    user.isVerified = false;
    await user.save();
    // Send OTP via Twilio
    // await sendOtpViaTwilio(phone, newOtp);
    // Execute Standalone Test
    testSendSms(newOtp);

    return res
      .status(200)
      .json(new ApiResponse(200, newOtp, "OTP Sent Successfully"));
  } else {
    throw new ApiError(404, "Invalid Phone number");
  }
});

// Logout User Function
export const logoutUser = asyncHandler(async (req, res) => {
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
});
