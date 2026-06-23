export interface Message {
  id: string;
  roomId: string;
  username: string;
  avatar?: string;
  bio?: string;
  text: string;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  createdAt: string;
}

export interface Notice {
  id: string;
  text: string;
  createdAt: string;
}