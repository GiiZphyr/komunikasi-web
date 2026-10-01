const THEME_KEY = "theme";
const root = document.documentElement;

export function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);

  const systemTheme = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";

  const theme = savedTheme || systemTheme;

  root.setAttribute("data-theme", theme);
}

export function toggleTheme() {
  const currentTheme =
    root.getAttribute("data-theme") || "light";

  const newTheme =
    currentTheme === "dark"
      ? "light"
      : "dark";

  root.setAttribute("data-theme", newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
}

initTheme();