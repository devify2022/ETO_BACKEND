import { asyncHandler } from "../utils/asyncHandler.js";
import { Driver } from "../models/driver.model.js";
import { User } from "../models/user.model.js";
import { RideDetails } from "../models/rideDetails.model.js";
import { ETOCard } from "../models/eto.model.js";

export const createDriver = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ message: "Phone number is required" });
  }

  try {
    const existsUser = await User.findOne({ phone });
    const existsDriver = await Driver.findOne({ phone });

    if (existsUser && existsUser.isDriver) {
      if (existsDriver) {
        return res.status(200).json({ message: "Driver already exists" });
      } else {
        const driverData = { ...req.body, userId: existsUser._id };
        const newDriver = new Driver(driverData);
        const savedDriver = await newDriver.save();

        const etoCardData = {
          driverId: savedDriver._id,
          id_details: {
            name: existsUser.name,
            email: existsUser.email,
            village: req.body.village,
            police_station: req.body.police_station,
            landmark: req.body.landmark,
            post_office: req.body.post_office,
            district: req.body.district,
            pin_code: req.body.pin_code,
            adhar_number: req.body.adhar_number,
            driver_photo: req.body.driver_photo,
            car_photo: req.body.car_photo,
          },
          eto_id_num: req.body.eto_id_num,
          helpLine_num: req.body.helpLine_num,
        };

        const newETOCard = new ETOCard(etoCardData);
        const savedETOCard = await newETOCard.save();

        return res.status(201).json({
          message: "Driver and ETOCard created successfully",
          driver: savedDriver,
          etoCard: savedETOCard,
        });
      }
    } else {
      return res.status(400).json({
        message: "User does not exist or is not marked as a driver",
      });
    }
  } catch (error) {
    console.error("Error creating driver:", error.message);
    return res.status(500).json({ message: "Failed to create driver" });
  }
});

export const getAllDrivers = asyncHandler(async (req, res) => {
  try {
    const drivers = await Driver.find(); // Fetch all drivers from the database

    return res.status(200).json({
      message: "Drivers retrieved successfully",
      drivers,
    });
  } catch (error) {
    console.error("Error retrieving drivers:", error.message);
    return res.status(500).json({ message: "Failed to retrieve drivers" });
  }
});

export const getDriverById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Driver ID is required" });
  }

  try {
    const driver = await Driver.findById(id);

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    return res.status(200).json({
      message: "Driver retrieved successfully",
      driver,
    });
  } catch (error) {
    console.error("Error retrieving driver:", error.message);
    return res.status(500).json({ message: "Failed to retrieve driver" });
  }
});

export const getDriverRideById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Driver ID is required" });
  }

  try {
    const driver = await RideDetails.find({ driverId: id });

    if (!driver || driver.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    return res.status(200).json({
      message: "Driver retrieved successfully",
      driver,
    });
  } catch (error) {
    console.error("Error retrieving driver:", error.message);
    return res.status(500).json({ message: "Failed to retrieve driver" });
  }
});

export const updateDriverProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Driver ID is required" });
  }

  delete req.body.phone;

  try {
    const driver = await Driver.findByIdAndUpdate(id, req.body, { new: true });

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    return res.status(200).json({
      message: "Driver profile updated successfully",
      driver,
    });
  } catch (error) {
    console.error("Error updating driver profile:", error.message);
    console.error(error);
    return res.status(500).json({ message: "Failed to update driver profile" });
  }
});
