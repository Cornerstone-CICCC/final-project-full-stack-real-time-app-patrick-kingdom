import type { Server, Socket } from "socket.io";
import { addMessage, removeMessage } from "../models/messageModel.js";
import { getOrCreateRoom, getRooms } from "../models/roomModel.js";

const MAX_TEXT_LENGTH = 500;
const MAX_NAME_LENGTH = 20;
type OnlineUser = {
  username: string;
  roomId: string;
  clientId: string | null;
};

type JoinPayload = {
  username?: unknown;
  roomName?: unknown;
  clientId?: unknown;
};

type SendPayload = {
  text?: unknown;
};

type UnsendPayload = {
  messageId?: unknown;
};

const onlineUsers = new Map<string, OnlineUser>();

function getOnlineUsers(roomId: string): string[] {
  const users = [...onlineUsers.values()]
    .filter((user) => user.roomId === roomId)
    .map((user) => user.username);

  return [...new Set(users)].sort((a, b) => a.localeCompare(b));
}

function emitOnlineUsers(io: Server, roomId: string): void {
  io.to(roomId).emit("users:online", getOnlineUsers(roomId));
}

// System notices are broadcast only, not stored in message history
function emitNotice(io: Server, roomId: string, text: string): void {
  io.to(roomId).emit("chat:notice", {
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString(),
  });
}

function isValidUsername(username: unknown): username is string {
  return (
    typeof username === "string" &&
    username.trim().length > 0 &&
    username.trim().length <= MAX_NAME_LENGTH
  );
}

function isValidClientId(clientId: unknown): clientId is string {
  return typeof clientId === "string" && clientId.trim().length > 0 && clientId.trim().length <= 100;
}

function removePreviousClientConnections(io: Server, socket: Socket, clientId: string): void {
  const affectedRoomIds = new Set<string>();

  for (const [socketId, user] of onlineUsers.entries()) {
    if (socketId === socket.id || user.clientId !== clientId) continue;

    io.sockets.sockets.get(socketId)?.leave(user.roomId);
    onlineUsers.delete(socketId);
    affectedRoomIds.add(user.roomId);
    emitNotice(io, user.roomId, `${user.username} left`);
  }

  affectedRoomIds.forEach((roomId) => emitOnlineUsers(io, roomId));
}

function isValidMessage(payload: unknown): payload is SendPayload & { text: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "text" in payload &&
    typeof payload.text === "string" &&
    payload.text.trim().length > 0 &&
    payload.text.trim().length <= MAX_TEXT_LENGTH
  );
}

function isObjectPayload(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === "object" && payload !== null;
}

export function registerChatHandlers(io: Server): void {
  io.on("connection", (socket) => {
    socket.on("chat:join", (payload: JoinPayload) => {
      if (!isObjectPayload(payload) || !isValidUsername(payload.username)) return;

      const room = getOrCreateRoom(payload.roomName);
      if (!room) return;
      const clientId = isValidClientId(payload.clientId) ? payload.clientId.trim() : null;

      const previousUser = onlineUsers.get(socket.id);
      if (previousUser) {
        socket.leave(previousUser.roomId);
        emitOnlineUsers(io, previousUser.roomId);
        emitNotice(io, previousUser.roomId, `${previousUser.username} left`);
      }

      if (clientId) {
        removePreviousClientConnections(io, socket, clientId);
      }

      socket.join(room.id);
      onlineUsers.set(socket.id, {
        username: payload.username.trim(),
        roomId: room.id,
        clientId,
      });

      io.emit("rooms:list", getRooms());
      socket.emit("chat:joined", room);
      emitOnlineUsers(io, room.id);
      emitNotice(io, room.id, `${payload.username.trim()} joined`);
    });

    socket.on("chat:send", (payload: unknown) => {
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

    socket.on("chat:unsend", (payload: UnsendPayload) => {
      if (!isObjectPayload(payload) || typeof payload.messageId !== "string") return;

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
