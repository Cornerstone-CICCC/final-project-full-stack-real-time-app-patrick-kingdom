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
    button.className = "text-xs text-black underline hover:no-underline";
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function renderMessage(message: Message) {
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
      item.className = "rounded border border-black bg-white px-2 py-1 text-black";
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
