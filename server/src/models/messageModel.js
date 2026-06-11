// In-memory message store (resets on server restart)
const MAX_MESSAGES = 100;

const messagesByRoom = new Map();

export function getMessages(roomId = "general") {
  return messagesByRoom.get(roomId) ?? [];
}

export function addMessage({ roomId = "general", username, text }) {
  const message = {
    id: crypto.randomUUID(),
    roomId,
    username,
    text,
    createdAt: new Date().toISOString(),
  };

  const messages = getMessages(roomId);
  messages.push(message);
  if (messages.length > MAX_MESSAGES) {
    messages.shift();
  }
  messagesByRoom.set(roomId, messages);

  return message;
}

// Removes a message only if it belongs to the given username
export function removeMessage({ roomId, messageId, username }) {
  const messages = getMessages(roomId);
  const index = messages.findIndex(
    (message) => message.id === messageId && message.username === username
  );

  if (index === -1) return false;

  messages.splice(index, 1);
  return true;
}
