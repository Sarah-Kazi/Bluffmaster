"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const createRoom = () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }
    setIsCreating(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/game?room=${code}&name=${encodeURIComponent(playerName)}&host=true`);
  };

  const joinRoom = () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }
    if (!roomCode.trim()) {
      alert("Please enter a room code");
      return;
    }
    router.push(`/game?room=${roomCode.toUpperCase()}&name=${encodeURIComponent(playerName)}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-2">Bluffmaster</h1>
          <p className="text-gray-400">Play the classic bluff card game online</p>
        </div>

        <div className="bg-zinc-900 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-500"
              placeholder="Enter your name"
              maxLength={20}
            />
          </div>

          <div className="pt-4 space-y-3">
            <button
              onClick={createRoom}
              disabled={isCreating}
              className="w-full py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Create New Game
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-zinc-900 text-gray-400">or</span>
              </div>
            </div>

            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-500 text-center tracking-wider"
              placeholder="ROOM CODE"
              maxLength={6}
            />

            <button
              onClick={joinRoom}
              className="w-full py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
