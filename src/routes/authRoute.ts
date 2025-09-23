import { Router } from "express";
import { callbackConnexion } from "../controllers/authController";

const router = Router();

router.post("/callback", callbackConnexion);

export default router;
