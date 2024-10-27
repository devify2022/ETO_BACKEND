import { asyncHandler } from "../utils/asyncHandler.js";
import { Driver } from "../models/driver.model.js";
import { User } from "../models/user.model.js";
import { RideDetails } from "../models/rideDetails.model.js";
import { ETOCard } from "../models/eto.model.js";
import { WithdrawalLogs } from "../models/withdrawlLogs.model.js";
import { ApiError } from "../utils/apiError.js";
import { getCurrTime } from "../utils/getCurrTime.js";
import { getCurrentLocalDate } from "../utils/getCurrentLocalDate.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { mongoose } from "mongoose";

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

// Get Driver's Current Ride Function
export const getCurrentRide = asyncHandler(async (req, res) => {
  const { id } = req.params; // driver ID

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Driver ID is required"));
  }

  try {
    // Find the driver by ID
    const driver = await Driver.findById(id);
    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    // // Check if the driver is on a ride
    // if (!driver.current_ride_id) {
    //   return res
    //     .status(404)
    //     .json(new ApiResponse(404, null, "No ongoing ride for this driver"));
    // }

    // Fetch the current ride details
    const currentRide = await RideDetails.findOne({ driverId: id, isOn: true });
    if (!currentRide) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Current ride details not found"));
    }

    // Return the current ride details
    return res
      .status(200)
      .json(
        new ApiResponse(200, currentRide, "Current ride retrieved successfully")
      );
  } catch (error) {
    console.error("Error retrieving current ride:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to retrieve current ride"));
  }
});

// Get Driver's Ride History Function with Debugging
export const getRideHistory = asyncHandler(async (req, res) => {
  const { id } = req.params; // driver ID

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Driver ID is required"));
  }

  try {
    // Find the driver by ID
    const driver = await Driver.findById(id);
    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    // If there are no ride IDs, return early
    if (!driver.ride_ids || driver.ride_ids.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(404, null, "No ride history found for this driver")
        );
    }

    // Fetch all rides associated with this driver
    const rides = await RideDetails.find({ _id: { $in: driver.ride_ids } });

    // Identify missing ride IDs
    const missingRides = driver.ride_ids.filter(
      (rideId) => !rides.some((ride) => ride._id.equals(rideId))
    );

    if (missingRides.length > 0) {
      console.warn(
        "Missing ride details for the following ride IDs:",
        missingRides
      );
    }

    // Return the ride history, with a warning if any rides are missing
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { rides, missingRides },
          "Ride history retrieved successfully"
        )
      );
  } catch (error) {
    console.error("Error retrieving ride history:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to retrieve ride history"));
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

// Get All Active Drivers Function
export const getAllActiveDrivers = asyncHandler(async (req, res) => {
  try {
    // Find all drivers where isActive is true
    const activeDrivers = await Driver.find({ isActive: true });

    if (!activeDrivers || activeDrivers.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No active drivers found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          activeDrivers,
          "Active drivers retrieved successfully"
        )
      );
  } catch (error) {
    console.error("Error retrieving active drivers:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to retrieve active drivers"));
  }
});

// Activate Driver Function
export const activateDriver = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Driver ID is required"));
  }

  try {
    // Find the driver by ID and update `isActive` to true
    const driver = await Driver.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    );

    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, driver, "Driver activated successfully"));
  } catch (error) {
    console.error("Error activating driver:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to activate driver"));
  }
});

// Deactivate Driver Function
export const deactivateDriver = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Driver ID is required"));
  }

  try {
    // Find the driver by ID and update `isActive` to false
    const driver = await Driver.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, driver, "Driver deactivated successfully"));
  } catch (error) {
    console.error("Error deactivating driver:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to deactivate driver"));
  }
});

// Delete Driver Function
export const deleteDriver = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Driver ID is required"));
  }

  try {
    // Find and delete the driver by ID
    const driver = await Driver.findByIdAndDelete(id);

    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Driver deleted successfully"));
  } catch (error) {
    console.error("Error deleting driver:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to delete driver"));
  }
});

