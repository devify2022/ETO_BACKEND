import { asyncHandler } from "../utils/asyncHandler.js";
import { Rider } from "../models/rider.model.js";
import { Driver } from "../models/driver.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import generateOtp from "../utils/otpGenerate.js";
import { RideDetails } from "../models/rideDetails.model.js";
import mongoose from "mongoose";
import geolib from "geolib";
import dotenv from "dotenv";

dotenv.config({
  path: "./env",
});

// Looking Drivers for Ride new functionality
export const findAvailableDrivers = asyncHandler(async (req, res) => {
  const { riderId, dropLocation, pickUpLocation } = req.body;
  const proximityRadius = 5; // Search radius in kilometers
  const baseFare = 20; // Base fare for the ride
  const perKmCharge = process.env.PER_KM_CHARGE || 15; // Charge per kilometer
  const adminProfitPercentage = process.env.ADMIN_PERCENTAGE || 40; // Admin's profit percentage
  const averageSpeed = 40; // Average speed in km/h

  if (!riderId || !pickUpLocation || !dropLocation) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "Rider ID, pickup, and drop locations are required"
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

    const pickupCoordinates = [
      pickUpLocation.longitude,
      pickUpLocation.latitude,
    ];

    const availableDrivers = await Driver.find({
      current_location: {
        $near: {
          $geometry: { type: "Point", coordinates: pickupCoordinates },
          $maxDistance: proximityRadius * 1000, // Convert km to meters
        },
      },
      isActive: true,
      is_on_ride: false,
    });

    if (availableDrivers.length === 0) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { isAvailable: false },
            "No available drivers found"
          )
        );
    }

    // Calculate total distance from pickup to drop
    const totalKmPickupToDrop =
      geolib.getDistance(
        {
          latitude: pickUpLocation.latitude,
          longitude: pickUpLocation.longitude,
        },
        { latitude: dropLocation.latitude, longitude: dropLocation.longitude }
      ) / 1000; // Convert meters to kilometers

    // Prepare response data for each available driver
    const resData = await Promise.all(
      availableDrivers.map(async (driver) => {
        // Calculate distance from driver's current location to pickup
        const driverDistanceToPickup =
          geolib.getDistance(
            {
              latitude: driver.current_location.coordinates[1],
              longitude: driver.current_location.coordinates[0],
            },
            {
              latitude: pickUpLocation.latitude,
              longitude: pickUpLocation.longitude,
            }
          ) / 1000; // Convert meters to kilometers

        // Total distance for pricing
        const totalDistance = driverDistanceToPickup + totalKmPickupToDrop;

        // Calculate total price based on both segments
        const totalPrice = baseFare + totalDistance * perKmCharge;

        // Calculate profits based on the total price
        const adminProfit = (adminProfitPercentage / 100) * totalPrice;
        const driverProfit = totalPrice - adminProfit; // Driver's profit

        const estimatedTimeToPickup = driverDistanceToPickup / averageSpeed; // Time in hours

        return {
          driverId: driver._id,
          location: driver.current_location.coordinates,
          name: driver.name,
          distanceToPickup: driverDistanceToPickup.toFixed(2) + " km",
          estimatedTimeToPickup:
            (estimatedTimeToPickup * 60).toFixed(2) + " mins", // Convert hours to minutes
          totalPrice: totalPrice.toFixed(2), // Total price based on driver location
          adminProfit: adminProfit.toFixed(2), // Admin profit based on total price
          driverProfit: driverProfit.toFixed(2), // Driver profit
          // totalKm: totalKmPickupToDrop.toFixed(2) + " km", // Distance from pickup to drop
        };
      })
    );

    const finalResData = {
      availableDrivers: resData,
      totalKmPickupToDrop: totalKmPickupToDrop.toFixed(2) + " km", // Add total distance from pickup to drop to the response
      isAvailable: true,
    };

    // console.log(resData)

    return res
      .status(200)
      .json(new ApiResponse(200, finalResData, "Drivers found successfully"));
  } catch (error) {
    console.error("Error finding available drivers:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to find available drivers"));
  }
});


