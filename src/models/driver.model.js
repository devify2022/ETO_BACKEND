import mongoose, { Schema } from "mongoose";

const driverSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
    trim: true,
    unique: true,
  },
  login_time: {
    type: String,
    default: "",
  },
  logout_time: {
    type: String,
    default: "",
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  online_wallet: {
    type: Number,
    default: 0,
  },
  cash_wallet: {
    type: Number,
    default: 0,
  },
  due_wallet: {
    type: Number,
    default: 0,
  },
  total_earning: {
    type: Number,
    default: 0,
  },
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
  },
  village: {
    type: String,
    required: [true, "Village is required"],
  },
  police_station: {
    type: String,
    required: [true, "Police station is required"],
  },
  landmark: {
    type: String,
    required: [true, "Landmark is required"],
  },
  post_office: {
    type: String,
    required: [true, "Post office is required"],
  },
  district: {
    type: String,
    required: [true, "District is required"],
  },
  pin_code: {
    type: String,
    required: [true, "Pin code is required"],
  },
  aadhar_number: {
    type: String,
    required: [true, "Aadhar number is required"],
    // trim: true,
    // validate: {
    //   validator: function (v) {
    //     return /^\d{4}-\d{4}-\d{4}$/.test(v);
    //   },
    // },
  },
  driver_photo: {
    type: String, //url
    // required: [true, "Driver photo is required"],
  },
  car_photo: {
    type: [String],
    // required: [true, "Car photo is required"],
  },
  lisense_number: {
    type: String,
    required: [true, "License number is required"],
    trim: true,
  },
  ride_ids: [
    {
      type: Schema.Types.ObjectId,
      ref: "RideDetails",
    },
  ],
  aadhar_front_photo: {
    type: String,
    // required: [true, "Aadhar front photo is required"],
  },
  aadhar_back_photo: {
    type: String,
    // required: [true, "Aadhar back photo is required"],
  },
  current_location: {
    type: [Number],
    index: "2dsphere",
  },
  total_complete_rides: {
    type: Number,
    default: 0,
  },
  is_on_ride: {
    type: Boolean,
    default: false,
  },
  current_ride_id: {
    type: String,
  },
});

export const Driver = mongoose.model("Driver", driverSchema);
