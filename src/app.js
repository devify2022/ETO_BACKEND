import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import errorHandler from "./middlewares/errorMiddleware.js";
import rateLimitMiddleware from "./middlewares/rateLimitMiddleware.js";
import { Driver } from "./models/driver.model.js";
import { Rider } from "./models/rider.model.js";
import { RideDetails } from "./models/rideDetails.model.js";


// Initialize Express app
const app = express();

// Create HTTP server and attach Express app
const server = http.createServer(app);

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Set your React app origin
    credentials: true,
  },
});

app.use(
  cors({
    origin: "http://localhost:3000", // Set your React app origin
    credentials: true,
  })
);

// Other middleware and route setup
app.use(rateLimitMiddleware);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

// Import and use routes
import userRouter from "./routes/user.routes.js";
import driverRouter from "./routes/driver.routes.js";
import riderRouter from "./routes/rider.routes.js";
import createRideDetailsRouter from "./routes/rideDetails.routes.js";
import etoRouter from "./routes/eto.routes.js";
import paymentRouter from "./routes/payment.routes.js";

app.use("/eto/api/v1/auth", userRouter);
app.use("/eto/api/v1/driver", driverRouter);
app.use("/eto/api/v1/rider", riderRouter);
app.use("/eto/api/v1/rides", createRideDetailsRouter(io));
app.use("/eto/api/v1/eto", etoRouter);
app.use("/", paymentRouter);

// Home route
app.get("/", (req, res) => {
  res.send("Welcome to ETO API!");
});

// Socket.IO connection setup
let socketInstance = null;

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  socketInstance = socket;

  // Listen for event where driver registers their socketId
  socket.on("registerDriver", async (data) => {
    const { driverId } = data;

    if (!driverId) {
      return socket.emit("error", { message: "Driver ID is required" });
    }

    try {
      // Update the driver's socketId in the database
      await Driver.findByIdAndUpdate(driverId, { socketId: socket.id });
      console.log(`Driver ${driverId} connected with socket ${socket.id}`);
    } catch (error) {
      console.error("Error updating driver's socketId:", error.message);
      socket.emit("error", { message: "Failed to register driver" });
    }
  });

  // Listen for event where rider registers their socketId
  socket.on("registerRider", async (data) => {
    const { riderId } = data;

    if (!riderId) {
      return socket.emit("error", { message: "Rider ID is required" });
    }

    try {
      // Update the rider's socketId in the database
      await Rider.findByIdAndUpdate(riderId, { socketId: socket.id });
      console.log(`Rider ${riderId} connected with socket ${socket.id}`);
    } catch (error) {
      console.error("Error updating rider's socketId:", error.message);
      socket.emit("error", { message: "Failed to register rider" });
    }
  });

  // Handle the 'acceptRide' event
  socket.on("acceptRide", async (data) => {
    const { rideId, driverId } = data;

    if (!rideId || !driverId) {
      return socket.emit("error", {
        message: "Ride ID and Driver ID are required",
      });
    }

    try {

      // Update ride status in the database
      const ride = await RideDetails.findByIdAndUpdate(
        rideId,
        { driverId, isRide_started: true, started_time: new Date() },
        { new: true }
      );

      if (ride && ride.riderId) {
        // Fetch the rider's socketId
        const rider = await Rider.findById(ride.riderId);
        const riderSocketId = rider.socketId;

        if (riderSocketId) {
          // Notify the rider about the ride acceptance
          io.to(riderSocketId).emit("rideAccepted", {
            driverId,
            rideId,
            message: "Your ride has been accepted.",
          });
          console.log(
            `Ride accepted by driver ${driverId}. Notified rider ${rider._id}`
          );
        } else {
          console.error("Rider socketId not found");
          socket.emit("error", { message: "Rider not connected" });
        }
      } else {
        socket.emit("error", { message: "Ride not found" });
      }
    } catch (error) {
      console.error("Error starting ride:", error.message);
      socket.emit("error", { message: "Failed to start ride" });
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
    socketInstance = null;
  });

  // Ping Pong Pattern
  socket.emit("pong", "akter");

  socket.on("addition", (arg1, arg2, callback) => {
    callback({ result: arg1 + arg2 });
  });
});

// Ping endpoint
app.post("/send-ping", (req, res) => {
  if (socketInstance) {
    socketInstance.emit("ping", "ping from server");
    res.status(200).send("ping sent");
  } else {
    res.status(500).send("No socket instance");
  }
});

// Error handling middleware
app.use(errorHandler);

// Export server and app
export { app, server };

// Start the server
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Socket is running on http://localhost:${PORT}`);
});
