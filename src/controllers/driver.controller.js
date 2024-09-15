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
    throw new ApiError(400, "Phone number is required");
  }

  try {
    // Check if the user exists and is marked as a driver
    const existsUser = await User.findOne({ phone });
    if (!existsUser || !existsUser.isDriver) {
      throw new ApiError(
        400,
        "User does not exist or is not marked as a driver"
      );
    }

    // Check if the driver already exists
    const existsDriver = await Driver.findOne({ phone });
    if (existsDriver) {
      return res
        .status(200)
        .json(new ApiResponse(200, null, "Driver already exists"));
    }

    // Create a new driver
    const driverData = { ...req.body, userId: existsUser._id };
    const newDriver = new Driver(driverData);
    const savedDriver = await newDriver.save();

    // Create a new ETOCard
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
    // If the error is an ApiError, use its status code and message
    if (error instanceof ApiError) {
      return res
        .status(error.statusCode)
        .json(new ApiResponse(error.statusCode, null, error.message));
    }

    // For any other errors, return a generic message
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
    throw new ApiError(500, "Failed to retrieve drivers");
  }
});

// Get Driver by ID Function
export const getDriverById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Driver ID is required");
  }

  try {
    const driver = await Driver.findById(id);

    if (!driver) {
      throw new ApiError(404, "Driver not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, driver, "Driver retrieved successfully"));
  } catch (error) {
    console.error("Error retrieving driver:", error.message);
    throw new ApiError(500, "Failed to retrieve driver");
  }
});

// Get Driver Ride by ID Function
export const getDriverRideById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Driver ID is required");
  }

  try {
    const rides = await RideDetails.find({ driverId: id });

    if (!rides || rides.length === 0) {
      throw new ApiError(404, "Driver not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, rides, "Driver rides retrieved successfully"));
  } catch (error) {
    console.error("Error retrieving driver rides:", error.message);
    throw new ApiError(500, "Failed to retrieve driver rides");
  }
});

// Update Driver Profile Function
export const updateDriverProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Driver ID is required");
  }

  delete req.body.phone;

  try {
    const driver = await Driver.findByIdAndUpdate(id, req.body, { new: true });

    if (!driver) {
      throw new ApiError(404, "Driver not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, driver, "Driver profile updated successfully")
      );
  } catch (error) {
    console.error("Error updating driver profile:", error.message);
    throw new ApiError(500, "Failed to update driver profile");
  }
});
