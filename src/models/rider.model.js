import mongoose, { Schema } from "mongoose";

const riderSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    phone: {
      type: Number,
      required: [true, "Phone number is required"],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    is_on_ride: {
      type: Boolean,
      default: false,
    },
    photo: {
      type: String,
      default: "",
    },
    total_numbers_of_rides: {
      type: Number,
      default: 0,
    },
    ride_lds: {
      type: Array,
      default: [],
    },
    current_location: {
      type: String,
      default: "",
    },
    current_ride_id: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export const Rider = mongoose.model("Rider", riderSchema);
