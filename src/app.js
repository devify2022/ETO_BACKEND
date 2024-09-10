import express from "express";
import cors from "cors";
import errorHandler from "./middlewares/errorMiddleware.js";
import rateLimitMiddleware from "./middlewares/rateLimitMiddleware.js";

const app = express();

// Apply CORS middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// Apply rate limiting middleware
app.use(rateLimitMiddleware);

// Parse JSON and URL-encoded data
app.use(
  express.json({
    limit: "16kb",
  })
);
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Serve static files from the "public" directory
app.use(express.static("public"));

// Import and use routes
import userRouter from "./routes/user.routes.js";
import driverRouter from "./routes/driver.routes.js";
import riderRouter from "./routes/rider.routes.js";
import rideDetailsRouter from "./routes/ride.routes.js";
import etoRouter from "./routes/eto.routes.js";
import paymentRouter from "./routes/payment.routes.js";

// Route declarations
app.use("/eto/api/v1/auth", userRouter);
app.use("/eto/api/v1/driver", driverRouter);
app.use("/eto/api/v1/rider", riderRouter);
app.use("/eto/api/v1/rides", rideDetailsRouter);
app.use("/eto/api/v1/eto", etoRouter);
// Payment routes should be reviewed; uncomment if needed
// app.use("/eto/api/v1/eto", paymentRouter);
app.use("/", paymentRouter);

// Home route
app.get("/", (req, res) => {
  res.send("Welcome to ETO API!");
});

// Apply error handling middleware after all routes
app.use(errorHandler);

export { app };
