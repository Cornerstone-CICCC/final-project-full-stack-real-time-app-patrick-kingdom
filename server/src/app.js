import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { CLIENT_URL, SESSION_SECRET } from './config.js';
import messageRoutes from './routes/messageRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,       // ← required for cookies to cross origins
}));
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,  // 24 hours
  },
}));

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

export default app;