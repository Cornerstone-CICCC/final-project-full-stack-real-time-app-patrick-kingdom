import type { Request, Response } from "express";
import { getMessages } from "../models/messageModel.js";

export function listMessages(req: Request, res: Response) {
  const roomId = typeof req.query.roomId === "string" ? req.query.roomId : undefined;
  res.json(getMessages(roomId));
}
