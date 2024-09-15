import { Router } from "express";
import {
  // createNewRide,
  acceptRide,
  findAvailableDrivers, // Import the findAvailableDrivers controller
} from "../controllers/rideDetailsController.js"; // Ensure the correct file path

const router = Router();

// Wrap the routes with Socket.io (io)
const createRouterWithSocket = (io) => {
  // Create a new ride route
  // router
  //   .route("/createRide")
  //   .post((req, res, next) => createNewRide(io)(req, res, next));

  // Accept a ride route
  router
    .route("/acceptRide")
    .post((req, res, next) => acceptRide(io)(req, res, next));

  // Route to find available drivers near the rider
  router
    .route("/findDrivers")
    .post((req, res, next) => findAvailableDrivers(io)(req, res, next));

  return router;
};

export default createRouterWithSocket;
