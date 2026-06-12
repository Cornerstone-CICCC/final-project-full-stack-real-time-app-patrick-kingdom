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

const SERVER_URL = import.meta.env.PUBLIC_SERVER_URL ?? "http://localhost:3000";

const joinScreen = document.getElementById("join-screen") as HTMLElement;
const joinForm = document.getElementById("join-form") as HTMLFormElement;
const usernameInput = document.getElementById("username") as HTMLInputElement;
const roomNameInput = document.getElementById("room-name") as HTMLInputElement;
const roomList = document.getElementById("room-list") as HTMLUListElement;

const chatScreen = document.getElementById("chat-screen") as HTMLElement;
const currentRoom = document.getElementById("current-room") as HTMLElement;
const currentUser = document.getElementById("current-user") as HTMLElement;
const messageList = document.getElementById("message-list") as HTMLUListElement;
const messageForm = document.getElementById("message-form") as HTMLFormElement;
const messageInput = document.getElementById("message-input") as HTMLInputElement;
const onlineUserList = document.getElementById("online-user-list") as HTMLUListElement;
const leaveButton = document.getElementById("leave-button") as HTMLButtonElement;

let username = "";
let activeRoom: Room | null = null;
const socket = io(SERVER_URL, { autoConnect: false });

// Messages hidden only on this screen (survives history reloads in this session)
const locallyDeletedIds = new Set<string>();

function removeMessageElement(messageId: string) {
  messageList.querySelector(`[data-message-id="${messageId}"]`)?.remove();
}

function createActionButton(label: string, onClick: () => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "text-xs text-gray-600 underline hover:text-black";
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
  header.className = "flex items-center gap-3";

  const meta = document.createElement("p");
  meta.className = "text-xs text-gray-600";
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
  body.className = "border border-black px-3 py-2";
  body.textContent = message.text;

  item.append(header, body);
  messageList.appendChild(item);
  messageList.scrollTop = messageList.scrollHeight;
}

function renderNotice(notice: Notice) {
  const item = document.createElement("li");
  item.className = "py-1 text-center text-xs text-gray-600";
  item.textContent = notice.text;
  messageList.appendChild(item);
  messageList.scrollTop = messageList.scrollHeight;
}

function renderOnlineUsers(users: string[]) {
  onlineUserList.innerHTML = "";

  users.forEach((user) => {
    const item = document.createElement("li");
    item.className = "border border-black px-2 py-1";
    item.textContent = user === username ? `${user} (you)` : user;
    onlineUserList.appendChild(item);
  });
}

function renderRooms(rooms: Room[]) {
  roomList.innerHTML = "";

  rooms.forEach((room) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "border border-black px-2 py-1 hover:bg-black hover:text-white";
    button.textContent = room.name;
    button.addEventListener("click", () => {
      roomNameInput.value = room.name;
      usernameInput.focus();
    });
    item.appendChild(button);
    roomList.appendChild(item);
  });
}

async function loadHistory() {
  if (!activeRoom) return;

  try {
    const params = new URLSearchParams({ roomId: activeRoom.id });
    const res = await fetch(`${SERVER_URL}/api/messages?${params}`);
    const messages: Message[] = await res.json();
    messageList.innerHTML = "";
    messages.forEach(renderMessage);
  } catch {
    console.error("Failed to load message history");
  }
}

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  username = usernameInput.value.trim();
  const roomName = roomNameInput.value.trim();
  if (!username || !roomName) return;

  joinScreen.hidden = true;
  chatScreen.hidden = false;
  currentRoom.textContent = roomName;
  currentUser.textContent = `Joining as ${username}`;
  messageInput.focus();

  socket.connect();
  socket.emit("chat:join", { username, roomName });
});

leaveButton.addEventListener("click", () => {
  socket.emit("chat:leave");

  // Reset username so a reconnect does not auto-rejoin the room
  username = "";
  activeRoom = null;
  messageList.innerHTML = "";
  onlineUserList.innerHTML = "";

  chatScreen.hidden = true;
  joinScreen.hidden = false;
  usernameInput.focus();
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit("chat:send", { username, text });
  messageInput.value = "";
});

socket.on("chat:message", renderMessage);
socket.on("chat:notice", renderNotice);
socket.on("chat:unsent", ({ messageId }: { messageId: string }) => {
  removeMessageElement(messageId);
});
socket.on("chat:joined", (room: Room) => {
  activeRoom = room;
  currentRoom.textContent = `${room.name} Room`;
  currentUser.textContent = `Joined as ${username}`;
  loadHistory();
});
socket.on("rooms:list", renderRooms);
socket.on("users:online", renderOnlineUsers);

socket.on("connect_error", () => {
  currentUser.textContent = "Connection to server failed";
});

socket.on("connect", () => {
  if (username) {
    socket.emit("chat:join", { username, roomName: roomNameInput.value.trim() });
  }
});

socket.connect();
