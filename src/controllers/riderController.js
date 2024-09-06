import { asyncHandler } from "../utils/asyncHandler.js";
import { Rider } from "../models/rider.model.js";
import { RideDetails } from "../models/rideDetails.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

// Get All Riders Function
export const getAllRiders = asyncHandler(async (req, res) => {
  try {
    const riders = await Rider.find();
    return res
      .status(200)
      .json(new ApiResponse(200, riders, "Riders retrieved successfully"));
  } catch (error) {
    console.error("Error retrieving riders:", error.message);
    throw new ApiError(500, "Failed to retrieve riders");
  }
});

// Get Rider by ID Function
export const getRiderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Rider ID is required");
  }

  try {
    const rider = await Rider.findById(id);

    if (!rider) {
      throw new ApiError(404, "Rider not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, rider, "Rider retrieved successfully"));
  } catch (error) {
    console.error("Error retrieving rider:", error.message);
    throw new ApiError(500, "Failed to retrieve rider");
  }
});

// Get Rider Ride by ID Function
export const getRiderRideById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Rider ID is required");
  }

  try {
    const rides = await RideDetails.find({ riderId: id });

    if (!rides.length) {
      throw new ApiError(404, "No rides found for the given rider");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, rides, "Rides retrieved successfully"));
  } catch (error) {
    console.error("Error retrieving rides:", error.message);
    throw new ApiError(500, "Failed to retrieve rides");
  }
});

// Update Rider Profile Function
export const updateRiderProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Rider ID is required");
  }

  delete req.body.phone;

  try {
    const rider = await Rider.findByIdAndUpdate(id, req.body, { new: true });

    if (!rider) {
      throw new ApiError(404, "Rider not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, rider, "Rider profile updated successfully"));
  } catch (error) {
    console.error("Error updating rider profile:", error.message);
    throw new ApiError(500, "Failed to update rider profile");
  }
});
