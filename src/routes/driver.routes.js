import { Router } from "express";
import {
  activateDriver,
  createDriver,
  deactivateDriver,
  deleteDriver,
  getAllActiveDrivers,
  getAllDrivers,
  getCurrentRide,
  getDriverById,
  getDriverRideById,
  getRideHistory,
  updateDriverProfile,
} from "../controllers/driver.controller.js";

const router = Router();

// Place the more specific routes before the dynamic ones
router.route("/createDriver").post(createDriver);
router.route("/active").get(getAllActiveDrivers);
router.route("/activate/:id").put(activateDriver);
router.route("/deactivate/:id").put(deactivateDriver);
router.route("/delete/:id").delete(deleteDriver);
router.route("/").get(getAllDrivers);
router.route("/rideDetails/:id").get(getDriverRideById);
router.route("/update/:id").patch(updateDriverProfile);
router.route("/currentRide/:id").get(getCurrentRide);
router.route("/rideHistory/:id").get(getRideHistory);

// The dynamic ID route should be last to avoid conflicts
router.route("/:id").get(getDriverById);

export default router;
