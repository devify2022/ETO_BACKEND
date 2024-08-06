import { ZodError } from 'zod';

const handelZodError = (err) => {
  const errors = err.issues.map((issue) => {
    return {
      path: issue?.path[issue.path.length - 1],
      message: issue?.message,
    };
  });

  const statusCode = 400;

  return {
    statusCode,
    message: 'Zod Error',
    errorMessages: errors,
  };
};

export default handelZodError;
