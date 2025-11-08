import { createClient } from 'redis';
import { GameRoom } from './types';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export async function initRedis() {
  await redisClient.connect();
  console.log('Connected to Redis');
}

export async function saveRoom(room: GameRoom): Promise<void> {
  const roomData = {
    ...room,
    passedPlayers: Array.from(room.passedPlayers),
  };
  await redisClient.set(`room:${room.code}`, JSON.stringify(roomData), {
    EX: 86400, // expire after 24 hours
  });
}

export async function getRoom(roomCode: string): Promise<GameRoom | null> {
  const data = await redisClient.get(`room:${roomCode}`);
  if (!data) return null;
  
  const parsed = JSON.parse(data);
  return {
    ...parsed,
    passedPlayers: new Set(parsed.passedPlayers),
  };
}

export async function deleteRoom(roomCode: string): Promise<void> {
  await redisClient.del(`room:${roomCode}`);
}
