import { getMessages } from "../models/messageModel.js";

export function listMessages(req, res) {
  res.json(getMessages(req.query.roomId));
}
