import { Router } from "express";
import {
  getAllRiders,
  getRiderById,
  getRiderRideById,
  getRiderRideHistory,
  updateRiderProfile,
} from "../controllers/riderController.js";

const router = Router();

router.route("/").get(getAllRiders);
router.route("/:id").get(getRiderById);
router.route("/rideDetails/:id").get(getRiderRideById);
router.route("/update/:id").patch(updateRiderProfile);
router.get("/rideHistory/:id", getRiderRideHistory);

export default router;
