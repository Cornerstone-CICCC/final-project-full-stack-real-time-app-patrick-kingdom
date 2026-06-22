export const SERVER_URL = import.meta.env.PUBLIC_SERVER_URL ?? "http://localhost:3000";

export async function getSessionUsername() {
  try {
    const res = await fetch(`${SERVER_URL}/api/auth/me`, {
      credentials: "include",
    });
    if (!res.ok) return null;

    const data = await res.json();
    return typeof data.username === "string" ? data.username : null;
  } catch {
    return null;
  }
}

export async function redirectAuthenticated(path = "/") {
  const username = await getSessionUsername();
  if (username) {
    window.location.href = path;
  }
}

export async function renderHomeAuthState() {
  const authNav = document.getElementById("auth-nav");
  const heroGreeting = document.getElementById("hero-greeting");
  const username = await getSessionUsername();

  if (authNav) {
    authNav.innerHTML = username
      ? `<button id="account-btn" class="rounded border border-white bg-black px-4 py-2 text-white hover:bg-white hover:text-black">account</button>`
      : `
        <a class="rounded border border-white bg-white px-4 py-2 text-black hover:bg-black hover:text-white" href="/login">login</a>
        <a class="rounded border border-white bg-white px-4 py-2 text-black hover:bg-black hover:text-white" href="/register">register</a>
      `;
  }

  if (heroGreeting) {
    heroGreeting.textContent = `Hello, ${username ?? "guest"}!`;
  }
}
