// In-memory user store (resets on server restart)
const users = new Map(); // key: username (lowercase), value: { id, username, passwordHash }

export function findUserByUsername(username) {
  return users.get(username.toLowerCase().trim()) ?? null;
}

export function createUser(username, passwordHash) {
  const user = {
    id: crypto.randomUUID(),
    username: username.trim(),
    passwordHash,
  };
  users.set(username.toLowerCase().trim(), user);
  return user;
}