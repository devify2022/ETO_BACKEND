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
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Rider ID is required"));
    }

    if (!dropLocation || !totalKm) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            "Drop location and total kilometers are required"
          )
        );
    }

    try {
      const rider = await Rider.findById(riderId);

      if (!rider) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Rider not found"));
      }

      const { current_location } = rider;

      if (
        !current_location ||
        !current_location.coordinates ||
        current_location.coordinates.length !== 2
      ) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              null,
              "Rider's current location is not set or invalid"
            )
          );
      }

      const riderCoordinates = current_location.coordinates;

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
        is_on_ride: false,
      });

      if (availableDrivers.length === 0) {
        return res
          .status(200)
          .json(new ApiResponse(200, [], "No available drivers found"));
      }

      const totalPrice = totalKm * perKmCharge;
      const adminProfit = (adminProfitPercentage / 100) * totalPrice;
      const driverProfit = totalPrice - adminProfit;

      availableDrivers.forEach((driver) => {
        if (driver.socketId) {
          io.to(driver.socketId).emit("newRideRequest", {
            riderId,
            riderLocation: riderCoordinates,
            driverId: driver._id,
            driverLocation: driver.current_location.coordinates,
            dropLocation,
            totalKm,
            totalPrice,
            driverProfit,
            adminProfit,
          });
        }
      });

      const resData = {
        availableDrivers,
        totalPrice,
        adminProfit,
        driverProfit,
        totalKm,
      };

      return res
        .status(200)
        .json(new ApiResponse(200, resData, "Drivers notified successfully"));
    } catch (error) {
      console.error("Error finding available drivers:", error.message);
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to find available drivers"));
    }
  });

export const acceptRide = (io) =>
  asyncHandler(async (req, res) => {
    const {
      driverId,
      riderId,
      dropLocation,
      pickup_location,
      total_amount,
      totalKm,
    } = req.body;

    console.log(req.body)

    if (
      !driverId ||
      !riderId ||
      !dropLocation ||
      !pickup_location ||
      !totalKm
    ) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            "Driver ID, Rider ID, Drop Location, Pickup Location, and Total Kilometers are required"
          )
        );
    }

    if (
      !Array.isArray(pickup_location) ||
      pickup_location.length !== 2 ||
      !Array.isArray(dropLocation) ||
      dropLocation.length !== 2
    ) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            "Pickup and Drop Locations must be arrays with [longitude, latitude]"
          )
        );
    }

    try {
      const rider = await Rider.findById(riderId);
      const driver = await Driver.findById(driverId);

      if (!rider) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Rider not found"));
      }
      if (!driver) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Driver not found"));
      }

      if (rider.is_on_ride) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Rider is already on a ride"));
      }

      if (driver.is_on_ride) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Driver is already on a ride"));
      }

      const perKmCharge = 10; // Per kilometer charge
      const adminPercentage = 40; // Admin percentage

      const totalAmount = totalKm * perKmCharge;
      const adminAmount = (adminPercentage / 100) * totalAmount;
      const driverProfit = totalAmount - adminAmount;

      const pickupOtp = generateOtp();
      const dropOtp = generateOtp();

      const newRide = new RideDetails({
        driverId: driver._id,
        riderId: rider._id,
        pickup_location: {
          type: "Point",
          coordinates: pickup_location, // [longitude, latitude]
        },
        drop_location: {
          type: "Point",
          coordinates: dropLocation, // [longitude, latitude]
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

      rider.is_on_ride = true;
      rider.current_ride_id = newRide._id;
      await rider.save();

      driver.is_on_ride = true;
      driver.current_ride_id = newRide._id;
      await driver.save();

      if (rider.socketId) {
        io.to(rider.socketId).emit("rideAccepted", {
          driverId: driver._id,
          rideId: newRide._id,
          riderLocation: rider.current_location,
          driverLocation: driver.current_location,
          totalPrice: newRide.total_amount,
          pickupOtp,
          dropOtp
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
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to accept the ride"));
    }
  });