// Accept Ride request new api
export const acceptRide = (io) =>
  asyncHandler(async (req, res) => {
    const {
      driverId,
      riderId,
      dropLocation,
      pickup_location,
      totalKm,
      totalPrice, // Pass totalPrice calculated from findAvailableDrivers2
    } = req.body;

    // Input validation
    if (
      !driverId ||
      !riderId ||
      !dropLocation ||
      !pickup_location ||
      totalKm === undefined ||
      totalPrice === undefined
    ) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            "Driver ID, Rider ID, Drop Location, Pickup Location, Total Kilometers, and Total Price are required"
          )
        );
    }

    // Validate location formats
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

      // Check existence of rider and driver
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

      // Check if rider or driver is already on a ride
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

      // Calculate admin and driver profits based on the total price
      const adminPercentage = process.env.ADMIN_PERCENTAGE; // Admin percentage
      const adminAmount = (adminPercentage / 100) * totalPrice;
      const driverProfit = totalPrice - adminAmount;

      // Generate OTPs
      const pickupOtp = generateOtp();
      const dropOtp = generateOtp();

      // Create new ride details
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
        total_km: Number(totalKm),
        pickup_otp: pickupOtp,
        drop_otp: dropOtp,
        total_amount: totalPrice, // Use totalPrice from findAvailableDrivers2
        admin_percentage: adminPercentage,
        admin_profit: adminAmount,
        driver_profit: driverProfit,
      });

      await newRide.save();

      // await Driver.findByIdAndUpdate(
      //   driverId,
      //   { $inc: { total_earning: driverProfit } } // Increment total_earning by driverProfit
      // );

      // Emit ride details to the rider and driver via Socket.IO
      if (rider.socketId) {
        console.log("emiting accept data to rider", rider.socketId);
        io.to(rider.socketId).emit("rideAccepted", {
          driverId: driver._id,
          riderId: riderId,
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
          riderId: riderId,
          riderLocation: rider.current_location,
          pickupLocation: newRide.pickup_location,
          dropLocation: newRide.drop_location,
          pickupOtp,
          dropOtp,
          totalAmount: newRide.total_amount,
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
    const { driverId, riderId } = req.body;

    // Validate input data
    if (!driverId || !riderId) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, null, "Driver ID and Rider ID are required")
        );
    }

    try {
      const rider = await Rider.findById(riderId);
      const driver = await Driver.findById(driverId);

      // Check existence of rider and driver
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

      // Notify the rider via socket if they have a socket ID
      if (rider.socketId) {
        io.to(rider.socketId).emit("rideRejected", {
          isBooked: false,
          message: "Your ride request has been rejected by the driver",
        });
      }

      // Send success response
      return res
        .status(200)
        .json(new ApiResponse(200, null, "Ride request rejected successfully"));
    } catch (error) {
      console.error("Error rejecting the ride:", error.message);
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to reject the ride"));
    }
  });

