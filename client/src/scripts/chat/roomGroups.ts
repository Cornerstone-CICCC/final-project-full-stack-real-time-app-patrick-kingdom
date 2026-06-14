import type { Room } from "./types";

function getRoomDescription(roomName: string) {
  const normalizedName = roomName.toLowerCase();

  if (normalizedName === "general") return "Talk with everyone in the main chat room.";
  if (normalizedName === "random") return "Drop into a casual room for open conversation.";

  return `Join the ${roomName} room and start a live conversation.`;
}

export function renderRoomGroups(rooms: Room[], list: HTMLElement, status: HTMLElement | null) {
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
      "grid aspect-[16/10] place-items-center border-b border-black bg-white text-black group-hover:bg-black group-hover:text-white";

    const initial = document.createElement("span");
    initial.className = "text-6xl font-bold";
    initial.textContent = room.name.trim().charAt(0).toUpperCase() || "?";
    preview.appendChild(initial);

    const description = document.createElement("p");
    description.className =
      "flex flex-1 items-center justify-center px-5 py-8 text-center text-xl leading-relaxed";
    description.textContent = getRoomDescription(room.name);

    card.append(title, preview, description);
    list.appendChild(card);
  });

  if (status) {
    status.textContent =
      sortedRooms.length === 1 ? "1 room available." : `${sortedRooms.length} rooms available.`;
  }
}
