import { asyncHandler } from "../utils/asyncHandler.js";
import { Driver } from "../models/driver.model.js";
import { User } from "../models/user.model.js";
import { RideDetails } from "../models/rideDetails.model.js";
import { ETOCard } from "../models/eto.model.js";
import { WithdrawalLogs } from "../models/withdrawlLogs.model.js";
import { ApiError } from "../utils/apiError.js";
import { getCurrTime } from "../utils/getCurrTime.js";
import { getCurrentLocalDate } from "../utils/getCurrentLocalDate.js";
import { mongoose } from "mongoose";
import { Rider } from "../models/rider.model.js";
import { generateRandom3DigitNumber } from "../utils/otpGenerate.js";
import { Khata } from "../models/khata.model.js";
import ApiResponse from "../utils/apiResponse.js";
import geolib from "geolib";

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

    // Generate a unique 3-digit `eto_id_num`
    let eto_id_num;
    let isUnique = false;
    while (!isUnique) {
      eto_id_num = generateRandom3DigitNumber();
      const existingEtoCard = await ETOCard.findOne({ eto_id_num });
      if (!existingEtoCard) {
        isUnique = true;
      }
    }

    // Set default coordinates if current location is not provided or contains null values
    const defaultCoordinates = [0, 0];
    const driverData = {
      ...req.body,
      userId: existsUser._id,
      current_location: {
        type: "Point",
        coordinates: req.body.current_location?.coordinates?.every(
          (coord) => coord != null
        )
          ? req.body.current_location.coordinates
          : defaultCoordinates,
      },
    };

    const newDriver = new Driver(driverData);
    const savedDriver = await newDriver.save();

    const etoCardData = {
      driverId: savedDriver._id,
      userId: existsUser._id,
      eto_id_num: `ETO ${eto_id_num}`, // Use the unique 3-digit number generated above
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
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          drivers: drivers,
          count: drivers.length, // Send the length of unapproved drivers
        },
        "Drivers retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Error retrieving drivers:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to retrieve drivers"));
  }
});

// // Get Driver by ID Function
// export const getDriverById = asyncHandler(async (req, res) => {
//   const { id } = req.params;

//   if (!id) {
//     return res
//       .status(400)
//       .json(new ApiResponse(400, null, "Driver ID is required"));
//   }

//   try {
//     const driver = await Driver.findOne({ userId: id });
//     if (!driver) {
//       return res
//         .status(404)
//         .json(new ApiResponse(404, null, "Driver not found"));
//     }

//     return res
//       .status(200)
//       .json(new ApiResponse(200, driver, "Driver retrieved successfully"));
//   } catch (error) {
//     console.error("Error retrieving driver:", error.message);
//     return res
//       .status(500)
//       .json(new ApiResponse(500, null, "Failed to retrieve driver"));
//   }
// });

export const getDriverById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Driver ID is required"));
  }

  try {
    const driver = await Driver.findOne({ userId: id }).populate(
      "ride_details.rideDetailsId"
    );

    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    // Calculate total completed kilometers
    let totalKm = 0;

    for (const rideEntry of driver.ride_details) {
      const ride = rideEntry.rideDetailsId;

      if (ride && ride.isRide_ended) {
        const pickup = ride.pickup_location?.coordinates;
        const drop = ride.drop_location?.coordinates;

        if (pickup && drop && pickup.length === 2 && drop.length === 2) {
          const distanceInMeters = geolib.getDistance(
            { latitude: pickup[1], longitude: pickup[0] },
            { latitude: drop[1], longitude: drop[0] }
          );

          const distanceInKm = distanceInMeters / 1000;
          totalKm += distanceInKm;
        }
      }
    }

    // Round to 2 decimal places and assign to schema field
    driver.total_completed_km = Math.round(totalKm * 100) / 100;

    // Optional: save it to DB (uncomment if needed)
    // await driver.save();

    const responseData = {
      current_location: driver.current_location,
      total_completed_km: Math.round(totalKm * 100) / 100,
      _id: driver._id,
      userId: driver.userId,
      phone: driver.phone,
      login_time: driver.login_time,
      logout_time: driver.logout_time,
      isActive: driver.isActive,
      isApproved: driver.isApproved,
      socketId: driver.socketId,
      due_wallet: driver.due_wallet,
      cash_wallet: driver.cash_wallet,
      online_wallet: driver.online_wallet,
      total_earning: driver.total_earning,
      name: driver.name,
      email: driver.email,
      village: driver.village,
      police_station: driver.police_station,
      landmark: driver.landmark,
      post_office: driver.post_office,
      district: driver.district,
      pin_code: driver.pin_code,
      aadhar_number: driver.aadhar_number,
      driver_photo: driver.driver_photo,
      car_photo: driver.car_photo,
      license_number: driver.license_number,
      aadhar_front_photo: driver.aadhar_front_photo,
      aadhar_back_photo: driver.aadhar_back_photo,
      total_complete_rides: driver.total_complete_rides,
      is_on_ride: driver.is_on_ride,
      current_ride_id: driver.current_ride_id,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, responseData, "Driver retrieved successfully"));
  } catch (error) {
    console.error("Error retrieving driver:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to retrieve driver"));
  }
});

