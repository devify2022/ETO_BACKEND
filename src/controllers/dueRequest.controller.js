import { Admin } from "../models/admin.model.js";
import { Driver } from "../models/driver.model.js";
import { DueRequest } from "../models/dueRequest.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Create Due Request
export const createDueRequest = asyncHandler(async (req, res) => {
  const { requestedBy, dueAmount, notes, paymentMethod, paymentPhoto } =
    req.body;

  try {
    // Validate input data
    if (!requestedBy || !dueAmount || !paymentPhoto) {
      return res
        .status(400)
        .json(new ApiResponse(400, null, "Missing required fields"));
    }

    // Create a new due request
    const newDueRequest = new DueRequest({
      requestedBy,
      dueAmount,
      status: "pending", // Default status is "pending"
      notes: notes || "", // If notes are not provided, default to an empty string
      paymentMethod: paymentMethod || "cash", // Default to "cash" if not provided
      paymentPhoto, // Payment photo URL or file path
    });

    // Save the new due request to the database
    await newDueRequest.save();

    // Respond with success
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { dueRequest: newDueRequest },
          "Due request created successfully."
        )
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to create due request"));
  }
});

// Get all due requests with pending status and driver details populated
export const getAllPendingDueRequests = asyncHandler(async (req, res) => {
  try {
    // Fetch all due requests that are pending and populate driver details
    const dueRequests = await DueRequest.find({ status: "pending" })
      .populate("requestedBy", "driver_photo phone name") // Populate specific fields from the Driver model
      .exec();

    if (dueRequests.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "No pending due requests found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { dueRequests },
          "All pending due requests fetched successfully."
        )
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to fetch pending due requests"));
  }
});

// Get a due request with driver details populated
export const getDueRequestDetails = asyncHandler(async (req, res) => {
  const { dueRequestId } = req.params; // Assuming the due request ID is passed as a parameter

  try {
    // Find the due request and populate driver details
    const dueRequest = await DueRequest.findById(dueRequestId)
      .populate("requestedBy", "driver_photo phone name") // Populate specific fields from the Driver model
      .exec();

    if (!dueRequest) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Due request not found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { dueRequest },
          "Due request fetched successfully."
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to fetch due request"));
  }
});

// Update Due Request Status and Update Driver/Admin Wallets & Earnings
export const updateDueRequestStatus = asyncHandler(async (req, res) => {
  const { dueRequestId } = req.params;
  const { status, note } = req.body;

  if (!status || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      message: "Invalid status. It must be 'approved' or 'rejected'.",
    });
  }

  try {
    // Find the due request by its ID
    const dueRequest = await DueRequest.findById(dueRequestId);

    if (!dueRequest) {
      return res.status(404).json({
        message: "Due request not found.",
      });
    }

    // Handle "approved" status
    if (status === "approved") {
      // Update the due wallet of the driver and admin
      const driver = await Driver.findById(dueRequest.requestedBy);
      const admin = await Admin.findById(dueRequest.resolvedBy);

      if (!driver || !admin) {
        return res.status(404).json({
          message: "Driver or Admin not found.",
        });
      }

      driver.due_wallet -= dueRequest.dueAmount;
      driver.total_earning += dueRequest.dueAmount;

      admin.due_wallet -= dueRequest.dueAmount;
      admin.total_earning += dueRequest.dueAmount;

      // Delete the due payment from admin's due_payment_details (when approved)
      const paymentIndex = admin.due_payment_details.findIndex(
        (payment) =>
          payment.driverId.toString() === driver._id.toString() &&
          payment.due_payment === dueRequest.dueAmount
      );

      if (paymentIndex !== -1) {
        admin.due_payment_details.splice(paymentIndex, 1); // Remove the due payment entry
      }

      // Save the updated driver and admin details
      await driver.save();
      await admin.save();

      // Update the due request with status and resolved time
      dueRequest.status = "approved";
      dueRequest.resolvedAt = new Date();
      dueRequest.paidAmount = dueRequest.dueAmount;
      dueRequest.paymentDate = new Date();
    } else if (status === "rejected") {
      // Handle rejection status and add the rejection reason in the notes
      dueRequest.status = "rejected";
      dueRequest.notes = note || "No rejection reason provided"; // Default note if none is provided
    }

    // Save the updated due request
    await dueRequest.save();

    return res.status(200).json({
      message: "Due request status updated successfully.",
    });
  } catch (error) {
    console.error("Error updating due request status:", error.message);
    return res.status(500).json({
      message: "Failed to update due request status.",
    });
  }
});

// Delete Due Request and Update Driver/Admin Wallets
export const deleteDueRequest = asyncHandler(async (req, res) => {
  const { dueRequestId } = req.params;

  try {
    // Find the due request by its ID
    const dueRequest = await DueRequest.findById(dueRequestId);

    if (!dueRequest) {
      return res.status(404).json({
        message: "Due request not found.",
      });
    }

    // Handle the case where the due request is approved
    if (dueRequest.status === "approved") {
      const driver = await Driver.findById(dueRequest.requestedBy);
      const admin = await Admin.findById(dueRequest.resolvedBy);

      if (!driver || !admin) {
        return res.status(404).json({
          message: "Driver or Admin not found.",
        });
      }

      // If the request is approved, reverse the updates done to the driver and admin wallets
      driver.due_wallet += dueRequest.dueAmount; // Restore the driver's due wallet
      driver.total_earning -= dueRequest.dueAmount; // Subtract from driver's total earnings

      admin.due_wallet += dueRequest.dueAmount; // Restore the admin's due wallet
      admin.total_earning -= dueRequest.dueAmount; // Subtract from admin's total earnings

      // Save the updated driver and admin details
      await driver.save();
      await admin.save();
    }

    // Delete the due request
    await DueRequest.findByIdAndDelete(dueRequestId);

    return res.status(200).json({
      message: "Due request deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting due request:", error.message);
    return res.status(500).json({
      message: "Failed to delete due request.",
    });
  }
});
