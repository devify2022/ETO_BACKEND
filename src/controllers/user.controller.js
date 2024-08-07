import { ObjectId } from "bson";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
// import generateOtp from "./../utils/otpGenerate";
import { Rider } from "../models/rider.model.js";

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
  const { _id, phone, otp, isVerified, isDriver, isAdmin } = req.body;

  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  if (!phone) {
    throw new ApiError(400, "Phone number is required");
  }

  if (phone) {
    const newOtp = generateOtp();
    const user = await User.findOne({ phone });
    if (!user) {
      new User({
        phone,
        otp: newOtp,
        isVerified: false,
        isDriver,
        isAdmin,
      });
      await user.save();
    } else {
      await User.findOneAndUpdate({
        phone,
        otp: newOtp,
        isVerified: false,
        isDriver,
        isAdmin,
      });
    }
    if (!isDriver && !isAdmin) {
      const rider = Rider.findOne({ userId: ObjectId(_id) });
      if (!rider) {
        const newRider = new Rider({
          phone,
          userId: ObjectId(_id),
          name: "rider",
        });
        await newRider.save();
      }

      if (!rider.name || rider.name.trim() === "") {
        await Rider.findOneAndUpdate(
          { phone, name: "rider" },
          {
            set: true,
          }
        );
      }
    }
    return res
      .status(200)
      .json(new ApiResponse(200, otp, "OTP sent successfully"));
  }

  // let user = await User.findOne({ phone });

  // if (!user) {
  //   user = new User({
  //     phone,
  //     isVerified: false,
  //     isDriver: false,
  //     isAdmin: false,
  //   });
  //   await user.save();
  // } else {
  //   if (!user.isDriver && !user.isAdmin) {
  //     const isRider = await Rider.findOne({
  //       userId: ObjectId(_id),
  //       name: { $exists: true, $ne: "", $type: "string" },
  //     });

  //     if (!isRider) {
  //       const rider = new Rider({ userId: ObjectId(_id), name: "rider" });
  //       await rider.save();
  //     }
  //   }
  // }

  // const generatedOtp = generateOtp();
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

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }
  try {
    const decodedToken = await jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    if (!decodedToken) {
      throw new ApiError("401", "unauthorized request");
    }
    const user = await User.findById(decodedToken?._id).select("-password ");
    if (!user) {
      throw new ApiError("401", "invalid refresh token");
    }
    console.log({ incomingRefreshToken });
    console.log(user?.refreshToken);
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError("401", "Refresh token is expired");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user?._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          "200",
          accessToken,
          newRefreshToken,
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user?._id;
  const user = await User.findById(userId);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse("200", {}, "Password changed successfully"));
});

export { loginUser, logoutUser, refreshAccessToken, changeCurrentPassword };
