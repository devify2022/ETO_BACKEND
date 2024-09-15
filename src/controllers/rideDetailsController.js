import { asyncHandler } from "../utils/asyncHandler.js";
import { Rider } from "../models/rider.model.js";
import { Driver } from "../models/driver.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import generateOtp from "../utils/otpGenerate.js";
import { RideDetails } from "../models/rideDetails.model.js";

export const findAvailableDrivers = (io) =>
  asyncHandler(async (req, res, next) => {
    const { riderId, dropLocation, totalKm } = req.body;
    const proximityRadius = 5; // Define radius to search for nearby drivers (in kilometers)
    const perKmCharge = 10; // Charge per kilometer
    const adminProfitPercentage = 40; // Admin profit percentage (40%)

    if (!riderId) {
      return next(new ApiError(400, "Rider ID is required"));
    }

    if (!dropLocation || !totalKm) {
      return next(
        new ApiError(400, "Drop location and total kilometers are required")
      );
    }

    try {
      // Fetch the rider's current location
      const rider = await Rider.findById(riderId);

      if (!rider) {
        return next(new ApiError(404, "Rider not found"));
      }

      const { current_location } = rider;

      if (
        !current_location ||
        !current_location.coordinates ||
        current_location.coordinates.length !== 2
      ) {
        return next(
          new ApiError(400, "Rider's current location is not set or invalid")
        );
      }

      // Extract coordinates
      const riderCoordinates = current_location.coordinates;

      // Search for available drivers near the rider's current location
      const availableDrivers = await Driver.find({
        current_location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: riderCoordinates,
            },
            $maxDistance: proximityRadius * 1000, // Convert km to meters
          },
        },
        isActive: true,
        is_on_ride: false, // Only find drivers who are not currently on a ride
      });

      if (availableDrivers.length === 0) {
        return res
          .status(200)
          .json(new ApiResponse(200, [], "No available drivers found"));
      }

      // Calculate the total price, driver profit, and admin profit based on totalKm
      const totalPrice = totalKm * perKmCharge;
      const adminProfit = (adminProfitPercentage / 100) * totalPrice;
      const driverProfit = totalPrice - adminProfit;

      // Notify the available drivers with a new ride request via socket.io
      availableDrivers.forEach((driver) => {
        if (driver.socketId) {
          io.to(driver.socketId).emit("newRideRequest", {
            riderId,
            riderLocation: riderCoordinates, // riderCoordinates should be an array
            driverId: driver._id,
            driverLocation: driver.current_location.coordinates, // Ensure this is also an array
            dropLocation, // Pass the drop location
            totalKm, // Pass the total kilometers for the ride
            totalPrice, // Total price for the ride
            driverProfit, // Driver's profit for the ride
            adminProfit, // Admin's profit for the ride
          });
        }
      });

      return res.status(200).json(
        new ApiResponse(
          200,
          availableDrivers,
          "Drivers notified successfully",
          { totalPrice, driverProfit, adminProfit } // Send the calculated details in the response
        )
      );
    } catch (error) {
      console.error("Error finding available drivers:", error.message);
      return next(new ApiError(500, "Failed to find available drivers"));
    }
  });

export const acceptRide = (io) =>
  asyncHandler(async (req, res, next) => {
    const {
      driverId,
      riderId,
      dropLocation,
      pickup_location,
      total_amount,
      totalKm,
    } = req.body;

    if (!driverId || !riderId || !dropLocation || !totalKm) {
      return next(
        new ApiError(
          400,
          "Driver ID, Rider ID, Drop Location, and Total Kilometers are required"
        )
      );
    }

    try {
      // Fetch the rider and driver details
      const rider = await Rider.findById(riderId);
      const driver = await Driver.findById(driverId);

      if (!rider) {
        return next(new ApiError(404, "Rider not found"));
      }
      if (!driver) {
        return next(new ApiError(404, "Driver not found"));
      }

      if (rider.is_on_ride) {
        return next(new ApiError(400, "Rider is already on a ride"));
      }

      if (driver.is_on_ride) {
        return next(new ApiError(400, "Driver is already on a ride"));
      }

      const perKmCharge = 10; // Per kilometer charge
      const adminPercentage = 40; // Admin percentage

      // Calculate total amount based on kilometers
      const totalAmount = totalKm * perKmCharge;

      // Calculate admin amount and profits
      const adminAmount = (adminPercentage / 100) * totalAmount;
      const driverProfit = totalAmount - adminAmount;

      // Generate pickup and drop OTPs
      const pickupOtp = generateOtp();
      const dropOtp = generateOtp();

      // Create a new ride entry in RideDetails
      const newRide = new RideDetails({
        driverId: driver._id,
        riderId: rider._id,
        pickup_location: {
          type: "Point",
          coordinates: [77.123457, 28.987655], // [longitude, latitude]
        },
        drop_location: {
          type: "Point",
          coordinates: [77.321654, 28.876543], // [longitude, latitude]
        },
        total_km: totalKm,
        pickup_otp: pickupOtp,
        drop_otp: dropOtp,
        total_amount: totalAmount,
        admin_percentage: adminPercentage,
        admin_profit: adminAmount,
        driver_profit: driverProfit,
        isRide_started: true,
      });

      await newRide.save();

      // Update rider and driver to mark them as on a ride
      rider.is_on_ride = true;
      rider.current_ride_id = newRide._id;
      await rider.save();

      driver.is_on_ride = true;
      driver.current_ride_id = newRide._id;
      await driver.save();

      // Notify the rider and driver about the ride acceptance via socket.io
      if (rider.socketId) {
        io.to(rider.socketId).emit("rideAccepted", {
          driverId: driver._id,
          rideId: newRide._id,
          riderLocation: rider.current_location,
          driverLocation: driver.current_location,
          totalPrice: newRide.total_amount,
          pickupOtp,
        });
      }

      if (driver.socketId) {
        io.to(driver.socketId).emit("rideDetails", {
          rideId: newRide._id,
          riderLocation: rider.current_location,
          pickupLocation: newRide.pickup_location,
          dropLocation: newRide.drop_location,
          pickupOtp,
          dropOtp,
          totalAmount,
          adminProfit: adminAmount,
          driverProfit,
        });
      }

      return res
        .status(200)
        .json(new ApiResponse(200, newRide, "Ride accepted successfully"));
    } catch (error) {
      console.error("Error accepting the ride:", error.message);
      return next(new ApiError(500, "Failed to accept the ride"));
    }
  });
