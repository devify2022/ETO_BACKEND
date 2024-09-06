import { ApiError } from "../utils/apiError.js";


const errorHandler = (err, req, res, next) => {
  // Only log the error once
  if (!err.logged) {
    console.error(err);
    err.logged = true; // Mark error as logged
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: err.success,
      message: err.message,
      statusCode: err.statusCode,
      errors: err.errors.length ? err.errors : undefined,
    });
  }

  // Default error response for non-ApiError instances
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    statusCode: 500,
    errors: [],
  });
};

export default errorHandler
