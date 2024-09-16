import { Router } from "express";
import { checkStatus, createPayment } from "../controllers/newpaymentcontroller.js";
// import {
//   checkStatus,
//   createPayment,
// } from "../controllers/payment.controller.js";

const router = Router();

router.get("/pay", createPayment);
router.get("/redirect-url/:merchantTransactionId", checkStatus);

export default router;
