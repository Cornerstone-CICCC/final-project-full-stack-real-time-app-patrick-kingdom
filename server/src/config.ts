import 'dotenv/config';

export const PORT = Number(process.env.PORT) || 3000;
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4321';
export const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
