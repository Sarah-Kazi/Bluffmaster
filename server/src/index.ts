import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { initRedis } from './redis';
import { setupGameHandlers } from './game';

dotenv.config();

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

async function startServer() {
  await initRedis();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    setupGameHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
