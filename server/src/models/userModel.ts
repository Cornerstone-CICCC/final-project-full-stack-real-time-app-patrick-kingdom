export type User = {
  id: string;
  username: string;
  passwordHash: string;
  bio?: string;
  avatar?: string;
};

const users = new Map<string, User>();

export function findUserByUsername(username: string): User | null {
  return users.get(username.toLowerCase().trim()) ?? null;
}

export function findUserById(userId: string): User | null {
  for (const user of users.values()) {
    if (user.id === userId) {
      return user;
    }
  }

  return null;
}

export function createUser(username: string, passwordHash: string): User {
  const user = {
    id: crypto.randomUUID(),
    username: username.trim(),
    passwordHash,
    bio: "",
    avatar: "😀",
  };

  users.set(username.toLowerCase().trim(), user);
  return user;
}

export function updateProfile(
  userId: string,
  data: { username: string; bio?: string; avatar?: string }
): User | null {
  const username = data.username.trim();

  for (const [key, user] of users.entries()) {
    if (user.id === userId) {
      users.delete(key);

      const updatedUser = {
        ...user,
        username,
        bio: data.bio?.trim() || "",
        avatar: data.avatar || "😀",
      };

      users.set(username.toLowerCase(), updatedUser);
      return updatedUser;
    }
  }

  return null;
}