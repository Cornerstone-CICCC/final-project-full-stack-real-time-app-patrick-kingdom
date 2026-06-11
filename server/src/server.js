import { createServer } from "node:http";
import { Server } from "socket.io";
import { PORT, CLIENT_URL } from "./config.js";
import app from "./app.js";
import { registerChatHandlers } from "./sockets/chatSocket.js";

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL },
});

registerChatHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
