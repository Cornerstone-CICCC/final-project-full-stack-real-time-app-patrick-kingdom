interface VisitorsPanelElements {
  currentRoom: HTMLElement;
  visitorsToggle: HTMLButtonElement | null;
  visitorsBack: HTMLButtonElement | null;
  mobileChatPanel: HTMLElement | null;
  visitorsPanel: HTMLElement | null;
}

export function createVisitorsPanel(elements: VisitorsPanelElements) {
  let isOpen = false;

  function setOpen(nextIsOpen: boolean, activeRoomLabel: string) {
    const { currentRoom, visitorsToggle, visitorsBack, mobileChatPanel, visitorsPanel } = elements;
    if (!visitorsToggle || !visitorsBack || !mobileChatPanel || !visitorsPanel) return;

    isOpen = nextIsOpen;
    visitorsToggle.setAttribute("aria-pressed", String(nextIsOpen));
    currentRoom.textContent = nextIsOpen ? "Visitors" : activeRoomLabel;
    visitorsToggle.classList.toggle("hidden", nextIsOpen);
    visitorsToggle.classList.toggle("grid", !nextIsOpen);
    visitorsBack.classList.toggle("hidden", !nextIsOpen);
    visitorsBack.classList.toggle("grid", nextIsOpen);
    mobileChatPanel.classList.toggle("hidden", nextIsOpen);
    visitorsPanel.classList.toggle("hidden", !nextIsOpen);
    visitorsPanel.classList.toggle("block", nextIsOpen);
  }

  return {
    get isOpen() {
      return isOpen;
    },
    setOpen,
  };
}
