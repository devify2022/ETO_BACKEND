import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import errorHandler from "./middlewares/errorMiddleware.js";
import rateLimitMiddleware from "./middlewares/rateLimitMiddleware.js";
import { RideDetails } from "./models/rideDetails.model.js"; 

// Initialize Express app
const app = express();

// Create HTTP server and attach Express app
const server = http.createServer(app);

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },
});

// Middleware configurations
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
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

// Use routes
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

// Error handling middleware
app.use(errorHandler);

// Set up Socket.IO event listeners
io.on("connection", (socket) => {
  console.log("A user connected");

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

      if (ride) {
        // Notify all clients that the ride has started
        io.emit("rideStarted", { rideId, driverId });
        console.log(`Ride started by driver ${driverId}`);
      } else {
        socket.emit("error", { message: "Ride not found" });
      }
    } catch (error) {
      console.error("Error starting ride:", error.message);
      socket.emit("error", { message: "Failed to start ride" });
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

export { app, server };
