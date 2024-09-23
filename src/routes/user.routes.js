import { Router } from "express";
import {
  loginUser,
  verify_OTP,
  logoutUser,
  refreshAccessToken,
  resendOTP,
  validateOtp,
  sendOtp
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/login").post(loginUser);
router.route("/resend_otp").post(resendOTP);
router.route("/verifyotp").post(validateOtp);
router.route("/sendotp").post(sendOtp);

// secure routes
// router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh_token").post(verifyJWT, refreshAccessToken);

export default router;
