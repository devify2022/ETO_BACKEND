import { asyncHandler } from "../utils/asyncHandler.js";
import { ETOCard } from "../models/eto.model.js";
import { ApiError } from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";

export const getETOCardById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const etoCard = await ETOCard.findOne({ userId: id });

    if (!etoCard) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "ETOCard not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, etoCard, "ETOCard retrieved successfully"));
  } catch (error) {
    console.error("Error retrieving ETOCard:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to retrieve ETOCard"));
  }
});
