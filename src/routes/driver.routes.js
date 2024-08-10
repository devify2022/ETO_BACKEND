import { Router } from "express";
import { createDriver, getAllDrivers, getDriverById, getDriverRideById, updateDriverProfile, } from "../controllers/driver.controller.js";

const router = Router();

router.route("/createDriver").post(createDriver);
router.route("/").get(getAllDrivers);
router.route("/:id").get(getDriverById);
router.route("/rideDetails/:id").get(getDriverRideById); 
router.route("/update/:id").patch(updateDriverProfile); 

export default router;
