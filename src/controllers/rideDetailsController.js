import { asyncHandler } from "../utils/asyncHandler.js";
import { RideDetails } from "../models/rideDetails.model.js";
import { Driver } from "../models/driver.model.js";
import { Rider } from "../models/rider.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

export const createNewRide = asyncHandler(async (req, res) => {
  const { driverId, riderId, pickup_location, drop_location } = req.body;

  console.log("hello");

  if (!driverId || !riderId || !pickup_location || !drop_location) {
    throw new ApiError(400, "Required fields are missing");
  }

  try {
    const driverExists = await Driver.findById(driverId);
    const riderExists = await Rider.findById(riderId);

    if (!driverExists || !riderExists) {
      throw new ApiError(404, "Driver or Rider not found");
    }

    const rideData = req.body;
    const newRide = new RideDetails(rideData);
    const savedRide = await newRide.save();

    return res
      .status(201)
      .json(new ApiResponse(201, savedRide, "Ride created successfully"));
  } catch (error) {
    console.error("Error creating ride:", error.message);
    throw new ApiError(500, "Failed to create ride");
  }
});
