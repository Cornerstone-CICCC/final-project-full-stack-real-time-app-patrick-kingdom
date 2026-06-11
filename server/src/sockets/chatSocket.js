import { addMessage } from "../models/messageModel.js";

const MAX_TEXT_LENGTH = 500;
const MAX_NAME_LENGTH = 20;

function isValidMessage(payload) {
  return (
    payload &&
    typeof payload.username === "string" &&
    typeof payload.text === "string" &&
    payload.username.trim().length > 0 &&
    payload.username.trim().length <= MAX_NAME_LENGTH &&
    payload.text.trim().length > 0 &&
    payload.text.trim().length <= MAX_TEXT_LENGTH
  );
}

export function registerChatHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("chat:send", (payload) => {
      if (!isValidMessage(payload)) return;

      const message = addMessage({
        username: payload.username.trim(),
        text: payload.text.trim(),
      });

      io.emit("chat:message", message);
    });
  });
}
