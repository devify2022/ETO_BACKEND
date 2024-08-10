import { Router } from "express";
import { getETOCardById } from "../controllers/etoController.js";

const router = Router();

router.route("/:id").get(getETOCardById);

export default router;
