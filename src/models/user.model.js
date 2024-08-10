import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";

const usersSchema = new Schema(
  {
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
    },
    otp: {
      type: Number,
      // required: [true, 'OTP is required'],
    },
    isVerified: {
      type: Boolean,
      // required: [true, 'Verification status is required'],
      default: false,
    },
    isDriver: {
      type: Boolean,
      required: [true, "Driver status is required"],
    },
    isAdmin: {
      type: Boolean,
      // required: [true, 'Admin status is required'],
      default: false,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

usersSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      isDriver: this.isDriver,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

usersSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      isDriver: this.isDriver,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", usersSchema);
