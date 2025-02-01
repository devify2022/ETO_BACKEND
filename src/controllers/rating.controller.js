import { asyncHandler } from "../utils/asyncHandler.js";
import ApiResponse from "../utils/apiResponse.js";
import { Rating } from "../models/rating.model.js";

// Get All Ratings Function
export const getAllRatings = asyncHandler(async (req, res) => {
  try {
    const ratings = await Rating.find();
    return res
      .status(200)
      .json(new ApiResponse(200, ratings, "Ratings retrieved successfully"));
  } catch (error) {
    console.error("Error retrieving ratings:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to retrieve ratings"));
  }
});

// Get  Ratings by driverId Function
export const getRatingsById = asyncHandler(async (req, res) => {
  try {
    const {driverId} = req.params

    if(!driverId)
    res
      .status(400)
      .json(new ApiResponse(400, null, "Missing  driverId"));

    const ratings = await Rating.find({driverId:driverId});

    return res
      .status(200)
      .json(new ApiResponse(200, ratings, "Ratings retrieved successfully"));

  } catch (error) {
    console.error("Error retrieving ratings:", error.message);
    return res
      .status(500)
      .json(new ApiResponse(404, null, "Ratings not found"));
  }
});



// Update Ratings  Function
export const createRatings = asyncHandler(async (req, res) => {
  const {payload} = req.body;
  
console.log(req.body)
  if (  !payload.rating || !payload.driverId || !payload.riderId ) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Required fields  is/are missing"));
  }


  try {
    const rating = await Rating.create(payload);

    if (!rating) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Rating could not be created"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, rating, "Rating created successfully"));
  } catch (error) {
    console.error("Error creating rating", error.message);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Failed to create Rating"));
  }
});
