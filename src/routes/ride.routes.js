import { Router } from "express";
import { getRiderById, getRiderRideById } from "../controllers/riderController.js";

const router = Router();


router.route("/:id").get(getRiderById);
router.route("/rideDetails/:id").get(getRiderRideById);

export default router;