// Verify Pickup OTP
export const verifyPickUpOtp = (io) =>
  asyncHandler(async (req, res) => {
    const { rideId, pickupOtp } = req.body;

    if (!rideId || !pickupOtp) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, null, "Ride ID and Pickup OTP are required")
        );
    }

    try {
      // Find the ride, rider, and driver by their IDs
      const ride = await RideDetails.findById(rideId);
      if (!ride) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Ride not found"));
      }

      const rider = await Rider.findById(ride.riderId);
      const driver = await Driver.findById(ride.driverId);

      // Verify the pickup OTP
      if (ride.pickup_otp !== pickupOtp) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Invalid Pickup OTP"));
      }

      // Set the ride status to 'on ride'
      rider.is_on_ride = true;
      rider.current_ride_id = ride._id;
      await rider.save();

      driver.is_on_ride = true;
      driver.current_ride_id = ride._id;
      await driver.save();

      ride.isPickUp_verify = true;
      ride.isRide_started = true;
      ride.started_time = Date.now();
      await ride.save();

      console.log("Rider socket ID:", rider.socketId);
      console.log("Driver socket ID:", driver.socketId);

      // Emit updates to both the rider and driver
      if (rider.socketId) {
        console.log(
          `sendinggggggg data after pickup otp verify to rider ${rider.socketId}`
        );
        io.to(rider.socketId).emit("pickupRider", {
          message: "Pickup OTP verified. Ride is now active.",
          isRide_started: true,
          rideId: ride._id,
        });
      }

      if (driver.socketId) {
        console.log(
          `sendinggggg data after pickup otp verify to driver ${driver.socketId}`
        );
        io.to(driver.socketId).emit("pickupOtpVerifiedToDriver", {
          message: "Pickup OTP verified. Ride is now active.",
          isRide_started: true,
          rideId: ride._id,
        });
      }

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
export const verifyDropOtp = (io) =>
  asyncHandler(async (req, res) => {
    const { rideId, dropOtp } = req.body;

    if (!rideId || !dropOtp) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Ride ID and Drop OTP are required"));
    }

    try {
      // Find the ride, rider, and driver by their IDs
      const ride = await RideDetails.findById(rideId);
      if (!ride) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Ride not found"));
      }

      const rider = await Rider.findById(ride.riderId);
      const driver = await Driver.findById(ride.driverId);

      // Verify the drop OTP
      if (ride.drop_otp !== dropOtp) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Invalid Drop OTP"));
      }

      // Update the rider's status and ride details
      rider.is_on_ride = false;
      rider.current_ride_id = null;
      rider.ride_ids.push(new mongoose.Types.ObjectId(rideId));
      await rider.save();

      // Update the driver's status and ride details
      driver.is_on_ride = false;
      driver.current_ride_id = null;
      driver.ride_ids.push(new mongoose.Types.ObjectId(rideId));
      await driver.save();

      // Update the ride status
      ride.isOn = false;
      ride.isDrop_verify = true;
      ride.isRide_started = false;
      ride.isRide_ended = true;
      ride.ride_end_time = Date.now();
      await ride.save();

      console.log("Rider socket ID:", rider.socketId);
      console.log("Driver socket ID:", driver.socketId);

      // Emit ride completion updates to both the rider and driver
      if (rider.socketId) {
        console.log(`emiting ride completed data to rider, ${rider.socketId}`);
        io.to(rider.socketId).emit("rideVerifyRider", {
          message: "Ride completed and OTP verified",
          isAccept: false,
          isRide_started: false,
          isRide_ended: true,
        });
      }

      if (driver.socketId) {
        console.log(
          `emiting ride completed data to driver, ${driver.socketId}`
        );
        io.to(driver.socketId).emit("rideCompletedToDriver", {
          message: "Ride completed and OTP verified",
          isAccept: false,
          isRide_started: false,
          isRide_ended: true,
        });
      }

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
          isCancel: true,
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

// Update Payment Mode and Driver's Wallet
export const updatePaymentMode = (io) =>
  asyncHandler(async (req, res) => {
    const { rideId, paymentMode } = req.body;

    if (!rideId || !paymentMode) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, null, "Ride ID and Payment Mode are required")
        );
    }

    // Check if paymentMode is valid
    if (!["cash", "online"].includes(paymentMode)) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Invalid payment mode"));
    }

    try {
      // Find the ride details by rideId
      const ride = await RideDetails.findById(rideId);
      if (!ride) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Ride not found"));
      }

      // Get the driverId and riderId from the ride details
      const { driverId, riderId } = ride;

      // Find the driver by driverId
      const driver = await Driver.findById(driverId);
      if (!driver) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Driver not found"));
      }

      // Find the rider by riderId (Optional for validation or other logic)
      const rider = await Rider.findById(riderId);
      if (!rider) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Rider not found"));
      }

      // Update the payment mode in the ride details
      ride.payment_mode = paymentMode;
      await ride.save();

      // Update the driver's wallet based on payment mode
      if (paymentMode === "cash") {
        // Add total amount to the driver's cash wallet
        driver.cash_wallet += ride.total_amount;
      } else if (paymentMode === "online") {
        // Add total amount to the driver's online wallet
        driver.online_wallet += ride.total_amount;
      }

      // Update total earnings of the driver
      driver.total_earning += ride.driver_profit;

      // Save the updated driver details
      await driver.save();

      // Emit updates to the rider and driver (optional)
      if (rider.socketId) {
        io.to(rider.socketId).emit("paymentModeUpdated", {
          message: "Payment mode updated successfully",
          rideId: ride._id,
          paymentMode,
        });
      }

      if (driver.socketId) {
        io.to(driver.socketId).emit("paymentModeUpdated", {
          message: "Payment mode updated successfully",
          rideId: ride._id,
          paymentMode,
        });
      }

      return res
        .status(200)
        .json(new ApiResponse(200, ride, "Payment mode updated successfully"));
    } catch (error) {
      console.error("Error updating payment mode:", error.message);
      return res
        .status(500)
        .json(new ApiResponse(500, null, "Failed to update payment mode"));
    }
  });
