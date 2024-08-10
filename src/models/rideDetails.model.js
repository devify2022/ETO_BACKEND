import mongoose, { Schema } from "mongoose";

const rideDetailsSchema = new Schema({
  driverId: {
    type: Schema.Types.ObjectId,
    ref: "Driver",
  },
  riderId: {
    type: Schema.Types.ObjectId,
    ref: "Rider",
  },
  currentLocation: {
    type: [Number], // Latitude and Longitude
    index: "2dsphere",
  },
  isCancelled: {
    type: Boolean,
    default: false,
  },
  pickup_location: {
    type: [Number], // Latitude and Longitude
    index: "2dsphere",
  },
  drop_location: {
    type: [Number], // Latitude and Longitude
    index: "2dsphere",
  },
  total_km: {
    type: Number,
  },
  pickup_otp: {
    type: Number,
  },
  drop_otp: {
    type: Number,
  },
  total_amount: {
    type: Number,
    default: 0,
  },
  payment_mode: {
    type: String,
  },
  isPayment_done: {
    type: Boolean,
    default: false,
  },
  isRide_started: {
    type: Boolean,
    default: false,
  },
  started_time: {
    type: String,
  },
  isRide_ended: {
    type: Boolean,
    default: false,
  },
  drop_time: {
    type: String,
  },
  total_duration: {
    type: String,
  },
});

export const RideDetails = mongoose.model("RideDetails", rideDetailsSchema);
