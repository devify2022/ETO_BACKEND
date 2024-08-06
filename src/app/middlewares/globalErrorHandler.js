import mongoose from 'mongoose';
import { ZodError } from 'zod';
import handleValidationError from '../../errors/handleValidationError';
import ApiError from '../../errors/ApiError';
import handelZodError from '../../errors/handleValidationError';


const globalErrorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Something went wrong!';
  let errorMessages = [];

  if (err instanceof mongoose.Error.ValidationError) {
    const simplifiedError = handleValidationError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } else if (err instanceof ZodError) {
    console.log(err.message);
    const simplifiedError = handelZodError(err);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } else if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errorMessages = err.message
      ? [
          {
            path: '',
            message: err.message,
          },
        ]
      : [];
  } else if (err instanceof Error) {
    message = err.message;
    errorMessages = err.message
      ? [
          {
            path: '',
            message: err.message,
          },
        ]
      : [];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    stack: config.env !== 'production' ? err.stack : undefined,
  });
  next();
};

export default globalErrorHandler;
