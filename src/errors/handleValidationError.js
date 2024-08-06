import mongoose from 'mongoose';
import httpStatus from 'http-status-codes';

const handelValidationError = (err) => {
  const errors = Object.values(err.errors).map(element => {
    return {
      path: element?.path,
      message: element?.message,
    };
  });

  const statusCode = httpStatus.BAD_REQUEST;

  return {
    statusCode,
    message: 'Validation Error',
    errorMessages: errors,
  };
};

export default handelValidationError;