// Get Driver registered time by id
export const getDriverRegistrationTimeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Driver ID is required"));
  }

  try {
    // Find the driver by userId
    const driver = await Driver.findOne({ userId: id }).select(
      "createdAt name"
    );

    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          name: driver.name,
          registrationTime: driver.createdAt, // Use createdAt field
        },
        "Driver registration time retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Error retrieving driver registration time:", error.message);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          null,
          "Failed to retrieve driver registration time"
        )
      );
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
    // First, find the driver by ID in the Driver collection
    const driver = await Driver.findById(id);
    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    // Then, find rides from the RideDetails collection where the driverId matches
    const rides = await RideDetails.find({ driverId: driver._id });
    if (!rides || rides.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No rides found for this driver"));
    }

    // Return the rides associated with the driver
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
    let resData = null;

    // Find the driver by ID
    const driver = await Driver.findById(id);
    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    // Fetch the current ride details
    const currentRide = await RideDetails.findOne({ driverId: id, isOn: true });

    const rider = await Rider.findById(currentRide?.riderId);

    // console.log(currentRide)
    // console.log(rider)

    resData = {
      currentRide,
      riderLocation: rider.current_location,
    };

    // console.log("Ride details", currentRide);
    // console.log("Rider",rider.current_location)

    if (!currentRide && !rider) {
      return res
        .status(404)
        .json(new ApiResponse(404, resData, "Current ride details not found"));
    }

    // console.log("Ride details",resData)

    // Return the current ride details
    return res
      .status(200)
      .json(
        new ApiResponse(200, resData, "Current ride retrieved successfully")
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
    // Find the driver by ID and populate ride_details.rideDetailsId to ensure proper references.
    const driver = await Driver.findById(id).populate(
      "ride_details.rideDetailsId"
    );
    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    // Ensure ride_details array is valid and extract ride IDs
    const rideIds =
      driver.ride_details?.map(
        (ride) => ride.rideDetailsId?._id || ride.rideDetailsId
      ) || [];

    if (!rideIds.length) {
      return res
        .status(404)
        .json(
          new ApiResponse(404, null, "No ride history found for this driver")
        );
    }

    // Fetch all rides associated with these IDs
    const rides = await RideDetails.find({ _id: { $in: rideIds } });

    // Identify missing ride IDs
    const missingRides = rideIds.filter(
      (rideId) => !rides.some((ride) => ride._id.equals(rideId))
    );

    if (missingRides.length > 0) {
      console.warn(
        "Missing ride details for the following ride IDs:",
        missingRides
      );
    }

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

    // Check if no active drivers are found
    if (!activeDrivers || activeDrivers.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            { total: 0, drivers: [] },
            "No active drivers found"
          )
        );
    }

    // Return active drivers with their total count
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { total: activeDrivers.length, drivers: activeDrivers },
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

// Get Today's Rides
export const getTodaysRides = asyncHandler(async (req, res) => {
  const { driverId } = req.body; // Driver ID passed in request body

  try {
    // Get the current date and set the start and end of the day
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)); // 00:00:00 of today
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)); // 23:59:59 of today

    // Query to find today's rides for the given driver
    const rides = await RideDetails.find({
      driverId: new mongoose.Types.ObjectId(driverId),
      ride_end_time: { $gte: startOfDay, $lte: endOfDay }, // Filter by today's date
    })
      .populate("driverId", "name phone") // Optionally populate driver details if needed
      .exec();

    if (rides.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No rides found for today."));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, { rides }, "Today's rides fetched successfully.")
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to fetch today's rides."));
  }
});

// Get Today's Earnings
export const getTodaysEarnings = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch the driver using the userId
    const driver = await Driver.findOne({ userId: userId });

    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    // Get today's start and end timestamps
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Perform the aggregation to calculate today's earnings
    const result = await RideDetails.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driver._id),
          ride_end_time: { $gte: todayStart, $lte: todayEnd },
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
          "Today's earnings fetched successfully"
        )
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to fetch today's earnings"));
  }
});

// Get Total Earings by date
export const getTotalEarningByDate = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { fromDate, toDate } = req.body;

  try {
    // Validate the dates
    if (!fromDate || !toDate) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, null, "Both fromDate and toDate are required")
        );
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    // Adjust `end` to include the entire end date
    end.setHours(23, 59, 59, 999);

    // Fetch the driver
    const driver = await Driver.findById(userId);

    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    // Perform the aggregation to calculate earnings
    const result = await RideDetails.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driver._id),
          ride_end_time: { $gte: start, $lte: end }, // Filter by date range
        },
      },
      {
        $group: {
          _id: null, // No grouping field; just sum all earnings
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
    console.error(error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to fetch earnings by date"));
  }
});
// Get Recent rides
export const getRecentRides = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const rides = await RideDetails.find({
      driverId: new mongoose.Types.ObjectId(id),
    })
      .populate({
        path: "driverId",
        select: "name driver_photo", // Include driver's name and photo
      })
      .sort({ ride_end_time: -1 }) // Sort by most recent rides
      .limit(5); // Get the last 5 rides

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
    console.error("Error retrieving recent rides:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to get recent rides"));
  }
});

