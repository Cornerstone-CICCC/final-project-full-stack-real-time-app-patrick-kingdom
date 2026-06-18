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
export function updateUsername(userId: string, newUsername: string): User | null {
  const username = newUsername.trim();

  for (const [key, user] of users.entries()) {
    if (user.id === userId) {
      users.delete(key);

      const updatedUser = {
        ...user,
        username,
      };

      users.set(username.toLowerCase(), updatedUser);
      return updatedUser;
    }
  }

  return null;
}