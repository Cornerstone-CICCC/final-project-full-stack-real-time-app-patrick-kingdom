import { addMessage } from "../models/messageModel.js";

const MAX_TEXT_LENGTH = 500;
const MAX_NAME_LENGTH = 20;
const onlineUsers = new Map();

function getOnlineUsers() {
  return [...new Set(onlineUsers.values())].sort((a, b) => a.localeCompare(b));
}

function emitOnlineUsers(io) {
  io.emit("users:online", getOnlineUsers());
}

function isValidUsername(username) {
  return (
    typeof username === "string" &&
    username.trim().length > 0 &&
    username.trim().length <= MAX_NAME_LENGTH
  );
}

function isValidMessage(payload) {
  return (
    payload &&
    isValidUsername(payload.username) &&
    typeof payload.text === "string" &&
    payload.text.trim().length > 0 &&
    payload.text.trim().length <= MAX_TEXT_LENGTH
  );
}

export function registerChatHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("chat:join", (payload) => {
      if (!payload || !isValidUsername(payload.username)) return;

      onlineUsers.set(socket.id, payload.username.trim());
      emitOnlineUsers(io);
    });

    socket.on("chat:send", (payload) => {
      if (!isValidMessage(payload)) return;

      const message = addMessage({
        username: payload.username.trim(),
        text: payload.text.trim(),
      });

      io.emit("chat:message", message);
    });

    socket.on("disconnect", () => {
      onlineUsers.delete(socket.id);
      emitOnlineUsers(io);
    });
  });
}
