import { Router } from "express";
import {
  createDriver,
  getAllDrivers,
  getCurrentRide,
  getDriverById,
  getDriverRideById,
  getRideHistory,
  updateDriverProfile,
} from "../controllers/driver.controller.js";

const router = Router();

router.route("/createDriver").post(createDriver);
router.route("/").get(getAllDrivers);
router.route("/:id").get(getDriverById);
router.route("/rideDetails/:id").get(getDriverRideById);
router.route("/update/:id").patch(updateDriverProfile);
router.route("/currentRide/:id").get(getCurrentRide);
router.route("/rideHistory/:id").get(getRideHistory);

export default router;
