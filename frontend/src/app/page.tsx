"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameSounds } from "@/hooks/useGameSounds";
import YouTube from "react-youtube";

const BACKGROUND_MUSIC_ID = "PaFHwTjy1yE";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const musicPlayerRef = useRef<any>(null);
  const router = useRouter();
  const { playButtonSound } = useGameSounds();

  const onMusicReady = (event: any) => {
    musicPlayerRef.current = event.target;
    // Start playing the music when it's ready
    if (musicPlayerRef.current) {
      musicPlayerRef.current.playVideo();
      if (isMusicMuted) {
        musicPlayerRef.current.mute();
      }
    }
  };

  const toggleMusicMute = () => {
    if (musicPlayerRef.current) {
      if (isMusicMuted) {
        musicPlayerRef.current.unMute();
      } else {
        musicPlayerRef.current.mute();
      }
      setIsMusicMuted(!isMusicMuted);
    }
  };

  const createRoom = () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }
    playButtonSound();
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
    playButtonSound();
    router.push(`/game?room=${roomCode.toUpperCase()}&name=${encodeURIComponent(playerName)}`);
  };

  const startSinglePlayer = () => {
    if (!playerName.trim()) {
      alert("Please enter your name");
      return;
    }
    playButtonSound();
    setIsCreating(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/game?room=${code}&name=${encodeURIComponent(playerName)}&host=true&singleplayer=true`);
  };

  return (
    <>
      {/* Floating card suits background */}
      <div className="card-suit-bg">
        <div className="card-suit">♠</div>
        <div className="card-suit">♥</div>
        <div className="card-suit">♣</div>
        <div className="card-suit">♦</div>
        <div className="card-suit">♠</div>
        <div className="card-suit">♥</div>
      </div>

      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        {/* Mute Button - Top Right Corner */}
        <button
          onClick={toggleMusicMute}
          className="fixed top-4 right-4 p-2.5 bg-poker-wood/80 hover:bg-poker-wood text-poker-gold 
                   rounded-full btn-poker border border-poker-gold/30 hover:border-poker-gold
                   transition-all duration-200 z-20 shadow-lg"
          title={isMusicMuted ? "Unmute Music" : "Mute Music"}
        >
          {isMusicMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
          )}
        </button>

        <div className="w-full max-w-6xl space-y-4 sm:space-y-6 md:space-y-8">
          {/* Title */}
          <div className="text-center space-y-3">
            <h1 className="text-7xl font-display font-bold tracking-wider">
              {"Bluffmaster".split("").map((letter, index) => (
                <span
                  key={index}
                  className="inline-block transition-all duration-300 hover:-translate-y-2 hover:scale-125 hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.8)] cursor-default"
                  style={{
                    background: 'linear-gradient(90deg, #d4af37 0%, #f4e5a1 25%, #d4af37 50%, #f4e5a1 75%, #d4af37 100%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {letter}
                </span>
              ))}
            </h1>
            <p className="text-xl text-gray-300 font-light tracking-wide">
              The Classic Card Game of Deception
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {/* Game Rules Panel */}
            <div className="poker-panel rounded-2xl p-8 space-y-6 backdrop-blur-sm">
              <h2 className="text-2xl font-display font-semibold text-poker-gold text-center border-b border-poker-gold/30 pb-4">
                Game Rules
              </h2>

              <div className="space-y-4 text-base text-gray-200">
                <div className="flex items-start space-x-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-poker-burgundy text-poker-gold font-bold text-sm flex-shrink-0">
                    1
                  </span>
                  <p className="leading-relaxed">Each player starts with cards and takes turns playing cards face down</p>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-poker-burgundy text-poker-gold font-bold text-sm flex-shrink-0">
                    2
                  </span>
                  <p className="leading-relaxed">Declare what cards you are playing - you can bluff about the rank</p>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-poker-burgundy text-poker-gold font-bold text-sm flex-shrink-0">
                    3
                  </span>
                  <p className="leading-relaxed">Enter rank as: A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2</p>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-poker-burgundy text-poker-gold font-bold text-sm flex-shrink-0">
                    4
                  </span>
                  <p className="leading-relaxed">Other players can challenge your claim if they suspect bluffing</p>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-poker-burgundy text-poker-gold font-bold text-sm flex-shrink-0">
                    5
                  </span>
                  <p className="leading-relaxed">If caught bluffing, you pick up the entire pile</p>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-poker-burgundy text-poker-gold font-bold text-sm flex-shrink-0">
                    6
                  </span>
                  <p className="leading-relaxed">When everyone passes, the first passer starts the new hand</p>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-poker-burgundy text-poker-gold font-bold text-sm flex-shrink-0">
                    7
                  </span>
                  <p className="leading-relaxed font-semibold text-poker-gold">First player to get rid of all cards wins!</p>
                </div>
              </div>
            </div>

            {/* Play Panel */}
            <div className="poker-panel rounded-2xl p-8 space-y-6 backdrop-blur-sm">
              <h2 className="text-2xl font-display font-semibold text-poker-gold text-center border-b border-poker-gold/30 pb-4">
                Enter Game
              </h2>

              <div className="space-y-5">
                {/* Player Name Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 uppercase tracking-wide">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={playerName || ''}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-3 bg-poker-wood border-2 border-poker-gold/30 rounded-lg 
                             text-white placeholder-gray-500 text-sm sm:text-base
                             focus:outline-none focus:border-poker-gold focus:ring-2 focus:ring-poker-gold/20
                             transition-all duration-200"
                    placeholder="Enter your name"
                    maxLength={20}
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 space-y-3">
                  <button
                    onClick={createRoom}
                    disabled={isCreating}
                    className="w-full py-3 sm:py-4 bg-poker-gold hover:bg-poker-gold-dark text-poker-burgundy 
                             font-semibold text-base sm:text-lg rounded-lg 
                             border-2 border-poker-gold/40
                             shadow-lg
                             transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create New Game
                  </button>

                  <button
                    onClick={startSinglePlayer}
                    disabled={isCreating}
                    className="w-full py-3 sm:py-4 bg-poker-gold hover:bg-poker-gold-dark text-poker-burgundy 
                             font-semibold text-base sm:text-lg rounded-lg 
                             border-2 border-poker-gold/40
                             shadow-lg
                             transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Play vs Bot
                  </button>

                  {/* Divider */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-poker-gold/30"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-poker-wood text-gray-400 uppercase tracking-widest text-xs">
                        or join existing
                      </span>
                    </div>
                  </div>

                  {/* Room Code Input */}
                  <input
                    type="text"
                    value={roomCode || ''}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full px-3 sm:px-4 md:px-5 py-2 sm:py-3 bg-poker-wood border-2 border-poker-gold/30 rounded-lg 
                             text-center text-lg sm:text-xl md:text-2xl font-bold text-poker-gold tracking-[0.3em] 
                             placeholder-gray-600 uppercase
                             focus:outline-none focus:border-poker-gold focus:ring-2 focus:ring-poker-gold/20
                             transition-all duration-200"
                    placeholder="ROOM CODE"
                    maxLength={6}
                  />

                  <button
                    onClick={joinRoom}
                    className="w-full py-4 bg-poker-gold hover:bg-poker-gold-dark text-poker-burgundy 
                             font-bold text-lg rounded-lg 
                             shadow-lg
                             transition-colors duration-200"
                  >
                    Join Game
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Music Player (Hidden) */}
      <div className="hidden">
        <YouTube
          videoId={BACKGROUND_MUSIC_ID}
          opts={{
            height: '0',
            width: '0',
            playerVars: {
              autoplay: 1,
              controls: 0,
              loop: 1,
              playlist: BACKGROUND_MUSIC_ID, // Required for loop to work
            },
          }}
          onReady={onMusicReady}
        />
      </div>
    </>
  );
}
