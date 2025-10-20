import { Router } from "express";
import passport from "passport";
import { PASSPORT_TWITCH_STRATEGY } from "../config/passport";
import { callbackConnexion } from "../controllers/authController";

const router = Router();

router.post(
  "/callback",
  passport.authenticate(PASSPORT_TWITCH_STRATEGY, { session: false }),
  callbackConnexion,
);

export default router;
