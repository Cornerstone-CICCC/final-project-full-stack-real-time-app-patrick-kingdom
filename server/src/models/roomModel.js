const MAX_ROOM_NAME_LENGTH = 30;
const DEFAULT_ROOM = {
  id: "general",
  name: "General",
  createdAt: new Date().toISOString(),
};

const rooms = new Map([[DEFAULT_ROOM.id, DEFAULT_ROOM]]);

function normalizeRoomName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function findRoomByName(name) {
  const normalized = normalizeRoomName(name).toLowerCase();
  return [...rooms.values()].find((room) => room.name.toLowerCase() === normalized);
}

export function isValidRoomName(name) {
  return (
    typeof name === "string" &&
    normalizeRoomName(name).length > 0 &&
    normalizeRoomName(name).length <= MAX_ROOM_NAME_LENGTH
  );
}

export function getRooms() {
  return [...rooms.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getRoom(roomId) {
  return rooms.get(roomId) ?? DEFAULT_ROOM;
}

export function getOrCreateRoom(name) {
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
