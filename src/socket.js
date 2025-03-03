import { Server } from "socket.io";
import { Driver } from "./models/driver.model.js";
import { Rider } from "./models/rider.model.js";
import { RideDetails } from "./models/rideDetails.model.js";
import geolib from "geolib";
// import { getEstimatedTime } from "./utils/getlocation.js";

export const setupSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: ["http://192.168.1.3:8081"], // Set your React app origin
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // console.log("A user connected:", socket.id);

    // Register Driver Socket ID with location update and isActive check
    socket.on("registerDriver", async (data) => {
      // console.log(data)
      const { driverId, lat, lng } = data;
      if (!driverId || !lat || !lng) {
        return socket.emit("error", {
          message: "Driver ID and location required",
        });
      }

      try {
        const driver = await Driver.findById(driverId);
        if (!driver) {
          return socket.emit("error", { message: "Driver not found" });
        }

        // console.log(`Emitting location to driver socket: ${driver.socketId}`);
        io.to(driver.socketId).emit("driverLocation", {
          driverId,
          location: { lat, lng },
          message: "Driver's location updated",
        });

        const ride = await RideDetails.findOne({
          driverId,
          isRide_started: true,
        });

        if (driver.isActive) {
          await Driver.findByIdAndUpdate(driverId, {
            socketId: socket.id,
            current_location: {
              type: "Point",
              coordinates: [lng, lat],
            },
          });

          console.log(
            `Driver ${driverId} connected with socket ${socket.id} and location updated`
          );

          // Emit driver's updated location to the rider (if a ride is ongoing)
        } else {
          // console.log(`Driver ${driverId} is not active, location not updated`);
          return socket.emit("error", {
            message: "Driver is not active, cannot update location",
          });
        }
      } catch (error) {
        console.error(
          "Error updating driver's socketId or location:",
          error.message
        );
        socket.emit("error", {
          message: "Failed to register driver and update location",
        });
      }
    });

    // Register Rider Socket ID with location update
    socket.on("registerRider", async (data) => {
      // console.log(data);
      const { riderId, lat, lng } = data;

      if (!riderId || !lat || !lng) {
        return socket.emit("error", {
          message: "Rider ID and location required",
        });
      }

      try {
        await Rider.findByIdAndUpdate(riderId, {
          socketId: socket.id,
          current_location: {
            type: "Point",
            coordinates: [lng, lat],
          },
        });
        // console.log(
        //   `Rider ${riderId} connected with socket ${socket.id} and location updated`
        // );

        // Emit rider's updated location to the driver (if a ride is ongoing)
        const ride = await RideDetails.findOne({
          riderId,
          isRide_started: true,
        });
        if (ride && ride.driverId) {
          const driver = await Driver.findById(ride.driverId);
          if (driver && driver.socketId) {
            io.to(driver.socketId).emit("riderLocationUpdate", {
              riderId,
              location: { lat, lng },
              message: "Rider's location updated",
            });
          }
        }
      } catch (error) {
        console.error(
          "Error updating rider's socketId or location:",
          error.message
        );
        socket.emit("error", {
          message: "Failed to register rider and update location",
        });
      }
    });

    // Handle driver selection
    // Handle driver selection with details
    socket.on("selectDriverWithDetails", async (rideDetails) => {
      const {
        driverId,
        riderId,
        pickUpLocation,
        dropLocation,
        totalKmPickupToDrop,
        totalPrice,
        distanceToPickup,
        estimatedTimeToPickup,
      } = rideDetails;

      try {
        // Fetch driver and check if they are available to accept the ride
        const driver = await Driver.findById(driverId);
        if (driver && driver.isActive && !driver.is_on_ride) {
          // console.log("Emiting send request", driver.socketId);
          io.to(driver.socketId).emit("rideRequest", {
            riderId,
            pickUpLocation,
            dropLocation,
            totalKmPickupToDrop,
            totalPrice,
            distanceToPickup,
            estimatedTimeToPickup,
          });

          // Confirm selection to the rider
          socket.emit("driverSelected", {
            success: true,
            message: "Driver selected successfully",
          });
        } else {
          socket.emit("driverSelected", {
            success: false,
            message: "Driver is not available",
          });
        }
      } catch (error) {
        console.error("Error selecting driver:", error.message);
        socket.emit("error", { message: "Failed to select driver" });
      }
    });

    // Emit available drivers' location when requested
    socket.on("sendAvailableDriversLocation", async (data) => {
      const { riderId } = data;

      try {
        const rider = await Rider.findById(riderId);
        if (rider?.socketId) {
          const drivers = await Driver.find({
            isActive: true,
            is_on_ride: false,
          });
          io.to(rider.socketId).emit("availableDriversLocation", {
            drivers: drivers.map((driver) => ({
              driverId: driver._id,
              location: driver.current_location.coordinates,
              name: driver.name,
            })),
            message: "Updated available drivers sent to rider",
          });
        }
      } catch (error) {
        console.error("Error sending drivers' location:", error.message);
        socket.emit("error", {
          message: "Failed to send available drivers' location",
        });
      }
    });

    // Accept Ride Event
    socket.on("acceptRide", async (data) => {
      // console.log(data);
      const { rideId, riderId, driverId } = data;
      if (!rideId || !riderId || !driverId) {
        return socket.emit("error", {
          message: "Ride ID and Driver ID are required",
        });
      }

      try {
        await RideDetails.findByIdAndUpdate(
          rideId,
          { driverId, isRide_accept: true, isOn: true },
          { new: true }
        );

        const rider = await Rider.findById(riderId);
        // console.log("Emiting accept status to rider", rider.socketId);
        io.to(rider.socketId).emit("rideStatus", {
          isBooked: true,
          message: "Booking request accepted. Ride successfully booked.",
        });
      } catch (error) {
        console.error("Error accepting ride:", error.message);
        socket.emit("error", { message: "Failed to accept ride" });
      }
    });

    // Emit driver location to rider after ride acceptance
    socket.on("driverLocationUpdateAfterAccept", async (data) => {
      // console.log("Received data:", data);

      const {
        driverLocation,
        riderId,
        riderLocation,
        pickupLocation,
        dropLocation,
      } = data;

      if (!pickupLocation || !dropLocation) {
        console.error("Pickup or Drop Location is missing");
        return;
      }

      // console.log("Pickup Location:", pickupLocation);
      // console.log("Drop Location:", dropLocation);

      if (riderId) {
        try {
          const rider = await Rider.findById(riderId);

          if (rider?.socketId) {
            // Calculate distance in meters from driver location to rider location
            const driverToRiderDistanceMeters = geolib.getDistance(
              {
                latitude: driverLocation.latitude,
                longitude: driverLocation.longitude,
              },
              {
                latitude: riderLocation.coordinates[1], // riderLocation is [longitude, latitude]
                longitude: riderLocation.coordinates[0],
              }
            );

            console.log(
              "Driver Distance to Rider (meters):",
              driverToRiderDistanceMeters
            );

            // Convert distance to kilometers
            const driverToRiderDistanceKm = driverToRiderDistanceMeters / 1000;
            console.log(
              "Driver Distance to Rider (kilometers):",
              driverToRiderDistanceKm
            );

            const averageSpeed = 40; // km/h
            const estimatedTimeToRiderHours =
              driverToRiderDistanceKm / averageSpeed;
            const estimatedTimeToRiderMinutes = estimatedTimeToRiderHours * 60;

            console.log(
              "Estimated Time to Rider (minutes):",
              estimatedTimeToRiderMinutes.toFixed(2)
            );

            io.to(rider.socketId).emit("driverLocationUpdate", {
              driverLocation,
              riderLocation,
              pickupLocation,
              dropLocation,
              estimatedTimeToRider:
                estimatedTimeToRiderMinutes.toFixed(2) + " mins",
              message: "Driver's location after ride acceptance",
            });
          }
        } catch (error) {
          console.error(
            "Error finding rider or emitting location:",
            error.message
          );
          socket.emit("error", {
            message: "Failed to emit driver location to rider",
          });
        }
      }
    });

    // Listen for 'canceltime' event
    socket.on("canceltime", async ({ rideId, canceltime }) => {
      console.log(`Canceltime event received for ride ID: ${rideId}`);

      try {
        // Update the isCancel_time field in the database
        const ride = await RideDetails.findByIdAndUpdate(
          rideId,
          { isCancel_time: canceltime },
          { new: true } // Return the updated document
        );

        if (ride) {
          console.log("Ride cancel time updated successfully:", ride);
          // Optionally broadcast the update to other users (e.g., admin or driver)
          socket.broadcast.emit("rideStatusUpdated", {
            rideId,
            status: "canceled",
          });
        } else {
          console.log("Ride not found for the provided ID");
        }
      } catch (error) {
        console.error("Error updating ride:", error.message);
      }
    });

    // On socket "send_location" event=============================================================
    // socket.on("send_location", async (locationData) => {
    //   const { rideId, driverLocation } = locationData;
    //   console.log("Location Data", locationData);

    //   try {
    //     // Fetch the ride details from the database using rideId
    //     const rideDetails = await RideDetails.findById(rideId);
    //     if (!rideDetails) {
    //       socket.emit("error", { message: "Ride not found" });
    //       return;
    //     }

    //     // Fetch the rider details using riderId from rideDetails
    //     const rider = await Rider.findById(rideDetails.riderId);
    //     if (!rider) {
    //       socket.emit("error", { message: "Rider not found" });
    //       return;
    //     }

    //     const riderSocketId = rider.socketId; // Assuming the rider model stores the socketId

    //     // Extract the drop location from the ride details
    //     const dropLocation = {
    //       lat: rideDetails.drop_location.coordinates[1], // Correct order: latitude first
    //       lng: rideDetails.drop_location.coordinates[0], // longitude second
    //     };

    //     // Format driver's location for API
    //     const formattedDriverLocation = {
    //       lat: driverLocation.latitude,
    //       lng: driverLocation.longitude,
    //     };

    //     // Calculate the estimated time from the driver's current location to the drop location
    //     const estimatedTimeToDrop = await getEstimatedTime(
    //       formattedDriverLocation,
    //       dropLocation
    //     );

    //     // Emit the updated data to the rider's socket
    //     io.to(riderSocketId).emit("estimatedTimeToDrop", {
    //       estimatedTimeToDrop,
    //       message: "Estimated time to drop updated",
    //     });
    //   } catch (error) {
    //     console.error("Error calculating estimated time:", error.message);
    //     socket.emit("error", { message: "Unable to calculate estimated time" });
    //   }
    // });

    //=============================================================

    // On socket "send_location" event
    socket.on("send_location", async (locationData) => {
      const { rideId, driverLocation } = locationData;
      console.log("Location Data", locationData);

      try {
        // Fetch the ride details from the database using rideId
        const rideDetails = await RideDetails.findById(rideId);
        if (!rideDetails) {
          socket.emit("error", { message: "Ride not found" });
          return;
        }

        // Fetch the rider details using riderId from rideDetails
        const rider = await Rider.findById(rideDetails.riderId);
        if (!rider) {
          socket.emit("error", { message: "Rider not found" });
          return;
        }

        const riderSocketId = rider.socketId; // Assuming the rider model stores the socketId

        // Extract the drop location from the ride details
        const dropLocation = {
          lat: rideDetails.drop_location.coordinates[1], // Correct order: latitude first
          lng: rideDetails.drop_location.coordinates[0], // longitude second
        };

        // Format driver's location for distance calculation
        const formattedDriverLocation = {
          lat: driverLocation.latitude,
          lng: driverLocation.longitude,
        };

        // Calculate the distance in meters from driver to drop location
        const driverToDropDistanceMeters = geolib.getDistance(
          {
            latitude: formattedDriverLocation.lat,
            longitude: formattedDriverLocation.lng,
          },
          {
            latitude: dropLocation.lat,
            longitude: dropLocation.lng,
          }
        );

        // Convert distance to kilometers
        const driverToDropDistanceKm = driverToDropDistanceMeters / 1000;
        console.log(
          "Driver Distance to Drop Location (kilometers):",
          driverToDropDistanceKm
        );

        // Average speed in km/h (you can adjust this based on your needs)
        const averageSpeed = 40; // km/h

        // Calculate the estimated time in hours
        const estimatedTimeToDropHours = driverToDropDistanceKm / averageSpeed;
 
        // Convert hours to minutes
        const estimatedTimeToDropMinutes = estimatedTimeToDropHours * 60;

        console.log(
          "Estimated Time to Drop Location (minutes):",
          estimatedTimeToDropMinutes.toFixed(2)
        );

        // Emit the updated data to the rider's socket
        io.to(riderSocketId).emit("estimatedTimeToDrop", {
          estimatedTimeToDrop: estimatedTimeToDropMinutes.toFixed(2) + " mins",
          message: "Estimated time to drop updated",
        });
      } catch (error) {
        console.error("Error calculating estimated time:", error.message);
        socket.emit("error", { message: "Unable to calculate estimated time" });
      }
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`Socket ${socket.id} disconnected`);

      try {
        // Find the driver by socketId and remove the socketId when disconnected
        await Driver.findOneAndUpdate(
          { socketId: socket.id },
          { socketId: null ,isActive:false}
        );
        console.log(`Driver with socket ${socket.id} disconnected`);
      } catch (error) {
        console.error("Error removing driver's socketId:", error.message);
      }
    });

    // Test event for addition
    socket.on("addition", (arg1, arg2, callback) => {
      callback({ result: arg1 + arg2 });
    });
  });

  return io;
};
