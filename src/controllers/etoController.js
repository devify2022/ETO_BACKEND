import { asyncHandler } from "../utils/asyncHandler.js";
import { ETOCard } from "../models/eto.model.js";


export const getETOCardById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    // const etoCard = await ETOCard.findById(id).populate("driverId") FOR GETTING ALL DETAILS
    const etoCard = await ETOCard.findById(id);

    if (!etoCard) {
      return res.status(404).json({ message: "ETOCard not found" });
    }

    return res.status(200).json({
      message: "ETOCard retrieved successfully",
      etoCard,
    });
  } catch (error) {
    console.error("Error retrieving ETOCard:", error.message);
    return res.status(500).json({ message: "Failed to retrieve ETOCard" });
  }
});
