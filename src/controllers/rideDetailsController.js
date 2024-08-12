import { asyncHandler } from "../utils/asyncHandler.js";
import { RideDetails } from "../models/rideDetails.model.js";
import { Driver } from "../models/driver.model.js";
import { Rider } from "../models/rider.model.js";

export const createNewRide = asyncHandler(async (req, res) => {
  const { driverId, riderId, pickup_location, drop_location } = req.body;

  console.log("hello")

  if (!driverId || !riderId || !pickup_location || !drop_location) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  try {
    // Check if the driver and rider exist
    const driverExists = await Driver.findById(driverId);
    const riderExists = await Rider.findById(riderId);

    if (driverExists && riderExists) {
      // Create a new ride
      const rideData = req.body;

      const newRide = new RideDetails(rideData);
      const savedRide = await newRide.save();

      return res.status(201).json({
        message: "Ride created successfully",
        ride: savedRide,
      });
    } else {
      return res.status(404).json({
        message: "Driver or Rider not found",
      });
    }
  } catch (error) {
    console.error("Error creating ride:", error.message);
    return res.status(500).json({ message: "Failed to create ride" });
  }
});
