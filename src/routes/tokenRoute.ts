import { Router } from "express";
import { bffAuthMiddleware } from "../middlewares/bffAuthMiddleware";
import { createToken } from "../controllers/tokenController";

const router = Router();

router.post("/", bffAuthMiddleware, createToken);

export default router;
