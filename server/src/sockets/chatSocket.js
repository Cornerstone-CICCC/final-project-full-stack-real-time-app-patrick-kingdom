import { addMessage } from "../models/messageModel.js";
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
      }

      socket.join(room.id);
      onlineUsers.set(socket.id, {
        username: payload.username.trim(),
        roomId: room.id,
      });

      io.emit("rooms:list", getRooms());
      socket.emit("chat:joined", room);
      emitOnlineUsers(io, room.id);
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

    socket.emit("rooms:list", getRooms());

    socket.on("disconnect", () => {
      const user = onlineUsers.get(socket.id);
      onlineUsers.delete(socket.id);
      if (user) emitOnlineUsers(io, user.roomId);
    });
  });
}
