import { Router } from "express";
import {
  acceptRide,
  cancelRide,
  findAvailableDrivers,
  verifyDropOtp,
  verifyPickUpOtp,
} from "../controllers/rideDetailsController.js"; // Ensure the correct file path

const createRouterWithSocket = (io) => {
  const router = Router();

  router
    .route("/acceptRide")
    .post((req, res, next) => acceptRide(io)(req, res, next));

  router
    .route("/rejectRide")
    .delete((req, res, next) => rejectRide(io)(req, res, next));
  router
    .route("/findDrivers")
    .post((req, res, next) => findAvailableDrivers(io)(req, res, next));

  router
    .route("/verify-pickup-otp")
    .patch((req, res, next) => verifyPickUpOtp(io)(req, res, next));
  router
    .route("/verify-drop-otp")
    .patch((req, res, next) => verifyDropOtp(io)(req, res, next));
  router
    .route("/cancel-ride")
    .delete((req, res, next) => cancelRide(io)(req, res, next));

  return router;
};

export default createRouterWithSocket;
