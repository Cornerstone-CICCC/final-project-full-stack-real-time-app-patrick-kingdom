import { io } from "socket.io-client";

interface Message {
  id: string;
  username: string;
  text: string;
  createdAt: string;
}

const SERVER_URL = import.meta.env.PUBLIC_SERVER_URL ?? "http://localhost:3000";

const joinScreen = document.getElementById("join-screen") as HTMLElement;
const joinForm = document.getElementById("join-form") as HTMLFormElement;
const usernameInput = document.getElementById("username") as HTMLInputElement;

const chatScreen = document.getElementById("chat-screen") as HTMLElement;
const currentUser = document.getElementById("current-user") as HTMLElement;
const messageList = document.getElementById("message-list") as HTMLUListElement;
const messageForm = document.getElementById("message-form") as HTMLFormElement;
const messageInput = document.getElementById("message-input") as HTMLInputElement;

let username = "";
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

async function loadHistory() {
  try {
    const res = await fetch(`${SERVER_URL}/api/messages`);
    const messages: Message[] = await res.json();
    messages.forEach(renderMessage);
  } catch {
    console.error("Failed to load message history");
  }
}

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  username = usernameInput.value.trim();
  if (!username) return;

  joinScreen.hidden = true;
  chatScreen.hidden = false;
  currentUser.textContent = `Joined as ${username}`;
  messageInput.focus();

  loadHistory();
  socket.connect();
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit("chat:send", { username, text });
  messageInput.value = "";
});

socket.on("chat:message", renderMessage);

socket.on("connect_error", () => {
  currentUser.textContent = "Connection to server failed";
});

socket.on("connect", () => {
  currentUser.textContent = `Joined as ${username}`;
});
