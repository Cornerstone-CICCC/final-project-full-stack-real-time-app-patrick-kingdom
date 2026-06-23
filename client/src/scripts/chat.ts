import { io } from "socket.io-client";
import { getSessionUsername, SERVER_URL } from "./auth";
import { bindChatSession } from "./chat/chatSession";
import { renderRoomGroups } from "./chat/roomGroups";

declare global {
  interface Window {
    __DEFAULT_ROOM_NAME__?: string;
    __CHAT_DESKTOP_ONLY__?: boolean;
  }
}

const roomGroupsList = document.getElementById("room-groups-list");
const roomGroupsStatus = document.getElementById("room-groups-status");
const shouldStartChat =
  !window.__CHAT_DESKTOP_ONLY__ || window.matchMedia("(min-width: 1024px)").matches;
const shouldConnectSocket = Boolean(roomGroupsList) || shouldStartChat;

function generateGuestName() {
  const savedName = sessionStorage.getItem("chatGuestName");
  if (savedName) return savedName;

  const guestName = `Guest${Math.floor(1000 + Math.random() * 9000)}`;
  sessionStorage.setItem("chatGuestName", guestName);
  return guestName;
}

function getClientId() {
  const savedId = sessionStorage.getItem("chatClientId");
  if (savedId) return savedId;

  const clientId = crypto.randomUUID();
  sessionStorage.setItem("chatClientId", clientId);
  return clientId;
}

function getChatElements() {
  const currentRoom = document.getElementById("current-room");
  const currentUser = document.getElementById("current-user");
  const messageList = document.getElementById("message-list");
  const messageForm = document.getElementById("message-form");
  const messageInput = document.getElementById("message-input");
  const onlineUserList = document.getElementById("online-user-list");

  if (
    !shouldStartChat ||
    !(currentRoom instanceof HTMLElement) ||
    !(currentUser instanceof HTMLElement) ||
    !(messageList instanceof HTMLUListElement) ||
    !(messageForm instanceof HTMLFormElement) ||
    !(messageInput instanceof HTMLInputElement) ||
    !(onlineUserList instanceof HTMLUListElement)
  ) {
    return null;
  }

  return {
    currentRoom,
    currentUser,
    messageList,
    messageForm,
    messageInput,
    onlineUserList,
    visitorsToggle: document.getElementById("visitors-toggle") as HTMLButtonElement | null,
    visitorsBack: document.getElementById("visitors-back") as HTMLButtonElement | null,
    mobileChatPanel: document.getElementById("mobile-chat-panel"),
    visitorsPanel: document.getElementById("visitors-panel"),
  };
}

if (shouldConnectSocket) {
  const requestedRoomName = new URLSearchParams(window.location.search).get("room")?.trim();
  const roomName = requestedRoomName || window.__DEFAULT_ROOM_NAME__ || "General";
  const socket = io(SERVER_URL, { autoConnect: false });

  if (roomGroupsList instanceof HTMLElement) {
    socket.on("rooms:list", (rooms) => {
      renderRoomGroups(rooms, roomGroupsList, roomGroupsStatus, (roomName) => {
        if (roomGroupsStatus) {
          roomGroupsStatus.textContent = "Creating room...";
        }
        socket.emit("rooms:create", { roomName });
      });
    });
  }

  getSessionUsername().then(async (authenticatedUsername) => {
  let username = authenticatedUsername ?? generateGuestName();
  let avatar = "😀";
  let bio = "";

  try {
    const response = await fetch(`${SERVER_URL}/api/auth/me`, {
      credentials: "include",
    });

    if (response.ok) {
      const profile = await response.json();
      username = profile.username ?? username;
      avatar = profile.avatar ?? "😀";
      bio = profile.bio ?? "";
    }
  } catch {
    avatar = "😀";
    bio = "";
  }

  const elements = getChatElements();

  if (elements) {
    bindChatSession({
      socket,
      elements,
      username,
      avatar,
      bio,
      clientId: getClientId(),
      roomName,
    });
  }

  socket.connect();
});
}