import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { Rider } from "../models/rider.model.js";
import { Driver } from "../models/driver.model.js";
import {
  sendOtpViaMessageCentral,
  validateOtpViaMessageCentral,
} from "../utils/sentOtp.js";
import { Admin } from "../models/admin.model.js";

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
  const { phone, isDriver, isAdmin } = req.body;

  // Validate input
  if (!phone) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Phone number is required"));
  }

  let role = null;
  let userDetails = null;
  let otpResponse = null;
  let otpCredentials = null;

  // Determine role and find existing user details (Driver, Passenger, or Admin)
  if (isDriver) {
    userDetails = await Driver.findOne({ phone });
    role = "driver";
  } else if (isAdmin) {
    userDetails = await Admin.findOne({ phone });
    role = "admin";
  } else {
    userDetails = await Rider.findOne({ phone });
    role = "passenger";
  }

  let user = await User.findOne({ phone });

  if (userDetails) {
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

    try {
      // Send OTP via Message Central
      otpResponse = await sendOtpViaMessageCentral(phone);

      // Handle response for OTP service
      if (otpResponse) {
        // If response is a string, try to parse it
        if (typeof otpResponse === "string") {
          try {
            otpCredentials = JSON.parse(otpResponse);
          } catch (error) {
            console.error("Error parsing OTP response:", error.message);
            return res
              .status(500)
              .json(new ApiResponse(500, null, "Error parsing OTP response"));
          }
        } else {
          otpCredentials = otpResponse; // Use directly if it's already an object
        }

        // Check if the OTP request was successful
        if (otpCredentials?.responseCode !== 200) {
          return res
            .status(400)
            .json(
              new ApiResponse(
                400,
                otpCredentials,
                `OTP request failed: ${otpCredentials.message || "Unknown error"}`
              )
            );
        }

        const data = {
          role,
          accessToken,
          refreshToken,
          userDetails: userDetails || {}, // Send user details if available
          otpdata: otpCredentials.data,
        };

        console.log(otpCredentials);

        return res
          .status(200)
          .json(new ApiResponse(200, data, "Logged in successfully, OTP sent"));
      } else {
        return res
          .status(500)
          .json(new ApiResponse(500, null, "No response from OTP service"));
      }
    } catch (error) {
      console.error("Error sending OTP:", error.message);
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to send OTP"));
    }
  } else {
    // Handle new user registration
    if (user) {
      if (user.isDriver !== isDriver || user.isAdmin !== isAdmin) {
        return res
          .status(409)
          .json(
            new ApiResponse(
              409,
              null,
              `This number is already used as a ${user.isDriver ? "driver" : user.isAdmin ? "admin" : "passenger"}.`
            )
          );
      }

      user.isVerified = false;
      await user.save();
    } else {
      // Create a new user
      user = new User({
        phone,
        isVerified: false,
        isDriver,
        isAdmin, // Set isAdmin flag based on the request
      });

      await user.save();
    }

    try {
      // Send OTP via Message Central
      otpResponse = await sendOtpViaMessageCentral(phone);

      // Handle response for OTP service
      if (otpResponse) {
        // If response is a string, try to parse it
        if (typeof otpResponse === "string") {
          try {
            otpCredentials = JSON.parse(otpResponse);
          } catch (error) {
            console.error("Error parsing OTP response:", error.message);
            return res
              .status(500)
              .json(new ApiResponse(500, null, "Error parsing OTP response"));
          }
        } else {
          otpCredentials = otpResponse; // Use directly if it's already an object
        }

        // Check if the OTP request was successful
        if (otpCredentials?.responseCode !== 200) {
          return res
            .status(400)
            .json(
              new ApiResponse(
                400,
                otpCredentials,
                `OTP request failed: ${otpCredentials.message || "Unknown error"}`
              )
            );
        }

        const newData = {
          user,
          otpdata: otpCredentials.data,
        };

        return res
          .status(200)
          .json(new ApiResponse(200, newData, "OTP sent successfully"));
      } else {
        return res
          .status(500)
          .json(new ApiResponse(500, null, "No response from OTP service"));
      }
    } catch (error) {
      console.error("Error sending OTP:", error.message);
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to send OTP"));
    }
  }
});

// OTP Verification Controller
export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, verificationId, code } = req.body;

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

    // console.log("Validation Response:", validationResponse); // Log the entire response

    // Check if the response is a string and parse if necessary
    let validateData;
    if (typeof validationResponse === "string") {
      try {
        validateData = JSON.parse(validationResponse);
      } catch (error) {
        console.error("Error parsing validation response:", error.message);
        return res
          .status(500)
          .json(
            new ApiResponse(500, null, "Invalid response from OTP service")
          );
      }
    } else {
      validateData = validationResponse;
    }

    // Check if the response has the expected structure
    if (
      !validateData?.data ||
      !validateData.data.responseCode ||
      !validateData.data.verificationStatus
    ) {
      console.error("Unexpected response structure:", validateData);
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Invalid response from OTP service"));
    }

    // Check if OTP validation was successful
    if (
      validateData.data.responseCode !== "200" ||
      validateData.data.verificationStatus !== "VERIFICATION_COMPLETED"
    ) {
      console.error("OTP validation failed:", validateData.data);
      return res.status(400).json(new ApiResponse(400, null, "Invalid OTP"));
    }

    // OTP is valid, mark the user as verified
    user.isVerified = true;
    await user.save();

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    // If the user is an admin
    if (user.isAdmin) {
      const adminDetails = await Admin.findOne({ phone });

      const msg = {
        role: "admin",
        isVerified: user.isVerified,
        isNewAdmin: !adminDetails, // New admin if no details found
        phone: user.phone,
        accessToken,
        refreshToken,
        userDetails: adminDetails || {
          userId: user._id,
          phone: user.phone,
          isVerified: user.isVerified,
          isDriver: user.isDriver,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }, // Send admin details if available
      };

      return res
        .status(200)
        .json(new ApiResponse(200, msg, "OTP verified for admin"));
    }

    // If the user is a driver
    if (user.isDriver) {
      const driverDetails = await Driver.findOne({ phone });
      // console.log(driverDetails);
      const msg = {
        role: "driver",
        isVerified: user.isVerified,
        isNewDriver: !driverDetails, // New driver if no details found
        phone: user.phone,
        accessToken,
        refreshToken,
        userDetails: driverDetails || {
          userId: user._id,
          phone: user.phone,
          isVerified: user.isVerified,
          isDriver: user.isDriver,
          isAdmin: user.isAdmin,
          isApproved: driverDetails?.isApproved || false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }, // Send driver details if available
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
        userDetails: passengerDetails || user,
      };

      return res
        .status(200)
        .json(new ApiResponse(200, msg, "OTP verified for rider"));
    }
  } catch (error) {
    console.error("Error validating OTP:", error.message);
    console.error("Full error object:", error); // Log the full error object for more details

    // Return a more detailed error message if possible
    const errorMessage =
      error.response?.data?.message || "Failed to validate OTP";
    return res.status(500).json(new ApiResponse(500, null, errorMessage));
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
  const { phone } = req.body;

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

  try {
    // Attempt to send OTP via Message Central
    const otpResponse = await sendOtpViaMessageCentral(phone);
    console.log("OTP Response:", otpResponse); // Log the response to debug

    // Since otpResponse is already an object, no need to parse it
    const otpCredentials = otpResponse;

    // Prepare response data
    const data = {
      role: user.isDriver ? "driver" : user.isAdmin ? "admin" : "passenger",
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
