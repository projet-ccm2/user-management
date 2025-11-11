import { Router } from "express";
import {callbackSetReward} from "../controllers/dataController";

const router = Router();

router.post(
  "/setrewards",
    callbackSetReward,
);

export default router;
