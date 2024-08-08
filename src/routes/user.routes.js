import { Router } from "express";
import {
  loginUser,
  verify_OTP,
  logoutUser,
  refreshAccessToken,
  resendOTP,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/login").post(loginUser);
router.route("/resend_otp").post(resendOTP);
router.route("/verifyotp").post(verify_OTP);

// secure routes
// router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh_token").post(verifyJWT, refreshAccessToken);

export default router;
