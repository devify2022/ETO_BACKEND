import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const usersSchema = new Schema(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
    },
    otp: {
      type: Number,
      required: [true, 'OTP is required'],
    },
    isVerified: {
      type: Boolean,
      required: [true, 'Verification status is required'],
    },
    isDriver: {
      type: Boolean,
      required: [true, 'Driver status is required'],
    },
    isAdmin: {
      type: Boolean,
      required: [true, 'Admin status is required'],
    },
  },
  { timestamps: true }
);

usersSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
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
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", usersSchema);
