// In-memory user store (resets on server restart)
export type User = {
  id: string;
  username: string;
  passwordHash: string;
};

const users = new Map<string, User>(); // key: username (lowercase), value: user

export function findUserByUsername(username: string): User | null {
  return users.get(username.toLowerCase().trim()) ?? null;
}

export function createUser(username: string, passwordHash: string): User {
  const user = {
    id: crypto.randomUUID(),
    username: username.trim(),
    passwordHash,
  };
  users.set(username.toLowerCase().trim(), user);
  return user;
}
