const MAX_ROOM_NAME_LENGTH = 30;

export type Room = {
  id: string;
  name: string;
  createdAt: string;
};

// Built-in rooms that always exist, even after a server restart
const DEFAULT_ROOMS: Room[] = [
  { id: "general", name: "General", createdAt: new Date().toISOString() },
  { id: "random", name: "Random", createdAt: new Date().toISOString() },
];

const rooms = new Map<string, Room>(DEFAULT_ROOMS.map((room) => [room.id, room]));

function normalizeRoomName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function findRoomByName(name: string): Room | undefined {
  const normalized = normalizeRoomName(name).toLowerCase();
  return [...rooms.values()].find((room) => room.name.toLowerCase() === normalized);
}

export function isValidRoomName(name: unknown): name is string {
  return (
    typeof name === "string" &&
    normalizeRoomName(name).length > 0 &&
    normalizeRoomName(name).length <= MAX_ROOM_NAME_LENGTH
  );
}

export function getRooms(): Room[] {
  return [...rooms.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getRoom(roomId: string): Room {
  return rooms.get(roomId) ?? DEFAULT_ROOMS[0];
}

export function getOrCreateRoom(name: unknown): Room | null {
  if (!isValidRoomName(name)) return null;

  const existingRoom = findRoomByName(name);
  if (existingRoom) return existingRoom;

  const room = {
    id: crypto.randomUUID(),
    name: normalizeRoomName(name),
    createdAt: new Date().toISOString(),
  };

  rooms.set(room.id, room);
  return room;
}
