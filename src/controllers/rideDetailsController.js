import { asyncHandler } from "../utils/asyncHandler.js";
import { RideDetails } from "../models/rideDetails.model.js";
import { Driver } from "../models/driver.model.js";
import { Rider } from "../models/rider.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

export const createNewRide = (io) =>
  asyncHandler(async (req, res, next) => {
    const {
      driverId,
      riderId,
      pickup_location,
      drop_location,
      total_amount,
      admin_percentage,
    } = req.body;

    if (
      !driverId ||
      !riderId ||
      !pickup_location ||
      !drop_location ||
      total_amount === undefined ||
      admin_percentage === undefined
    ) {
      return next(new ApiError(400, "Required fields are missing"));
    }

    try {
      const driverExists = await Driver.findById(driverId);
      const riderExists = await Rider.findById(riderId);

      if (!driverExists || !riderExists) {
        return next(new ApiError(404, "Driver or Rider not found"));
      }

      // Calculate the admin amount and profits
      const adminAmount = (admin_percentage / 100) * total_amount;
      const adminProfit = adminAmount;
      const driverProfit = total_amount - adminAmount;

      const rideData = {
        ...req.body,
        admin_amount: adminAmount,
        admin_profit: adminProfit,
        driver_profit: driverProfit,
      };

      const newRide = new RideDetails(rideData);
      const savedRide = await newRide.save();

      // Emit new ride request event to all connected drivers
      io.emit("newRideRequest", {
        rideId: savedRide._id,
        pickup_location: savedRide.pickup_location,
        drop_location: savedRide.drop_location,
        total_amount: savedRide.total_amount,
      });

      return res
        .status(201)
        .json(new ApiResponse(201, savedRide, "Ride created successfully"));
    } catch (error) {
      console.error("Error creating ride:", error.message);
      return next(new ApiError(500, "Failed to create ride"));
    }
  });

export const acceptRide = (io) =>
  asyncHandler(async (req, res, next) => {
    const { rideId, driverId } = req.body;

    if (!rideId || !driverId) {
      return next(new ApiError(400, "Ride ID and Driver ID are required"));
    }

    try {
      // Find and update the ride status
      const ride = await RideDetails.findByIdAndUpdate(
        rideId,
        { driverId, isRide_started: true, started_time: new Date() },
        { new: true }
      );

      if (!ride) {
        return next(new ApiError(404, "Ride not found"));
      }

      // Update driver's current ride ID and status
      await Driver.findByIdAndUpdate(driverId, {
        current_ride_id: rideId,
        is_on_ride: true,
      });

      // Notify all clients that the ride has started
      io.emit("rideStarted", { rideId, driverId });

      // Notify the rider about the acceptance
      const rider = await Rider.findById(ride.riderId);
      if (rider && rider.socketId) {
        io.to(rider.socketId).emit("rideAccepted", { rideId, driverId });
      }

      return res
        .status(200)
        .json(new ApiResponse(200, ride, "Ride accepted successfully"));
    } catch (error) {
      console.error("Error accepting ride:", error.message);
      return next(new ApiError(500, "Failed to accept ride"));
    }
});
