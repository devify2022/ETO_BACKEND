import { Router } from "express";
import {
  getAllRiders,
  getRiderById,
  getRiderRideById,
  updateRiderProfile,
} from "../controllers/riderController.js";

const router = Router();

router.route("/").get(getAllRiders);
router.route("/:id").get(getRiderById);
router.route("/rideDetails/:id").get(getRiderRideById);
router.route("/update/:id").patch(updateRiderProfile);

export default router;
