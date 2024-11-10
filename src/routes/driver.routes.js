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
  getRecentRides,
  getTotalEarningByDate,
  getTotalWithdrawalsByDate,
  createWithdrawalLogs,

} from "../controllers/driver.controller.js";
import { getETOCardById } from "../controllers/etoController.js";

const router = Router();

// Place the more specific routes before the dynamic ones
router.route("/createDriver").post(createDriver);
router.route("/createWithdrawlLogs").post(createWithdrawalLogs);
router.route("/active").get(getAllActiveDrivers);
router.route("/eto-card/:id").get(getETOCardById);
router.route("/activate/:id").put(activateDriver);
router.route("/deactivate/:id").put(deactivateDriver);
router.route("/delete/:id").delete(deleteDriver);
router.route("/").get(getAllDrivers);
router.route("/rideDetails/:id").get(getDriverRideById);
router.route("/update/:id").patch(updateDriverProfile);
router.route("/currentRide/:id").get(getCurrentRide);
router.route("/rideHistory/:id").get(getRideHistory);
router.route("/getTotalWithdrawalsByDate").post(getTotalWithdrawalsByDate);

// The dynamic ID route should be last to avoid conflicts
router.route("/getRecentRides/:id").get(getRecentRides);
router.route("/getTotalEarningByDate").get(getTotalEarningByDate);
router.route("/:id").get(getDriverById);

export default router;
