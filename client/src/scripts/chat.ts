import { io } from "socket.io-client";

interface Message {
  id: string;
  roomId: string;
  username: string;
  text: string;
  createdAt: string;
}

interface Room {
  id: string;
  name: string;
  createdAt: string;
}

interface Notice {
  id: string;
  text: string;
  createdAt: string;
}

declare global {
  interface Window {
    __DEFAULT_ROOM_NAME__?: string;
    __CHAT_DESKTOP_ONLY__?: boolean;
  }
}

const SERVER_URL = import.meta.env.PUBLIC_SERVER_URL ?? "http://localhost:3000";

const chatScreen = document.getElementById("chat-screen") as HTMLElement | null;
const currentRoom = document.getElementById("current-room") as HTMLElement | null;
const currentUser = document.getElementById("current-user") as HTMLElement | null;
const messageList = document.getElementById("message-list") as HTMLUListElement | null;
const messageForm = document.getElementById("message-form") as HTMLFormElement | null;
const messageInput = document.getElementById("message-input") as HTMLInputElement | null;
const onlineUserList = document.getElementById("online-user-list") as HTMLUListElement | null;
const leaveButton = document.getElementById("leave-button") as HTMLButtonElement | null;
const visitorsToggle = document.getElementById("visitors-toggle") as HTMLButtonElement | null;
const visitorsBack = document.getElementById("visitors-back") as HTMLButtonElement | null;
const mobileChatPanel = document.getElementById("mobile-chat-panel") as HTMLElement | null;
const visitorsPanel = document.getElementById("visitors-panel") as HTMLElement | null;
const roomGroupsList = document.getElementById("room-groups-list") as HTMLElement | null;
const roomGroupsStatus = document.getElementById("room-groups-status") as HTMLElement | null;
const shouldStartChat =
  !window.__CHAT_DESKTOP_ONLY__ || window.matchMedia("(min-width: 1024px)").matches;
const shouldConnectSocket = Boolean(roomGroupsList) || shouldStartChat;

