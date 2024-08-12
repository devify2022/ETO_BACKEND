import { Router } from "express";
import { getRiderById, getRiderRideById } from "../controllers/riderController.js";
import { createNewRide } from "../controllers/rideDetailsController.js";

const router = Router();


router.route("/createRide").post(createNewRide);
router.route("/:id").get(getRiderById);
router.route("/rideDetails/:id").get(getRiderRideById);

export default router;