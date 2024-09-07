import express from "express";
import cors from "cors";
import errorHandler from "./middlewares/errorMiddleware.js";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "16kb",
  })
);

app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

// routes import
import userRouter from "./routes/user.routes.js";
import driverRouter from "./routes/driver.routes.js";
import riderRouter from "./routes/rider.routes.js";
import rideDetailsRouter from "./routes/ride.routes.js";
import etoRouter from "./routes/eto.routes.js";

// routes declaration
app.use("/eto/api/v1/auth", userRouter);
app.use("/eto/api/v1/driver", driverRouter);
app.use("/eto/api/v1/rider", riderRouter);
app.use("/eto/api/v1/rides", rideDetailsRouter);
app.use("/eto/api/v1/eto", etoRouter);

app.get("/", (req, res) => {
  res.send("Welcome to ETO API!");
});

// Error handling middleware
app.use(errorHandler);

export { app };
// https://localhost:8000/api/v1/users/register
