import { Server } from "socket.io";
import { Driver } from "./models/driver.model.js";
import { Rider } from "./models/rider.model.js";
import { RideDetails } from "./models/rideDetails.model.js";

export const setupSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://192.168.31.227:8081", // Set your React app origin
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

        console.log(`Emitting location to driver socket: ${driver.socketId}`);
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

    // Accept Ride Event
    socket.on("acceptRide", async (data) => {
      // console.log(data);
      const { rideId, driverId } = data;

      // console.log(data);

      if (!rideId || !driverId) {
        return socket.emit("error", {
          message: "Ride ID and Driver ID are required",
        });
      }

      try {
        // Update ride status in the database
        await RideDetails.findByIdAndUpdate(
          rideId,
          { driverId, isRide_accept: true, isOn: true },
          { new: true }
        );
      } catch (error) {
        console.error("Error starting ride:", error.message);
        socket.emit("error", { message: "Failed to start ride" });
      }
    });

    // Emit driver location to rider after ride acceptance
    socket.on("driverLocationUpdateAfterAccept", async (data) => {
      const {
        driverLocation,
        riderId,
        riderLocation,
        pickupLocation,
        dropLocation,
      } = data;
      // console.log("hello location update data", data);

      if (riderId) {
        try {
          const rider = await Rider.findById(riderId);
          if (rider?.socketId) {
            console.log(
              `Emittinggggggggggggggggggggggggggggggggg location to rider socket: ${rider.socketId}`
            );
            io.to(rider.socketId).emit("driverLocationUpdate", {
              driverLocation: driverLocation,
              riderLocation: riderLocation,
              pickupLocation: pickupLocation,
              dropLocation: dropLocation,
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

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`Socket ${socket.id} disconnected`);

      try {
        // Find the driver by socketId and remove the socketId when disconnected
        await Driver.findOneAndUpdate(
          { socketId: socket.id },
          { socketId: null }
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
