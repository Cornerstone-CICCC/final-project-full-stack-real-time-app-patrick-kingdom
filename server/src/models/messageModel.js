// In-memory message store (resets on server restart)
const MAX_MESSAGES = 100;

const messages = [];

export function getMessages() {
  return messages;
}

export function addMessage({ username, text }) {
  const message = {
    id: crypto.randomUUID(),
    username,
    text,
    createdAt: new Date().toISOString(),
  };

  messages.push(message);
  if (messages.length > MAX_MESSAGES) {
    messages.shift();
  }

  return message;
}
