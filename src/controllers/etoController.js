import { asyncHandler } from "../utils/asyncHandler.js";
import { ETOCard } from "../models/eto.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";

export const getETOCardById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const etoCard = await ETOCard.findOne({ driverId: id });

    if (!etoCard) {
      throw new ApiError(404, "ETOCard not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, etoCard, "ETOCard retrieved successfully"));
  } catch (error) {
    console.error("Error retrieving ETOCard:", error.message);
    throw new ApiError(500, "Failed to retrieve ETOCard");
  }
});
