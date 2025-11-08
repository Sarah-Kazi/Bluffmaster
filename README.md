# Bluffmaster

A real time multiplayer implementation of the classic Bluff card game. Players can create rooms, join games with friends, and play the traditional bluffing card game online.

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Backend**: Node.js, Socket.IO, TypeScript
- **Database**: Redis (Upstash)
- **Deployment**: Vercel (Frontend), Railway (Backend)

## Game Rules

1. 52 cards (standard deck) are distributed equally among all players
2. Players take turns playing cards face-down, claiming a specific rank
3. Players can bluff about the cards they're playing
4. Other players can call "Bluff" if they think someone is lying
5. If caught bluffing, the bluffer takes all cards from the pile
6. If not bluffing, the caller takes all cards
7. Players can pass if they don't want to play
8. First player to get rid of all cards wins

## Local Development Setup

### Prerequisites

- Node.js 18+ installed
- Redis installed locally OR Upstash account
- npm or yarn package manager

### 1. Clone and Setup

```bash
cd bluffmaster
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# create .env.local file
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### 3. Backend Setup

```bash
cd ../server
npm install

# create .env file
cp .env.example .env
```

Edit `.env`:
```
PORT=3001
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000
```

If using Upstash Redis, replace `REDIS_URL` with your Upstash Redis URL.

### 4. Running Locally

**Terminal 1 - Start Redis** (if using local Redis):
```bash
redis-server
```

**Terminal 2 - Start Backend**:
```bash
cd server
npm run dev
```

**Terminal 3 - Start Frontend**:
```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` in your browser.


## Project Structure

```
bluffmaster/
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Home page - create/join room
│   │   │   ├── game/
│   │   │   │   └── page.tsx       # Game page
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── next.config.mjs
│
├── server/                 # WebSocket server
│   ├── src/
│   │   ├── index.ts               # Server entry point
│   │   ├── game.ts                # Game logic and handlers
│   │   ├── redis.ts               # Redis operations
│   │   ├── deck.ts                # Card deck utilities
│   │   └── types.ts               # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   ├── railway.json
│   └── nixpacks.toml
│
└── README.md
```

## Environment Variables

### Frontend (.env.local)
- `NEXT_PUBLIC_WS_URL`: WebSocket server URL

### Backend (.env)
- `PORT`: Server port (default: 3001)
- `REDIS_URL`: Redis connection URL
- `CORS_ORIGIN`: Allowed frontend origin
