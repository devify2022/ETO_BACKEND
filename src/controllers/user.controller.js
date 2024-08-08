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

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken(); // custom methods
    const refreshToken = user.generateRefreshToken(); // custom methods
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError("500", "Something went wrong while generating tokens");
  }
};

const loginUser = asyncHandler(async (req, res) => {
  const { phone, isDriver } = req.body;
  if (!phone) {
    throw new ApiError(400, "Phone number is required");
  }
  let role = null;
  let userDetails = null;

  // Check if the user is a driver or a passenger
  if (isDriver) {
    // Check if the driver exists
    userDetails = await Driver.findOne({ phone });
    role = "driver";
  } else {
    // Check if the passenger exists
    userDetails = await Rider.findOne({ phone });
    role = "passenger";
  }

  let user = await User.findOne({ phone });

  if (userDetails) {
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );
    const data = {
      role,
      accessToken,
      refreshToken,
      userDetails: userDetails || {},
    };
    return res
      .status(200)
      .json(new ApiResponse(200, data, "Log in Succesfully"));
  } else {
    const newOtp = generateOtp();
    // Check if user exists
    if (user) {
      if (user.isDriver === isDriver) {
        // If user exists, update the OTP and user details
        user.otp = newOtp;
        user.isVerified = false;
        await user.save();
      } else {
        throw new ApiError(
          500,
          `This number is already used as ${isDriver ? "passenger" : "driver"} `
        );
      }
    } else {
      // If user does not exist, create a new user
      user = new User({
        phone,
        otp: newOtp,
        isVerified: false,
        isDriver,
        isAdmin: false,
      });
      await user.save();
    }

    return res
      .status(200)
      .json(new ApiResponse(200, newOtp, "OTP Sent Successfully"));
  }
});

const verify_OTP = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw new ApiError(400, "Phone number and OTP are required");
  }

  // Find the user by phone number
  const user = await User.findOne({ phone });

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if the OTP is within 5 minutes of the last update
  const now = new Date();
  const otpTimestamp = new Date(user.updatedAt);
  const timeDifference = (now - otpTimestamp) / 1000; // Difference in seconds

  if (timeDifference > 300) {
    // 300 seconds = 5 minutes
    throw new ApiError(400, "OTP has expired");
  }

  // Verify the OTP
  const isOtpVerified = user.otp === otp;
  if (!isOtpVerified) {
    throw new ApiError(400, "Invalid OTP");
  }

  // Mark user as verified
  user.isVerified = true;
  await user.save();

  if (user.isDriver) {
    // Handle case for drivers
    const driverDetails = await Driver.findOne({ phone });

    if (driverDetails) {
      // Driver exists
      const msg = {
        role: "driver",
        isNewDriver: false,
        phone: user.phone,
        accessToken,
        refreshToken,
        driverDetails,
      };
      return res.status(200).json(new ApiResponse(200, msg, "OTP Verified"));
    } else {
      // Driver does not exist
      const msg = {
        role: "driver",
        isNewDriver: true,
        phone: user.phone,
        accessToken,
        refreshToken,
        driverDetails: {},
      };
      return res.status(200).json(new ApiResponse(200, msg, "OTP Verified"));
    }
  } else {
    // Handle case for passengers
    let passengerDetails = await Rider.findOne({ phone });

    if (passengerDetails) {
      // Passenger details found
      const msg = {
        role: "passenger",
        isNewPassenger: false,
        phone: user.phone,
        accessToken,
        refreshToken,
        passengerDetails,
      };
      return res.status(200).json(new ApiResponse(200, msg, "OTP Verified"));
    } else {
      // Create a new rider
      const newRider = new Rider({
        name: "Rider", // Default name for new riders
        phone,
        userId: user._id,
      });

      await newRider.save();

      const msg = {
        role: "passenger",
        isNewPassenger: true,
        phone: user.phone,
        accessToken,
        refreshToken,
        passengerDetails: newRider,
      };
      return res.status(200).json(new ApiResponse(200, msg, "OTP Verified"));
    }
  }
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }
  console.log({ incomingRefreshToken });

  try {
    const decodedToken = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    console.log({ decodedToken });

    if (!decodedToken) {
      throw new ApiError("401", "unauthorized request");
    }
    const user = await User.findById(decodedToken?._id).select(
      "-phone -otp -isVerified -isAdmin -createdAt -updatedAt"
    );

    if (!user) {
      throw new ApiError("401", "invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError("401", "Refresh token is expired");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user?._id
    );
    const tokens = {
      accessToken,
      refreshToken,
    };
    console.log({ tokens });
    return res
      .status(200)
      .json(new ApiResponse(200, tokens, "New tokens generated"));
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token");
  }
});

const resendOTP = asyncHandler(async (req, res) => {
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
    // If user exists, update the OTP
    user.otp = newOtp;
    user.isVerified = false;
    await user.save();
    return res
      .status(200)
      .json(new ApiResponse(200, newOtp, "OTP Sent Successfully"));
  } else {
    throw new ApiError(500, `Invalid Phone number`);
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true, // if document is set then return the new document
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User loggged out"));
});

export { loginUser, verify_OTP, logoutUser, refreshAccessToken, resendOTP };
