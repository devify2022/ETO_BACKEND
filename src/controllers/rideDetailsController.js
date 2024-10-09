import { asyncHandler } from "../utils/asyncHandler.js";
import { Rider } from "../models/rider.model.js";
import { Driver } from "../models/driver.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import generateOtp from "../utils/otpGenerate.js";
import { RideDetails } from "../models/rideDetails.model.js";
import mongoose from "mongoose";

// Looking Drivers for Ride
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

      // console.log(availableDrivers)

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

      // console.log(resData)

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

// Accept Ride request
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

    // console.log(req.body);

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
        isRide_accept: true,
      });

      await newRide.save();
      // console.log("rider", rider.socketId);
      // console.log("driver", driver.socketId);

      if (rider.socketId) {
        // console.log("hello")
        console.log("Emitting rideAccepted to rider:", rider.socketId);
        io.to(rider.socketId).emit("rideAccepted", {
          driverId: driver._id,
          rideId: newRide._id,
          riderLocation: rider.current_location,
          driverLocation: driver.current_location,
          totalPrice: newRide.total_amount,
          pickupOtp,
          dropOtp,
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

// Reject Ride request
export const rejectRide = (io) =>
  asyncHandler(async (req, res) => {
    const { driverId, riderId, rideId } = req.body;

    // Validate input data
    if (!driverId || !riderId || !rideId) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            "Driver ID, Rider ID, and Ride ID are required"
          )
        );
    }

    try {
      // Fetch rider, driver, and ride details from the database
      const rider = await Rider.findById(riderId);
      const driver = await Driver.findById(driverId);
      const ride = await RideDetails.findById(rideId);

      // Handle if any of the entities are not found
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

      if (!ride) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Ride not found"));
      }

      // Check if the ride has already started, which makes it non-rejectable
      if (ride.isRide_started) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Ride has already started"));
      }

      // Mark the ride as rejected by setting `isRide_accept` to false
      ride.isRide_accept = false;
      ride.isRide_ended = false; // Mark ride as ended after rejection
      await ride.save();

      // Notify the rider via socket if they have a socket ID
      if (rider.socketId) {
        io.to(rider.socketId).emit("rideRejected", {
          rideId,
          message: "Your ride request has been rejected by the driver",
        });
      }

      // Send success response
      return res
        .status(200)
        .json(new ApiResponse(200, ride, "Ride rejected successfully"));
    } catch (error) {
      // Handle errors during the process
      console.error("Error rejecting the ride:", error.message);
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to reject the ride"));
    }
  });

// Verify Pickup OTP
export const verifyPickUpOtp = asyncHandler(async (req, res) => {
  const { rideId, pickupOtp } = req.body;
  // console.log(req.body);

  // Check if the required fields are provided
  if (!rideId || !pickupOtp) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Ride ID, Pickup OTP are required"));
  }

  try {
    // Find the ride by ID
    const ride = await RideDetails.findById(rideId);
    const rider = await Rider.findById({ _id: ride.riderId });
    const driver = await Driver.findOne({ _id: ride.driverId });

    // Check if the ride exists
    if (!ride) {
      return res.status(404).json(new ApiResponse(404, null, "Ride not found"));
    }

    // console.log(ride);

    // Verify the pickup OTP
    if (ride.pickup_otp !== pickupOtp) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid Pickup OTP"));
    }

    // Set the ride status to 'on ride' after OTP verification
    rider.is_on_ride = true;
    rider.current_ride_id = ride._id;
    await rider.save();

    driver.is_on_ride = true;
    driver.current_ride_id = ride._id;
    await driver.save();

    ride.isRide_started = true;
    ride.started_time = Date.now();
    await ride.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          ride,
          "OTP verified successfully and ride is now active"
        )
      );
  } catch (error) {
    console.error("Error verifying OTPs:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to verify OTPs"));
  }
});

// Verify Drop OTP
export const verifyDropOtp = asyncHandler(async (req, res) => {
  const { rideId, dropOtp } = req.body;
  // console.log(req.body);

  // Check if the required fields are provided
  if (!rideId || !dropOtp) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Ride ID, and Drop OTP are required"));
  }

  try {
    // Find the ride by ID
    const ride = await RideDetails.findById(rideId);
    const rider = await Rider.findById({ _id: ride.riderId });
    const driver = await Driver.findOne({ _id: ride.driverId });

    // Check if the ride exists
    if (!ride) {
      return res.status(404).json(new ApiResponse(404, null, "Ride not found"));
    }

    // console.log(ride);

    // Verify the drop OTP
    if (ride.drop_otp !== dropOtp) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid Drop OTP"));
    }

    // Set the ride status to 'on ride' after OTP verification
    rider.is_on_ride = false;
    rider.current_ride_id = null;
    rider.ride_ids.push(new mongoose.Types.ObjectId(rideId));
    await rider.save();

    driver.is_on_ride = false;
    driver.current_ride_id = null;
    driver.ride_ids.push(new mongoose.Types.ObjectId(rideId));
    await driver.save();

    ride.isRide_started = false;
    ride.isRide_ended = true;
    ride.ride_end_time = Date.now();
    await ride.save();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          ride,
          "OTP verified successfully and ride is now finished"
        )
      );
  } catch (error) {
    console.error("Error verifying OTPs:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to verify OTP"));
  }
});

// Cancel ride API
export const cancelRide = (io) =>
  asyncHandler(async (req, res) => {
    const { rideId, riderId } = req.body;

    // Check if the required fields are provided
    if (!rideId || !riderId) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Ride ID and Rider ID are required"));
    }

    try {
      // Find the ride by ID
      const ride = await RideDetails.findById(rideId);

      // Log the retrieved ride
      // console.log("Retrieved ride:", ride);

      // Check if the ride exists
      if (!ride) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Ride not found"));
      }

      // Check if the ride belongs to the rider requesting cancellation
      if (ride.riderId.toString() !== riderId) {
        return res
          .status(403)
          .json(
            new ApiResponse(
              403,
              null,
              "You are not authorized to cancel this ride"
            )
          );
      }

      // Find the driver associated with the ride
      const driver = await Driver.findOne({ _id: ride.driverId });

      // Check if the driver exists
      if (!driver) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Driver not found"));
      }

      // Delete the ride from the collection
      await RideDetails.findByIdAndDelete(rideId);

      // Notify the driver that the ride has been canceled via Socket.io
      if (driver.socketId) {
        io.to(driver.socketId).emit("cancelRide", {
          message: "Ride Canceled",
        });
      }

      return res
        .status(200)
        .json(new ApiResponse(200, null, "Ride canceled successfully"));
    } catch (error) {
      console.error("Error canceling ride:", error.message);
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to cancel ride"));
    }
  });
