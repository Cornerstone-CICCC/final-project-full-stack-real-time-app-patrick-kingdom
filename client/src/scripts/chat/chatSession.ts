import type { Socket } from "socket.io-client";
import { SERVER_URL } from "../auth";
import { createVisitorsPanel } from "./visitorsPanel";
import type { Message, Notice, Room } from "./types";

interface ChatSessionElements {
  currentRoom: HTMLElement;
  currentUser: HTMLElement;
  messageList: HTMLUListElement;
  messageForm: HTMLFormElement;
  messageInput: HTMLInputElement;
  onlineUserList: HTMLUListElement;
  visitorsToggle: HTMLButtonElement | null;
  visitorsBack: HTMLButtonElement | null;
  mobileChatPanel: HTMLElement | null;
  visitorsPanel: HTMLElement | null;
}

interface ChatSessionOptions {
  socket: Socket;
  elements: ChatSessionElements;
  username: string;
  clientId: string;
  roomName: string;
}

export function bindChatSession({ socket, elements, username, clientId, roomName }: ChatSessionOptions) {
  const {
    currentRoom,
    currentUser,
    messageList,
    messageForm,
    messageInput,
    onlineUserList,
  } = elements;
  const locallyDeletedIds = new Set<string>();
  const visitorsPanel = createVisitorsPanel(elements);
  let activeRoom: Room | null = null;
  let activeRoomLabel = `${roomName} Room`;

  function removeMessageElement(messageId: string) {
    messageList.querySelector(`[data-message-id="${messageId}"]`)?.remove();
  }

  function createActionButton(label: string, onClick: () => void) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "w-full rounded-xl px-3 py-0 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function renderMessage(message: Message) {
    if (locallyDeletedIds.has(message.id)) return;

    const item = document.createElement("li");
    item.dataset.messageId = message.id;
    item.className = "group relative rounded-[28px] border border-black/10 bg-white px-3 py-0 shadow-sm transition-colors duration-150 hover:border-black/20 hover:bg-slate-50";

    const time = new Date(message.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const topRow = document.createElement("div");
    topRow.className = "flex items-center justify-between gap-0";

    const meta = document.createElement("div");
    meta.className = "flex items-center gap-2 text-[10px] font-semibold text-slate-600";

    const author = document.createElement("span");
    author.textContent = message.username;
    meta.appendChild(author);

    const timestamp = document.createElement("span");
    timestamp.className = "hidden text-slate-500 group-hover:inline-flex";
    timestamp.textContent = time;
    meta.appendChild(timestamp);

    topRow.appendChild(meta);

    const menuToggle = document.createElement("button");
    menuToggle.type = "button";
    menuToggle.className = "relative inline-flex h-0 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none";
    menuToggle.innerHTML = "<span class='text-base'>⋯</span>";

    const menu = document.createElement("div");
    menu.className = "hidden absolute right-4 top-0.5 z-10 min-w-[150px] rounded-2xl border border-black/10 bg-white p-1 shadow-lg";
    menu.addEventListener("click", (event) => event.stopPropagation());

    const copyBtn = createActionButton("Copy", () => {
      navigator.clipboard.writeText(message.text);
      menu.classList.add("hidden");
    });
    const deleteBtn = createActionButton("Delete", () => {
      locallyDeletedIds.add(message.id);
      removeMessageElement(message.id);
      menu.classList.add("hidden");
    });

    menu.appendChild(copyBtn);
    menu.appendChild(deleteBtn);

    if (message.username === username) {
      const unsendBtn = createActionButton("Unsend", () => {
        socket.emit("chat:unsend", { messageId: message.id });
        menu.classList.add("hidden");
      });
      menu.appendChild(unsendBtn);
    }

    menuToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.classList.toggle("hidden");
    });

    document.addEventListener("click", () => {
      menu.classList.add("hidden");
    });

    topRow.appendChild(menuToggle);
    item.appendChild(topRow);
    item.appendChild(menu);

    const body = document.createElement("p");
    body.className = "mt-0 text-sm leading-5 y-2 text-slate-900";
    body.textContent = message.text;

    item.appendChild(body);
    messageList.appendChild(item);
    messageList.scrollTop = messageList.scrollHeight;
  }

  function renderNotice(notice: Notice) {
    const item = document.createElement("li");
    item.className = "py-1 text-center text-xs text-black";
    item.textContent = notice.text;
    messageList.appendChild(item);
    messageList.scrollTop = messageList.scrollHeight;
  }

  function renderOnlineUsers(users: string[]) {
    onlineUserList.innerHTML = "";

    users.forEach((user) => {
      const item = document.createElement("li");
      item.className = "group relative rounded-[28px] rounded border border-black bg-white px-2 py-1 text-black";
      item.textContent = user === username ? `${user} (you)` : user;
      onlineUserList.appendChild(item);
    });
  }

  async function loadHistory() {
    if (!activeRoom) return;

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

  function joinRoom() {
    activeRoomLabel = `${roomName} Room`;
    currentRoom.textContent = activeRoomLabel;
    currentUser.textContent = `Joining as ${username}`;
    socket.emit("chat:join", { username, roomName, clientId });
  }

  messageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    socket.emit("chat:send", { text });
    messageInput.value = "";
  });

  socket.on("chat:message", renderMessage);
  socket.on("chat:notice", renderNotice);
  socket.on("chat:unsent", ({ messageId }: { messageId: string }) => {
    removeMessageElement(messageId);
  });
  socket.on("chat:joined", (room: Room) => {
    activeRoom = room;
    activeRoomLabel = `${room.name} Room`;
    currentRoom.textContent = visitorsPanel.isOpen ? "Visitors" : activeRoomLabel;
    currentUser.textContent = `Joined as ${username}`;
    loadHistory();
  });
  socket.on("users:online", renderOnlineUsers);
  socket.on("connect_error", () => {
    currentUser.textContent = "Connection to server failed";
  });
  socket.on("connect", joinRoom);

  elements.visitorsToggle?.addEventListener("click", () => {
    const isOpen = elements.visitorsToggle?.getAttribute("aria-pressed") !== "true";
    visitorsPanel.setOpen(isOpen, activeRoomLabel);
  });

  elements.visitorsBack?.addEventListener("click", () => {
    visitorsPanel.setOpen(false, activeRoomLabel);
  });
}
