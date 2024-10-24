import { Router } from "express";
import {
  acceptRide,
  acceptRide2,
  cancelRide,
  findAvailableDrivers,
  findAvailableDrivers2,
  verifyDropOtp,
  verifyPickUpOtp,
} from "../controllers/rideDetailsController.js"; // Ensure the correct file path

const createRouterWithSocket = (io) => {
  const router = Router();

  router
    .route("/acceptRide")
    .post((req, res, next) => acceptRide(io)(req, res, next));
  
    router
    .route("/acceptRide2")
    .post((req, res, next) => acceptRide2(io)(req, res, next));

  router
    .route("/rejectRide")
    .delete((req, res, next) => rejectRide(io)(req, res, next));
  router
    .route("/findDrivers")
    .post((req, res, next) => findAvailableDrivers(io)(req, res, next));

    // FIX: No need to pass `io` to `findAvailableDrivers`
  router
  .route("/findDrivers2")
  .get(findAvailableDrivers2); // Using it directly without `io`

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
