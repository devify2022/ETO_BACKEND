import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import { UserValidation } from './user.validation';
import { UserController } from './user.controllers';

const router = express.Router();

// Create a new user
router.post('/auth/signUp', validateRequest(UserValidation.userZodSchema), UserController.createUser);


export const UserRoutes = router;
