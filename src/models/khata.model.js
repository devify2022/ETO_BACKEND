import mongoose, { Schema } from "mongoose";

const khataSchema = new Schema(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    driverdue: {
      type: Number,
      default: 0, // Money owed by the driver
    },
    admindue: {
      type: Number,
      default: 0, // Money owed by the admin
    },
    due_payment_details: [
      {
        driverId: {
          type: Schema.Types.ObjectId,
          ref: "Driver",
          required: [true, "Driver ID is required"],
        },
        rideId: {
          type: Schema.Types.ObjectId,
          ref: "Ride",
          required: [true, "Ride ID is required"],
        },
        total_price: {
          type: Number,
          default: 0,
          required: [true, "Driver due payment amount is required"],
        },
        admin_profit: {
          type: Number,
          default: 0,
        },
        driver_profit: {
          type: Number,
          default: 0,
        },
        payment_mode: {
          type: String,
          enum: ["cash", "online"],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Create the Khata model
export const Khata = mongoose.model("Khata", khataSchema);
