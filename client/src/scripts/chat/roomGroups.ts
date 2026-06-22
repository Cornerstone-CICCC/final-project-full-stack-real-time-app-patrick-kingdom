import type { Room } from "./types";

const MAX_ROOM_NAME_LENGTH = 10;

type CreateRoomHandler = (roomName: string) => void;

function getRoomDescription(roomName: string) {
  const normalizedName = roomName.toLowerCase();

  if (normalizedName === "general") return "Talk with everyone in the main chat room.";
  if (normalizedName === "random") return "Drop into a casual room for open conversation.";

  return `Join the ${roomName} room and start a live conversation.`;
}

function createAddRoomCard(onCreateRoom: CreateRoomHandler) {
  const form = document.createElement("form");
  form.className =
    "group flex min-h-[360px] flex-col overflow-hidden rounded border border-black bg-white text-black hover:bg-black hover:text-white";

  const title = document.createElement("div");
  title.className =
    "border-b border-black bg-white px-4 py-3 text-center text-xl font-bold text-black group-hover:bg-black group-hover:text-white";
  title.textContent = "Add room";

  const preview = document.createElement("div");
  preview.className =
    "relative grid aspect-[16/10] place-items-center border-b border-black bg-white text-black group-hover:bg-black group-hover:text-white";

  const plus = document.createElement("span");
  plus.className = "text-6xl font-bold";
  plus.textContent = "+";
  preview.appendChild(plus);

  const body = document.createElement("div");
  body.className = "flex flex-1 flex-col justify-center gap-4 px-5 py-8";

  const label = document.createElement("label");
  label.className = "sr-only";
  label.htmlFor = "new-room-name";
  label.textContent = "Room name";

  const input = document.createElement("input");
  input.id = "new-room-name";
  input.name = "roomName";
  input.type = "text";
  input.maxLength = MAX_ROOM_NAME_LENGTH;
  input.required = true;
  input.placeholder = "Room name";
  input.className =
    "w-full rounded border border-black bg-white px-4 py-3 text-center text-xl font-bold text-black outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-black group-hover:border-white group-hover:focus:ring-white";

  const button = document.createElement("button");
  button.type = "submit";
  button.className =
    "rounded border border-black bg-black px-4 py-3 text-xl font-bold text-white hover:bg-white hover:text-black group-hover:border-white group-hover:bg-white group-hover:text-black";
  button.textContent = "Create";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const roomName = input.value.trim().replace(/\s+/g, " ");
    if (!roomName) return;

    button.disabled = true;
    onCreateRoom(roomName);
    input.value = "";
    button.disabled = false;
  });

  body.append(label, input, button);
  form.append(title, preview, body);
  return form;
}

export function renderRoomGroups(
  rooms: Room[],
  list: HTMLElement,
  status: HTMLElement | null,
  onCreateRoom?: CreateRoomHandler,
) {
  list.innerHTML = "";
  const sortedRooms = [...rooms].sort((a, b) => a.name.localeCompare(b.name));

  sortedRooms.forEach((room) => {
    const card = document.createElement("a");
    card.href = `/chat?room=${encodeURIComponent(room.name)}`;
    card.className =
      "group flex min-h-[360px] flex-col overflow-hidden rounded border border-black bg-white text-black hover:bg-black hover:text-white";

    const title = document.createElement("div");
    title.className =
      "border-b border-black bg-white px-4 py-3 text-center text-xl font-bold text-black group-hover:bg-black group-hover:text-white";
    title.textContent = room.name;

    const preview = document.createElement("div");
    preview.className =
      "relative grid aspect-[16/10] place-items-center border-b border-black bg-white text-black group-hover:bg-black group-hover:text-white";

    if (room.name.toLowerCase() === "general") {
      const gif = document.createElement("img");
      gif.src = "/general_idle.gif";
      gif.alt = "General room preview animation";
      gif.className = "h-full w-full object-cover";
      preview.appendChild(gif);
    } else {
      const initial = document.createElement("span");
      initial.className = "text-6xl font-bold";
      initial.textContent = room.name.trim().charAt(0).toUpperCase() || "?";
      preview.appendChild(initial);
    }

    const description = document.createElement("p");
    description.className =
      "flex flex-1 items-center justify-center px-5 py-8 text-center text-xl leading-relaxed";
    description.textContent = getRoomDescription(room.name);

    card.append(title, preview, description);
    list.appendChild(card);
  });

  if (onCreateRoom) {
    list.appendChild(createAddRoomCard(onCreateRoom));
  }

  if (status) {
    status.textContent =
      sortedRooms.length === 1 ? "1 room available." : `${sortedRooms.length} rooms available.`;
  }
}
