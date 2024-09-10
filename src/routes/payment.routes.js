import { Router } from "express";
import {
  checkStatus,
  createPayment,
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/payment", createPayment);
router.get("/status/:txnId", checkStatus);

export default router;
