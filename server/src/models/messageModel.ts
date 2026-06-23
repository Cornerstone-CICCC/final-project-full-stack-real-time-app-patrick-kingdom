const MAX_MESSAGES = 100;

export type Message = {
  id: string;
  roomId: string;
  username: string;
  avatar?: string;
  bio?: string;
  text: string;
  createdAt: string;
};

type MessageInput = {
  roomId?: string;
  username: string;
  avatar?: string;
  bio?: string;
  text: string;
};

type RemoveMessageInput = {
  roomId: string;
  messageId: string;
  username: string;
};

const messagesByRoom = new Map<string, Message[]>();

export function getMessages(roomId = "general"): Message[] {
  return messagesByRoom.get(roomId) ?? [];
}

export function addMessage({
  roomId = "general",
  username,
  avatar = "😀",
  bio = "",
  text,
}: MessageInput): Message {
  const message = {
    id: crypto.randomUUID(),
    roomId,
    username,
    avatar,
    bio,
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

export function removeMessage({
  roomId,
  messageId,
  username,
}: RemoveMessageInput): boolean {
  const messages = getMessages(roomId);

  const index = messages.findIndex(
    (message) => message.id === messageId && message.username === username
  );

  if (index === -1) return false;

  messages.splice(index, 1);
  return true;
}