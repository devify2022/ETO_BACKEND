import { ZodError } from 'zod';

const validateRequest = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
      cookies: req.cookies,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.errors,
      });
    } else {
      next(error);
    }
  }
};

export default validateRequest;
