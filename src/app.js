import express from "express";
import http from "http";
import cors from "cors";
import errorHandler from "./middlewares/errorMiddleware.js";
import rateLimitMiddleware from "./middlewares/rateLimitMiddleware.js";
import { setupSocketIO } from "./socket.js"; // Import the Socket.IO setup

// Initialize Express app
const app = express();

// Create HTTP server and attach Express app
const server = http.createServer(app);

// Initialize Socket.IO by passing the server
const io = setupSocketIO(server);

app.use(
  cors({
    origin: "http://localhost:8081", // Set your React app origin
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

// Error handling middleware
app.use(errorHandler);

// Export server and app
export { app, server };

// Start the server
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Socket is running on http://192.168.31.227:${PORT}`);
});
