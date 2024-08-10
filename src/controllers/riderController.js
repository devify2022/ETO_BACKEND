import { asyncHandler } from "../utils/asyncHandler.js";
import { Rider } from "../models/rider.model.js";
import { RideDetails } from "../models/rideDetails.model.js";
import generateOtp from "../utils/otpGenerate.js";
import { User } from "../models/user.model.js";

export const getAllRriders = asyncHandler(async (req, res) => {
  try {
    const riders = await Rider.find();

    return res.status(200).json({
      message: "Riders retrieved successfully",
      riders,
    });
  } catch (error) {
    console.error("Error retrieving riders:", error.message);
    return res.status(500).json({ message: "Failed to retrieve riders" });
  }
});

export const getRiderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Rider ID is required" });
  }

  try {
    const rider = await Rider.findById(id);

    if (!rider) {
      return res.status(404).json({ message: "rider not found" });
    }

    return res.status(200).json({
      message: "rider retrieved successfully",
      rider,
    });
  } catch (error) {
    console.error("Error retrieving rider:", error.message);
    return res.status(500).json({ message: "Failed to retrieve rider" });
  }
});

export const getRiderRideById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Rider ID is required" });
  }

  try {
    const rider = await RideDetails.find({ riderId: id });

    if (rider.length === 0) {
      return res.status(404).json({ message: "Rider not found" });
    }

    return res.status(200).json({
      message: "Rider retrieved successfully",
      rider,
    });
  } catch (error) {
    console.error("Error retrieving rider:", error.message);
    return res.status(500).json({ message: "Failed to retrieve rider" });
  }
});

export const updateRiderProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Rider ID is required" });
  }

  delete req.body.phone;

  try {
    const rider = await Rider.findByIdAndUpdate(id, req.body, { new: true });

    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    return res.status(200).json({
      message: "Rider profile updated successfully",
      rider,
    });
  } catch (error) {
    console.error("Error updating rider profile:", error.message);
    console.error(error);
    return res.status(500).json({ message: "Failed to update rider profile" });
  }
});
