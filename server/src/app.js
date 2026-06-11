import express from "express";
import cors from "cors";
import { CLIENT_URL } from "./config.js";
import messageRoutes from "./routes/messageRoutes.js";

const app = express();

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

app.use("/api/messages", messageRoutes);

export default app;