export const getTotalEarningByDate = asyncHandler(async (req, res) => {
  const { driverId, startDate, endDate } = req.body;

  try {
    // Convert startDate and endDate to Date objects to ensure proper query comparison
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Adjust endDate to include the full day (23:59:59) if startDate != endDate
    if (startDate !== endDate) {
      end.setHours(23, 59, 59, 999); // Include the full range of the day
    }

    // Create the query condition
    const dateFilter =
      startDate === endDate
        ? { ride_end_time: { $eq: start } } // Exact date match for same-day queries
        : { ride_end_time: { $gte: start, $lte: end } }; // Date range query

    // Perform the aggregation to sum the driver profits for the given date(s)
    const result = await RideDetails.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driverId),
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: null, // No grouping by field; just sum the total
          totalEarnings: { $sum: "$driver_profit" },
        },
      },
    ]);

    let totalEarnings = result.length > 0 ? result[0].totalEarnings : 0;
    totalEarnings = Math.ceil(totalEarnings);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { totalEarnings },
          "Total earnings fetched successfully"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to fetch total earnings"));
  }
});

export const getRecentRides = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const rides = await RideDetails.find({
      driverId: new mongoose.Types.ObjectId(id),
    })
      .sort({ ride_end_time: 1 }) // Sort by most recent rides
      .limit(5); // Get the last 5 rides

    console.log({ rides });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          rides,
          rides.length > 0
            ? "Last 5 Rides Fetched Successfully"
            : "No Rides Found"
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to get recent rides"));
  }
});

export const getTotalWithdrawalsByDate = asyncHandler(async (req, res) => {
  const { driverId, fromDate, toDate } = req.body;
  try {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Ensure `toDate` includes the entire day
    to.setHours(23, 59, 59, 999);

    console.log("From:", from);
    console.log("To:", to);
    console.log("driverId", driverId);

    const matchCondition =
      fromDate === toDate
        ? { withdrawalDate: { $eq: from } } // If same date, use $eq
        : {
            withdrawalDate: {
              $gte: from, // Greater than or equal to fromDate
              $lte: to, // Less than or equal to toDate
            },
          };

    const result = await WithdrawalLogs.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driverId),
          ...matchCondition,
        },
      },
      {
        $group: {
          _id: null,
          totalWithdrawals: { $sum: "$withdrawalAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          totalWithdrawals: 1,
        },
      },
    ]);

    const totalAmount = result.length > 0 ? result[0].totalWithdrawals : 0;
    console.log(`Total Withdrawals: ${result}`);

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Total Amount fetched"));
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to get recent rides"));
  }
});

export const createWithdrawalLogs = asyncHandler(async (req, res) => {
  try {
    const { driverId, withdrawalAmount, mode } = req.body;

    if (!driverId || !withdrawalAmount || !mode) {
      return res.status(400).json({
        success: false,
        message: "Driver ID, withdrawal amount, and mode are required.",
      });
    }

    // Validate mode
    const validModes = ["cash", "upi", "bank transfer"];
    if (!validModes.includes(mode)) {
      return res.status(400).json({
        success: false,
        message: `Invalid withdrawal mode. Allowed values: ${validModes.join(", ")}.`,
      });
    }

    // Check if driver exists and has sufficient earnings
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found.",
      });
    }

    if (driver.total_earning < withdrawalAmount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient earnings for withdrawal.",
      });
    }

    // Prepare withdrawal data based on mode
    const withdrawalData = {
      driverId: new mongoose.Types.ObjectId(driverId),
      withdrawalAmount,
      withdrawalDate: getCurrentLocalDate(),
      withdrawalTime: getCurrTime(),
      withdrawalMode: mode,
    };

    console.log({ withdrawalData });

    if (mode === "upi") {
      withdrawalData.upiDetails = { upiId: "user@upi" }; // Example UPI ID
    } else if (mode === "bank transfer") {
      withdrawalData.bankDetails = {
        accountNumber: "123456789",
        bankName: "Bank of Example",
        ifscCode: "IFSC1234",
      };
    }

    // Update driver's total earnings
    await Driver.findByIdAndUpdate(
      driverId,
      { $inc: { total_earning: -withdrawalAmount } },
      { new: true }
    );

    // Save withdrawal log
    const newWithdrawal = new WithdrawalLogs(withdrawalData);
    await newWithdrawal.save();

    return res.status(201).json({
      success: true,
      message: "Withdrawal log created successfully",
      data: newWithdrawal,
    });
  } catch (error) {
    console.error("Error creating withdrawal log:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create withdrawal log",
      error: error.message,
    });
  }
});
