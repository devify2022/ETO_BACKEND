import { asyncHandler } from "../utils/asyncHandler.js";
import { Driver } from "../models/driver.model.js";
import { User } from "../models/user.model.js";
import { RideDetails } from "../models/rideDetails.model.js";
import { ETOCard } from "../models/eto.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

// Create Driver Function
export const createDriver = asyncHandler(async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Phone number is required"));
  }

  try {
    const existsUser = await User.findOne({ phone });
    if (!existsUser || !existsUser.isDriver) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            null,
            "User does not exist or is not marked as a driver"
          )
        );
    }

    const existsDriver = await Driver.findOne({ phone });
    if (existsDriver) {
      return res
        .status(200)
        .json(new ApiResponse(200, null, "Driver already exists"));
    }

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
        aadhar_number: req.body.aadhar_number,
        driver_photo: req.body.driver_photo,
        car_photo: req.body.car_photo,
      },
      eto_id_num: req.body.eto_id_num,
      helpLine_num: req.body.helpLine_num,
    };

    const newETOCard = new ETOCard(etoCardData);
    const savedETOCard = await newETOCard.save();

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { driver: savedDriver, etoCard: savedETOCard },
          "Driver and ETOCard created successfully"
        )
      );
  } catch (error) {
    console.error("Error creating driver:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to create driver"));
  }
});

// Get All Drivers Function
export const getAllDrivers = asyncHandler(async (req, res) => {
  try {
    const drivers = await Driver.find();
    return res
      .status(200)
      .json(new ApiResponse(200, drivers, "Drivers retrieved successfully"));
  } catch (error) {
    console.error("Error retrieving drivers:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to retrieve drivers"));
  }
});

// Get Driver by ID Function
export const getDriverById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Driver ID is required"));
  }

  try {
    const driver = await Driver.findById(id);
    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, driver, "Driver retrieved successfully"));
  } catch (error) {
    console.error("Error retrieving driver:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to retrieve driver"));
  }
});

// Get Driver Ride by ID Function
export const getDriverRideById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Driver ID is required"));
  }

  try {
    const rides = await RideDetails.find({ driverId: id });
    if (!rides || rides.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, rides, "Driver rides retrieved successfully"));
  } catch (error) {
    console.error("Error retrieving driver rides:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to retrieve driver rides"));
  }
});

// Update Driver Profile Function
export const updateDriverProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Driver ID is required"));
  }

  delete req.body.phone;

  try {
    const driver = await Driver.findByIdAndUpdate(id, req.body, { new: true });
    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, driver, "Driver profile updated successfully")
      );
  } catch (error) {
    console.error("Error updating driver profile:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to update driver profile"));
  }
});
