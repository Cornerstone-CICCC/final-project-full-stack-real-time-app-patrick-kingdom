import { addMessage, removeMessage } from "../models/messageModel.js";
import { getOrCreateRoom, getRooms } from "../models/roomModel.js";

const MAX_TEXT_LENGTH = 500;
const MAX_NAME_LENGTH = 20;
const onlineUsers = new Map();

function getOnlineUsers(roomId) {
  const users = [...onlineUsers.values()]
    .filter((user) => user.roomId === roomId)
    .map((user) => user.username);

  return [...new Set(users)].sort((a, b) => a.localeCompare(b));
}

function emitOnlineUsers(io, roomId) {
  io.to(roomId).emit("users:online", getOnlineUsers(roomId));
}

// System notices are broadcast only, not stored in message history
function emitNotice(io, roomId, text) {
  io.to(roomId).emit("chat:notice", {
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString(),
  });
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
    typeof payload.text === "string" &&
    payload.text.trim().length > 0 &&
    payload.text.trim().length <= MAX_TEXT_LENGTH
  );
}

export function registerChatHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("chat:join", (payload) => {
      if (!payload || !isValidUsername(payload.username)) return;

      const room = getOrCreateRoom(payload.roomName);
      if (!room) return;

      const previousUser = onlineUsers.get(socket.id);
      if (previousUser) {
        socket.leave(previousUser.roomId);
        emitOnlineUsers(io, previousUser.roomId);
        emitNotice(io, previousUser.roomId, `${previousUser.username} left`);
      }

      socket.join(room.id);
      onlineUsers.set(socket.id, {
        username: payload.username.trim(),
        roomId: room.id,
      });

      io.emit("rooms:list", getRooms());
      socket.emit("chat:joined", room);
      emitOnlineUsers(io, room.id);
      emitNotice(io, room.id, `${payload.username.trim()} joined`);
    });

    socket.on("chat:send", (payload) => {
      if (!isValidMessage(payload)) return;

      const user = onlineUsers.get(socket.id);
      if (!user) return;

      const message = addMessage({
        roomId: user.roomId,
        username: user.username,
        text: payload.text.trim(),
      });

      io.to(user.roomId).emit("chat:message", message);
    });

    socket.on("chat:unsend", (payload) => {
      if (!payload || typeof payload.messageId !== "string") return;

      const user = onlineUsers.get(socket.id);
      if (!user) return;

      const removed = removeMessage({
        roomId: user.roomId,
        messageId: payload.messageId,
        username: user.username,
      });

      if (removed) {
        io.to(user.roomId).emit("chat:unsent", { messageId: payload.messageId });
      }
    });

    socket.on("chat:leave", () => {
      const user = onlineUsers.get(socket.id);
      if (!user) return;

      socket.leave(user.roomId);
      onlineUsers.delete(socket.id);
      emitOnlineUsers(io, user.roomId);
      emitNotice(io, user.roomId, `${user.username} left`);
    });

    socket.emit("rooms:list", getRooms());

    socket.on("disconnect", () => {
      const user = onlineUsers.get(socket.id);
      onlineUsers.delete(socket.id);
      if (user) {
        emitOnlineUsers(io, user.roomId);
        emitNotice(io, user.roomId, `${user.username} left`);
      }
    });
  });
}
