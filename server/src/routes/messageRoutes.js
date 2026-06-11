import { Router } from "express";
import { listMessages } from "../controllers/messageController.js";

const router = Router();

router.get("/", listMessages);

export default router;
