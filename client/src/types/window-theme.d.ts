declare global {
  interface Window {
    __currentTheme?: "day" | "night";
    __applyTheme?: (theme: "day" | "night") => void;
  }
}

export {};
