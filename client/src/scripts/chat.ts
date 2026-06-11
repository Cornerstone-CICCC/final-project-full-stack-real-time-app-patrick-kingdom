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

let username = "";
let activeRoom: Room | null = null;
const socket = io(SERVER_URL, { autoConnect: false });

function renderMessage(message: Message) {
  const item = document.createElement("li");
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const header = document.createElement("p");
  header.className = "text-xs text-gray-600";
  header.textContent = `${message.username} · ${time}`;

  const body = document.createElement("p");
  body.className = "border border-black px-3 py-2";
  body.textContent = message.text;

  item.append(header, body);
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
    const res = await fetch(`${SERVER_URL}/api/messages?${params}`, {
      credentials: "include",
    });
    const messages: Message[] = await res.json();
    messageList.innerHTML = "";
    messages.forEach(renderMessage);
  } catch {
    console.error("Failed to load message history");
  }
}

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  // Line below changed from: username = usernameInput.value.trim(); 
  username = (window as any).__USERNAME__;
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

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit("chat:send", { username, text });
  messageInput.value = "";
});

socket.on("chat:message", renderMessage);
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
