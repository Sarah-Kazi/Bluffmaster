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
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-2">Bluffmaster</h1>
          <p className="text-gray-400">Play the classic bluff card game online</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-zinc-900 rounded-lg p-6 space-y-4 h-full">
            <h2 className="text-lg font-semibold text-white mb-3 text-center">Game Rules</h2>
                <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-zinc-900 text-gray-400"></span>
                </div>
              </div>
            <div className="space-y-3 text-base text-gray-300">
              <div className="flex items-start space-x-2">
                <span className="text-white font-medium">1.</span>
                <p>Each player starts with cards and takes turns playing cards face down</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-white font-medium">2.</span>
                <p>Declare what cards you are playing (you can bluff about the rank)</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-white font-medium">2.</span>
                <p>Enter the rank as A,K,Q,J,10,9,8,7,6,5,4,3,2</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-white font-medium">3.</span>
                <p>Other players can challenge your claim if they think you are bluffing</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-white font-medium">4.</span>
                <p>If challenged and caught bluffing, you pick up the entire pile</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-white font-medium">5.</span>
                <p>First player to get rid of all their cards wins :D</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-lg p-6 space-y-4 h-full">
            <div>
              <h2 className="text-lg font-semibold text-white mb-3 text-center">Play :D</h2>
                <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-zinc-900 text-gray-400">Your Name</span>
                </div>
              </div>
              <label className="block text-sm font-medium mb-2"></label>
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
    </div>
  );
}