if (shouldConnectSocket) {
  const requestedRoomName = new URLSearchParams(window.location.search).get("room")?.trim();
  const defaultRoomName = requestedRoomName || window.__DEFAULT_ROOM_NAME__ || "General";
  const hasChatElements =
    shouldStartChat &&
    chatScreen &&
    currentRoom &&
    currentUser &&
    messageList &&
    messageForm &&
    messageInput &&
    onlineUserList;

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

  async function getSessionUsername() {
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/me`, {
        credentials: "include",
      });
      if (!res.ok) return null;

      const data = await res.json();
      return typeof data.username === "string" ? data.username : null;
    } catch {
      return null;
    }
  }

  let username = "";
  const clientId = getClientId();
  let activeRoom: Room | null = null;
  let activeRoomLabel = `${defaultRoomName} Room`;
  let isVisitorsViewOpen = false;
  const socket = io(SERVER_URL, { autoConnect: false });

  const locallyDeletedIds = new Set<string>();

  function setVisitorsView(isOpen: boolean) {
    if (!currentRoom || !visitorsToggle || !visitorsBack || !mobileChatPanel || !visitorsPanel) return;

    isVisitorsViewOpen = isOpen;
    visitorsToggle.setAttribute("aria-pressed", String(isOpen));
    currentRoom.textContent = isOpen ? "Visitors" : activeRoomLabel;
    visitorsToggle.classList.toggle("hidden", isOpen);
    visitorsToggle.classList.toggle("grid", !isOpen);
    visitorsBack.classList.toggle("hidden", !isOpen);
    visitorsBack.classList.toggle("grid", isOpen);
    mobileChatPanel.classList.toggle("hidden", isOpen);
    visitorsPanel.classList.toggle("hidden", !isOpen);
    visitorsPanel.classList.toggle("block", isOpen);
  }

  function removeMessageElement(messageId: string) {
    messageList?.querySelector(`[data-message-id="${messageId}"]`)?.remove();
  }

  function createActionButton(label: string, onClick: () => void) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "text-xs text-black underline hover:no-underline";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function renderMessage(message: Message) {
    if (!messageList) return;
    if (locallyDeletedIds.has(message.id)) return;

    const item = document.createElement("li");
    item.dataset.messageId = message.id;

    const time = new Date(message.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const header = document.createElement("div");
    header.className = "flex flex-wrap items-center gap-x-3 gap-y-1";

    const meta = document.createElement("p");
    meta.className = "text-xs font-semibold text-black";
    meta.textContent = `${message.username} · ${time}`;
    header.appendChild(meta);

    header.appendChild(
      createActionButton("Copy", () => {
        navigator.clipboard.writeText(message.text);
      })
    );

    header.appendChild(
      createActionButton("Delete", () => {
        locallyDeletedIds.add(message.id);
        removeMessageElement(message.id);
      })
    );

    if (message.username === username) {
      header.appendChild(
        createActionButton("Unsend", () => {
          socket.emit("chat:unsend", { messageId: message.id });
        })
      );
    }

    const body = document.createElement("p");
    body.className = "mt-1 rounded border border-black bg-white px-3 py-2 text-black";
    body.textContent = message.text;

    item.append(header, body);
    messageList.appendChild(item);
    messageList.scrollTop = messageList.scrollHeight;
  }

  function renderNotice(notice: Notice) {
    if (!messageList) return;

    const item = document.createElement("li");
    item.className = "py-1 text-center text-xs text-black";
    item.textContent = notice.text;
    messageList.appendChild(item);
    messageList.scrollTop = messageList.scrollHeight;
  }

  function renderOnlineUsers(users: string[]) {
    if (!onlineUserList) return;

    onlineUserList.innerHTML = "";

    users.forEach((user) => {
      const item = document.createElement("li");
      item.className = "rounded border border-black bg-white px-2 py-1 text-black";
      item.textContent = user === username ? `${user} (you)` : user;
      onlineUserList.appendChild(item);
    });
  }

  async function loadHistory() {
    if (!activeRoom || !messageList || !currentUser) return;

    try {
      const params = new URLSearchParams({ roomId: activeRoom.id });
      const res = await fetch(`${SERVER_URL}/api/messages?${params}`, {
        credentials: "include",
      });
      const messages: Message[] = await res.json();
      messageList.innerHTML = "";
      messages.forEach(renderMessage);
    } catch {
      currentUser.textContent = "Failed to load message history";
    }
  }

  function joinDefaultRoom() {
    if (!currentRoom || !currentUser) return;

    activeRoomLabel = `${defaultRoomName} Room`;
    currentRoom.textContent = activeRoomLabel;
    currentUser.textContent = `Joining as ${username}`;
    socket.emit("chat:join", { username, roomName: defaultRoomName, clientId });
  }

  function getRoomDescription(roomName: string) {
    const normalizedName = roomName.toLowerCase();

    if (normalizedName === "general") return "Talk with everyone in the main chat room.";
    if (normalizedName === "random") return "Drop into a casual room for open conversation.";

    return `Join the ${roomName} room and start a live conversation.`;
  }

  function renderRoomGroups(rooms: Room[]) {
    if (!roomGroupsList) return;

    roomGroupsList.innerHTML = "";
    const sortedRooms = [...rooms].sort((a, b) => a.name.localeCompare(b.name));

    sortedRooms.forEach((room) => {
      const card = document.createElement("a");
      card.href = `/chat?room=${encodeURIComponent(room.name)}`;
      card.className =
        "group flex min-h-[360px] flex-col overflow-hidden rounded border border-black bg-white text-black hover:bg-black hover:text-white";

      const title = document.createElement("div");
      title.className =
        "border-b border-black bg-white px-4 py-3 text-center text-xl font-bold text-black group-hover:bg-black group-hover:text-white";
      title.textContent = room.name;

      const preview = document.createElement("div");
      preview.className =
        "grid aspect-[16/10] place-items-center border-b border-black bg-white text-black group-hover:bg-black group-hover:text-white";

      const initial = document.createElement("span");
      initial.className = "text-6xl font-bold";
      initial.textContent = room.name.trim().charAt(0).toUpperCase() || "?";
      preview.appendChild(initial);

      const description = document.createElement("p");
      description.className =
        "flex flex-1 items-center justify-center px-5 py-8 text-center text-xl leading-relaxed";
      description.textContent = getRoomDescription(room.name);

      card.append(title, preview, description);
      roomGroupsList.appendChild(card);
    });

    if (roomGroupsStatus) {
      const roomText = sortedRooms.length === 1 ? "1 room available." : `${sortedRooms.length} rooms available.`;
      roomGroupsStatus.textContent = roomText;
    }
  }

  if (hasChatElements && messageForm && messageInput && messageList && onlineUserList) {
    messageForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = messageInput.value.trim();
      if (!text) return;

      socket.emit("chat:send", { text });
      messageInput.value = "";
    });

    leaveButton?.addEventListener("click", () => {
      socket.emit("chat:leave");
      messageList.innerHTML = "";
      onlineUserList.innerHTML = "";
    });

    socket.on("chat:message", renderMessage);
    socket.on("chat:notice", renderNotice);
    socket.on("chat:unsent", ({ messageId }: { messageId: string }) => {
      removeMessageElement(messageId);
    });
    socket.on("chat:joined", (room: Room) => {
      activeRoom = room;
      activeRoomLabel = `${room.name} Room`;
      currentRoom.textContent = isVisitorsViewOpen ? "Visitors" : activeRoomLabel;
      currentUser.textContent = `Joined as ${username}`;
      loadHistory();
    });
    socket.on("users:online", renderOnlineUsers);

    socket.on("connect_error", () => {
      currentUser.textContent = "Connection to server failed";
    });

    socket.on("connect", joinDefaultRoom);

    visitorsToggle?.addEventListener("click", () => {
      const isOpen = visitorsToggle.getAttribute("aria-pressed") !== "true";
      setVisitorsView(isOpen);
    });

    visitorsBack?.addEventListener("click", () => {
      setVisitorsView(false);
    });
  }

  socket.on("rooms:list", renderRoomGroups);

  getSessionUsername().then((authenticatedUsername) => {
    username = authenticatedUsername ?? generateGuestName();
    socket.connect();
  });
}