// Get Due Wallet Balance and Total Earnings
export const getWalletBalance = asyncHandler(async (req, res) => {
  const { userId } = req.params; // Extract userId from request parameters

  try {
    // Find the driver by userId
    const driver = await Driver.findOne({ userId });

    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    // Get the due_wallet and total_earning balance
    const dueWalletBalance = driver.due_wallet;
    const totalEarnings = driver.total_earning;

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { dueWalletBalance, totalEarnings },
          "Wallet details fetched successfully"
        )
      );
  } catch (error) {
    console.error("Error fetching wallet details:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to fetch wallet details"));
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

// Get Top Drivers Based on Number of Rides
export const getTopDrivers = asyncHandler(async (req, res) => {
  try {
    const topDrivers = await RideDetails.aggregate([
      {
        $group: {
          _id: "$driverId",
          rideCount: { $sum: 1 }, // Count the number of rides for each driver
        },
      },
      {
        $lookup: {
          from: "drivers", // Collection name for Driver
          localField: "_id",
          foreignField: "_id",
          as: "driverDetails",
        },
      },
      {
        $unwind: "$driverDetails", // Unwind the driver details to merge with the ride data
      },
      {
        $sort: { rideCount: -1 }, // Sort by ride count in descending order
      },
      {
        $limit: 10, // Limit to top 10 drivers
      },
      {
        $project: {
          _id: 0, // Exclude the aggregation `_id` field (if not required)
          driverId: "$driverDetails._id", // Driver ID
          rideCount: 1, // Number of rides
          driverDetails: 1, // Include all fields from `driverDetails`
        },
      },
    ]);

    if (topDrivers.length === 0) {
      return res.status(404).json(new ApiResponse(404, [], "No drivers found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, topDrivers, "Top drivers fetched successfully")
      );
  } catch (error) {
    console.error("Error fetching top drivers:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, [], "Failed to fetch top drivers"));
  }
});

// Get all drivers with isApproved = false
export const getUnapprovedDrivers = asyncHandler(async (req, res) => {
  try {
    // Find drivers where isApproved is false
    const unapprovedDrivers = await Driver.find({ isApproved: false });

    if (unapprovedDrivers.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No unapproved drivers found"));
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          drivers: unapprovedDrivers,
          count: unapprovedDrivers.length, // Send the length of unapproved drivers
        },
        "Unapproved drivers fetched successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching unapproved drivers:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to fetch unapproved drivers"));
  }
});

// Get total number of approved drivers
export const getApprovedDrivers = asyncHandler(async (req, res) => {
  try {
    // Count drivers where isApproved is true
    const approvedDriversCount = await Driver.approvedDriversCount({
      isApproved: true,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          drivers: approvedDriversCount,
          count: approvedDriversCount.length, // Send the length of unapproved drivers
        },
        "Approved drivers count fetched successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching approved drivers count:", error.message);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "Failed to fetch approved drivers count")
      );
  }
});

// Get the approval status of a driver by userId
export const getApprovedStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    // Find the driver by userId
    const driver = await Driver.findOne({ userId });

    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    // Send the isApproved status
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          isApproved: driver.isApproved,
        },
        "Driver approval status fetched successfully"
      )
    );
  } catch (error) {
    console.error("Error fetching driver approval status:", error.message);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "Failed to fetch driver approval status")
      );
  }
});

// Approve a driver by ID
export const approveDriverByDriverId = asyncHandler(async (req, res) => {
  const { driverId, adminId } = req.body;

  if (!driverId || !adminId) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Driver ID and Admin ID are required"));
  }

  try {
    // Approve the driver
    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      { isApproved: true },
      { new: true } // Return the updated document
    );

    if (!updatedDriver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    // Check if Khata entry already exists
    const existingKhata = await Khata.findOne({ driverId });

    if (!existingKhata) {
      // Create Khata entry for the approved driver
      await Khata.create({
        driverId,
        adminId,
        driverdue: 0,
        admindue: 0,
      });
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { driver: updatedDriver },
          "Driver approved successfully and Khata entry created"
        )
      );
  } catch (error) {
    console.error("Error approving driver or creating Khata:", error.message);
    return res
      .status(500)
      .json(
        new ApiResponse(500, null, "Failed to approve driver or create Khata")
      );
  }
});

// Delete Driver, User, and ETOCard
export const deleteDriverAccount = asyncHandler(async (req, res) => {
  const { driverId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(driverId)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid driver ID"));
  }

  try {
    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Driver not found"));
    }

    // Get the associated userId
    const userId = driver.userId;

    // Delete ETOCard
    await ETOCard.findOneAndDelete({ driverId });

    // Delete Driver
    await Driver.findByIdAndDelete(driverId);

    // Delete User
    await User.findByIdAndDelete(userId);

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Account deleted successfully"));
  } catch (error) {
    console.error("Error deleting driver account:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to delete driver account"));
  }
});
