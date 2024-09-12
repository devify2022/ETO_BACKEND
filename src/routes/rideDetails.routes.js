import { Router } from "express";
import {
  createNewRide,
  acceptRide,
} from "../controllers/rideDetailsController.js";

const router = Router();

const createRouterWithSocket = (io) => {
  router.route("/createRide").post(createNewRide(io));
  router.route("/acceptRide").post(acceptRide(io));
  return router;
};

export default createRouterWithSocket;
