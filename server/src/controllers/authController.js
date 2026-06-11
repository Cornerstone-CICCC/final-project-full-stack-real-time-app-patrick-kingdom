import bcrypt from 'bcrypt';
import { findUserByUsername, createUser } from '../models/userModel.js';

const SALT_ROUNDS = 10;
const MAX_USERNAME_LENGTH = 20;
const MIN_PASSWORD_LENGTH = 6;

export async function register(req, res) {
  const username = req.body.username?.trim();
  const password = req.body.password?.trim();

  if (!username || username.length > MAX_USERNAME_LENGTH) {
    return res.status(400).json({ error: 'Username must be 1–20 characters.' });
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (findUserByUsername(username)) {
    return res.status(409).json({ error: 'Username already taken.' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = createUser(username, passwordHash);

  req.session.userId = user.id;
  req.session.username = user.username;
  res.status(201).json({ username: user.username });
}

export async function login(req, res) {
  const username = req.body.username?.trim();
  const password = req.body.password?.trim();

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = findUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ username: user.username });
}

export function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
}

export function me(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  res.json({ username: req.session.username });
}