"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { getCardImageUrl } from "@/utils/cardImages";
import { Copy, LogOut, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import YouTube from "react-youtube";
import { useGameSounds } from "@/hooks/useGameSounds";

interface Player {
  id: string;
  name: string;
  cardCount: number;
  isActive: boolean;
}

interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  currentRank: string | null;
  pileCount: number;
  lastPlay: {
    playerId: string;
    playerName: string;
    count: number;
    rank: string;
  } | null;
  canCallBluff: boolean;
  canPass: boolean;
  roundEnded: boolean;
  gameStarted: boolean;
  leaderboard: string[];
  winner: string | null;
}

const BACKGROUND_MUSIC_ID = "PaFHwTjy1yE";

function GameContent() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("room");
  const playerName = searchParams.get("name");
  const initialIsHost = searchParams.get("host") === "true";
  const isSinglePlayer = searchParams.get("singleplayer") === "true";

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [isHost, setIsHost] = useState(initialIsHost);
  const [myCards, setMyCards] = useState<string[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    currentRank: null,
    pileCount: 0,
    lastPlay: null,
    canCallBluff: false,
    canPass: false,
    roundEnded: false,
    gameStarted: false,
    leaderboard: [],
    winner: null,
  });
  const [claimedRank, setClaimedRank] = useState("");
  const [message, setMessage] = useState("");
  const [myPlayerId, setMyPlayerId] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [musicVolume, setMusicVolume] = useState(50);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const musicPlayerRef = useRef<any>(null);
  const volumeControlRef = useRef<HTMLDivElement>(null);

  const [chatMessages, setChatMessages] = useState<Array<{ id: string; playerName: string; text: string; timestamp: number }>>([]);
  const { playCardSound, playButtonSound, playBluffSound, playWinSound } = useGameSounds();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    if (isAtBottom && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isAtBottom]);

  const handleChatScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsAtBottom(atBottom);
    }
  };

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 50));
  };

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
    const newSocket = io(wsUrl, {
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      setConnected(true);
      newSocket.emit("join-room", { roomCode, playerName });
    });

    newSocket.on("player-id", (playerId: string) => {
      setMyPlayerId(playerId);
    });

    newSocket.on("host-status", (data: { isHost: boolean }) => {
      setIsHost(data.isHost);
    });

    newSocket.on("room-joined", (data: { players: Player[] }) => {
      setGameState(prev => ({ ...prev, players: data.players }));
    });

    newSocket.on("game-state", (state: GameState) => {
      setGameState(state);
    });

    newSocket.on("your-cards", (cards: string[]) => {
      setMyCards(cards);
      setSelectedCards([]);
    });

    newSocket.on("game-started", () => {
      addLog("Game started!");
    });

    newSocket.on("play-made", (data: { playerName: string, count: number, rank: string }) => {
      addLog(`${data.playerName} played ${data.count} card(s) of rank ${data.rank}`);
      playCardSound();
    });

    newSocket.on("bluff-called", (data: { callerName: string, lastPlayerName: string, wasBluff: boolean, penalizedPlayerName: string }) => {
      if (data.wasBluff) {
        addLog(`${data.callerName} called bluff on ${data.lastPlayerName}! It WAS a bluff! ${data.penalizedPlayerName} picked up the pile.`);
      } else {
        addLog(`${data.callerName} called bluff on ${data.lastPlayerName}! It was NOT a bluff. ${data.penalizedPlayerName} picked up the pile.`);
      }
      playBluffSound();
    });

    newSocket.on("player-passed", (data: { playerName: string }) => {
      addLog(`${data.playerName} passed`);
    });

    newSocket.on("round-ended", (data: { starterName: string }) => {
      addLog(`Round ended. ${data.starterName} starts the next round.`);
    });

    newSocket.on("game-over", (data: { leaderboard: string[] }) => {
      setGameState(prev => ({
        ...prev,
        leaderboard: data.leaderboard,
        gameStarted: false
      }));
      playWinSound();
    });

    newSocket.on("host-changed", (data: { newHostId: string, newHostName: string }) => {
      if (newSocket.id && data.newHostId === newSocket.id) {
        setIsHost(true);
        addLog(`You are now the host`);
      } else {
        addLog(`${data.newHostName} is now the host`);
      }
    });

    newSocket.on("chat-message", (data: { id: string, playerName: string, text: string, timestamp: number }) => {
      setChatMessages(prev => [...prev, data]);
    });

    newSocket.on("error", (error: string) => {
      alert(error);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [roomCode, playerName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (volumeControlRef.current && !volumeControlRef.current.contains(event.target as Node)) {
        setShowVolumeSlider(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (musicPlayerRef.current) {
      musicPlayerRef.current.setVolume(musicVolume);
    }
  }, [musicVolume]);

  useEffect(() => {
    if (!socket || !connected || !isHost || !isSinglePlayer) return;
    if (gameState.leaderboard && gameState.leaderboard.length > 0) return;
    const timer = setTimeout(() => {
      if (gameState.players.length === 1) {
        socket.emit("add-bot", { roomCode });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [socket, connected, isHost, isSinglePlayer, gameState.players.length, roomCode]);

  const startGame = () => {
    if (socket) {
      socket.emit("start-game", { roomCode });
      playButtonSound();
    }
  };

  const toggleCardSelection = (card: string) => {
    if (selectedCards.includes(card)) {
      setSelectedCards(selectedCards.filter((c) => c !== card));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  const playCards = () => {
    const rankToUse = claimedRank || gameState.currentRank || '';
    if (selectedCards.length === 0 || !rankToUse) {
      return;
    }
    if (socket) {
      socket.emit("play-cards", {
        roomCode,
        cards: selectedCards,
        claimedRank: rankToUse.toUpperCase(),
      });
      setClaimedRank("");
      playCardSound();
    }
  };

  const callBluff = () => {
    if (socket) {
      socket.emit("call-bluff", { roomCode });
      playBluffSound();
    }
  };

  const pass = () => {
    if (socket) {
      socket.emit("pass", { roomCode });
      playButtonSound();
    }
  };

  const sendChatMessage = () => {
    if (socket && chatInput.trim()) {
      socket.emit("chat-message", { roomCode, text: chatInput.trim() });
      setChatInput("");
    }
  };

  const onMusicReady = (event: any) => {
    musicPlayerRef.current = event.target;
    event.target.setVolume(musicVolume);
    if (!isMusicMuted) {
      event.target.playVideo();
    }
  };

  const toggleMusicMute = () => {
    if (musicPlayerRef.current) {
      if (isMusicMuted) {
        musicPlayerRef.current.unMute();
        musicPlayerRef.current.setVolume(musicVolume);
      } else {
        musicPlayerRef.current.mute();
      }
      setIsMusicMuted(!isMusicMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setMusicVolume(newVolume);
    if (newVolume > 0 && isMusicMuted) {
      setIsMusicMuted(false);
      if (musicPlayerRef.current) {
        musicPlayerRef.current.unMute();
      }
    }
  };

  const isMyTurn = () => {
    if (!gameState.gameStarted || !myPlayerId) return false;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    return currentPlayer && currentPlayer.id === myPlayerId;
  };

  const sortCards = (cards: string[]) => {
    const rankOrder = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    return [...cards].sort((a, b) => {
      const rankA = a.slice(0, -1);
      const rankB = b.slice(0, -1);
      return rankOrder.indexOf(rankA) - rankOrder.indexOf(rankB);
    });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl text-poker-gold animate-pulse">♠</div>
          <div className="text-2xl text-poker-gold font-display">Connecting to table...  If it takes too long, its cuz im broke and renders skill issue D TwT ples wait for 15-20seconds thanks ehhe</div>
        </div>
      </div>
    );
  }

  // Leaderboard Screen
  if (!gameState.gameStarted && gameState.leaderboard && gameState.leaderboard.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="card-suit-bg">
          <div className="card-suit">♠</div>
          <div className="card-suit">♥</div>
          <div className="card-suit">♣</div>
          <div className="card-suit">♦</div>
        </div>

        <div className="text-center space-y-8 w-full max-w-2xl">
          <h1 className="text-6xl font-display font-bold text-poker-gold mb-8 drop-shadow-[0_4px_12px_rgba(212,175,55,0.6)]">
            Game Over
          </h1>

          <div className="poker-panel rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
            <div className="bg-poker-burgundy p-6 border-b-2 border-poker-gold/30">
              <h2 className="text-3xl font-display font-semibold text-poker-gold">Final Standings</h2>
            </div>

            <div className="p-8 space-y-4">
              {gameState.leaderboard.map((name, idx) => (
                <div
                  key={`${name}-${idx}`}
                  className={`flex items-center p-5 rounded-xl transition-all duration-300 
                            ${idx === 0
                      ? 'bg-poker-gold/20 border-2 border-poker-gold scale-105'
                      : 'bg-poker-wood/50 border-2 border-poker-gold/20 hover:border-poker-gold/40'
                    }`}
                >
                  <div className={`flex items-center justify-center w-14 h-14 rounded-full font-bold text-xl mr-5
                                 ${idx === 0
                      ? 'bg-poker-gold text-poker-wood chip'
                      : idx === 1
                        ? 'bg-gray-400 text-poker-wood'
                        : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-poker-burgundy text-poker-gold'
                    }`}>
                    {idx + 1}
                  </div>
                  <span className={`text-2xl font-semibold ${idx === 0 ? 'text-poker-gold' : 'text-white'}`}>
                    {name}
                  </span>
                  {idx === 0 && (
                    <span className="ml-auto bg-poker-gold text-poker-wood text-sm font-bold px-4 py-2 rounded-full">
                      WINNER
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="p-6 bg-poker-wood/30 border-t-2 border-poker-gold/30">
              <button
                onClick={() => {
                  playButtonSound();
                  window.location.href = "/";
                }}
                className="w-full bg-poker-burgundy hover:bg-poker-burgundy-dark text-poker-gold 
                         font-bold text-xl py-4 px-8 rounded-xl 
                         border-2 border-poker-gold/40 hover:border-poker-gold
                         btn-poker shadow-lg
                         transition-all duration-300 transform hover:scale-105"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Game Screen
  return (
    <>
      <div className="card-suit-bg">
        <div className="card-suit">♠</div>
        <div className="card-suit">♥</div>
        <div className="card-suit">♣</div>
        <div className="card-suit">♦</div>
        <div className="card-suit">♠</div>
        <div className="card-suit">♥</div>
      </div>

      <div className="min-h-screen p-2 md:p-3 relative z-10">
        <div className="max-w-[1920px] mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 
                        poker-panel rounded-xl p-4 backdrop-blur-sm mb-3 relative z-[1000]">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold text-poker-gold">
                Room: {roomCode}
              </h1>
              <button
                onClick={copyRoomCode}
                className="p-2 rounded-lg bg-poker-wood hover:bg-poker-wood-light 
                         border border-poker-gold/30 hover:border-poker-gold
                         transition-all duration-200"
                title="Copy room code"
              >
                {copied ? (
                  <span className="text-green-400 text-sm font-semibold">Copied!</span>
                ) : (
                  <Copy className="w-4 h-4 text-poker-gold" />
                )}
              </button>
            </div>

            <div className="flex gap-2">
              {/* Volume Control */}
              <div className="relative h-full flex items-center" ref={volumeControlRef}>
                <button
                  onClick={toggleMusicMute}
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  className="p-2.5 bg-poker-wood hover:bg-poker-wood-light text-poker-gold 
                           rounded-lg btn-poker border border-poker-gold/30 hover:border-poker-gold
                           transition-all duration-200 flex items-center justify-center h-10"
                  title={isMusicMuted ? "Unmute Music" : "Mute Music"}
                >
                  {isMusicMuted || musicVolume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                
                {showVolumeSlider && (
                  <div 
                    className="absolute right-0 top-full mt-2 p-3 bg-poker-wood/90 backdrop-blur-sm rounded-lg shadow-xl border border-poker-gold/20"
                    onMouseLeave={() => setShowVolumeSlider(false)}
                  >
                    <div className="w-32 h-6 flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={musicVolume}
                        onChange={handleVolumeChange}
                        className="w-full h-1 bg-poker-gold/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-poker-gold [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:ease-in-out [&::-webkit-slider-thumb]:hover:scale-125"
                      />
                    </div>
                  </div>
                )}
              </div>
              {isHost && !gameState.gameStarted && gameState.players.length >= 2 && (
                <button
                  onClick={startGame}
                  className="px-5 py-2.5 bg-poker-gold hover:bg-poker-gold-dark text-poker-wood 
                           font-semibold rounded-lg btn-poker flex items-center gap-2
                           border-2 border-poker-wood hover:scale-105
                           transition-transform duration-200 shadow-lg"
                >
                  Start Game
                </button>
              )}
              <button
                onClick={() => {
                  if (socket) socket.disconnect();
                  window.location.href = "/";
                }}
                className="px-5 py-2.5 bg-poker-burgundy hover:bg-poker-burgundy-dark text-white 
                         font-semibold rounded-lg btn-poker flex items-center gap-2
                         border-2 border-poker-gold/30 hover:border-poker-gold
                         transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Leave
              </button>
            </div>
          </div>

          {/* Main Content with Right Sidebar */}
          <div className="flex">
            {/* Main Game Area - Center */}
            <div className="relative flex-1 space-y-3 overflow-y-auto poker-scrollbar pr-2" style={{ height: 'calc(100vh - 120px)' }}>
              {/* Minimalist Sidebar Toggle Button (Absolute inside main area) */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-30
                         p-1 text-poker-gold/50 hover:text-poker-gold bg-poker-wood/20 backdrop-blur-sm rounded-l-lg
                         transition-all duration-200 hover:bg-poker-wood/80"
                title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {isSidebarOpen ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
              </button>
              {/* Players - Top Horizontal Scroll */}
              <div className="poker-panel rounded-xl p-4 backdrop-blur-sm overflow-x-auto">
                <div className="flex gap-4 min-w-min">
                  {gameState.players.map((player, index) => (
                    <div
                      key={player.id}
                      className={`rounded-lg p-1 md:p-2 min-w-[90px] md:min-w-[180px] transition-all duration-300 flex-shrink-0
                                ${index === gameState.currentPlayerIndex
                          ? "bg-poker-gold/20 border-2 border-poker-gold scale-105"
                          : "bg-poker-wood/30 border-2 border-poker-gold/20"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="font-semibold text-white truncate max-w-[70px] md:max-w-[120px] text-[10px] md:text-base" title={player.name}>
                          {player.name}
                        </div>
                        <div className="chip w-4 h-4 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[9px] md:text-sm font-bold text-poker-wood flex-shrink-0">
                          {player.cardCount}
                        </div>
                      </div>

                      {index === gameState.currentPlayerIndex && gameState.gameStarted && (
                        <div className="mt-1 md:mt-2 text-[10px] md:text-xs text-poker-gold font-semibold uppercase tracking-wide text-center">
                          Active Turn
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {gameState.gameStarted && (
                <>
                  {/* Central Pile */}
                  <div className="poker-panel rounded-2xl p-2 md:p-4 text-center backdrop-blur-sm 
                                border-poker-gold shadow-xl">
                    <div className="space-y-1 md:space-y-3">
                      <div className="text-sm uppercase tracking-widest text-gray-400 font-semibold">
                        Central Pile
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="chip w-8 h-8 md:w-16 md:h-16 rounded-full flex items-center justify-center">
                          <span className="text-base md:text-2xl font-bold text-poker-wood">{gameState.pileCount}</span>
                        </div>
                        <div className="text-left">
                          <div className="text-gray-400 text-[9px] md:text-xs">Cards</div>
                          {gameState.currentRank && (
                            <div className="text-sm md:text-xl font-bold text-poker-gold">
                              Rank: {gameState.currentRank}
                            </div>
                          )}
                        </div>
                      </div>
                      {gameState.lastPlay && (
                        <div className="text-sm text-gray-300 mt-3 p-3 bg-poker-wood/50 rounded-lg border border-poker-gold/20">
                          <span className="text-poker-gold font-semibold">{gameState.lastPlay.playerName}</span>
                          {" "}played{" "}
                          <span className="text-white font-bold">{gameState.lastPlay.count}</span>
                          {" "}
                          <span className="text-poker-gold font-semibold">{gameState.lastPlay.rank}</span>
                          (s)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Call Bluff Button (for non-active players) */}
                  {gameState.canCallBluff && gameState.lastPlay && gameState.lastPlay.playerId !== myPlayerId && !isMyTurn() && (
                    <div className="flex justify-center">
                      <button
                        onClick={callBluff}
                        className="px-4 py-1.5 md:px-8 md:py-3 bg-red-700 hover:bg-red-600 text-white 
                                 font-bold text-sm md:text-lg rounded-xl btn-poker
                                 border-2 border-red-900 hover:border-red-500
                                 shadow-xl hover:shadow-red-500/30
                                 transition-all duration-300 transform hover:scale-110 active:scale-95"
                      >
                        CALL BLUFF
                      </button>
                    </div>
                  )}

                  {/* Player Turn Controls */}
                  {isMyTurn() && (
                    <div className="poker-panel rounded-xl p-2 md:p-4 space-y-2 md:space-y-4 backdrop-blur-sm 
                                  border-poker-gold shadow-lg animate-pulse-glow">
                      {!gameState.roundEnded && gameState.currentRank && (
                        <div className="space-y-2 md:space-y-4">
                          <div className="flex flex-wrap gap-2 justify-center items-center">
                            <div className="text-sm md:text-lg font-semibold text-poker-gold">
                              Playing: {gameState.currentRank}
                            </div>
                            <button
                              onClick={playCards}
                              disabled={selectedCards.length === 0}
                              className="px-4 py-1.5 md:px-6 md:py-2 bg-poker-gold hover:bg-poker-gold-dark text-poker-wood 
                                       font-bold text-sm md:text-base rounded-lg btn-poker
                                       disabled:opacity-50 disabled:cursor-not-allowed
                                       border-2 border-poker-wood
                                       transition-all duration-200 transform hover:scale-105 active:scale-95"
                            >
                              Play {selectedCards.length} Card(s)
                            </button>
                            {gameState.canPass && (
                              <button
                                onClick={pass}
                                className="px-4 py-1.5 md:px-6 md:py-2 bg-poker-wood-light hover:bg-poker-wood text-white 
                                         font-semibold text-sm md:text-base rounded-lg btn-poker
                                         border-2 border-poker-gold/30 hover:border-poker-gold
                                         transition-all duration-200"
                              >
                                Pass
                              </button>
                            )}
                          </div>

                          {gameState.canCallBluff && gameState.lastPlay && gameState.lastPlay.playerId !== myPlayerId && (
                            <div className="flex justify-center">
                              <button
                                onClick={callBluff}
                                className="px-8 py-2 bg-red-700 hover:bg-red-600 text-white 
                                         font-bold text-base rounded-lg btn-poker
                                         border-2 border-red-900 hover:border-red-500
                                         transition-all duration-300"
                              >
                                Call Bluff
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {gameState.roundEnded && (
                        <div className="text-center space-y-4">
                          <p className="text-gray-300 text-lg">Start a new round</p>
                          <div className="flex justify-center items-center gap-2">
                            <input
                              type="text"
                              value={claimedRank}
                              onChange={(e) => setClaimedRank(e.target.value.toUpperCase())}
                              className="px-3 py-2 bg-poker-wood border-2 border-poker-gold/50 rounded-lg 
                                       text-center text-lg md:text-2xl font-bold text-poker-gold uppercase
                                       focus:outline-none focus:border-poker-gold focus:ring-2 focus:ring-poker-gold/30 w-full max-w-md
                                       placeholder:text-sm md:placeholder:text-lg"
                              placeholder="Rank (A,K,Q,J,10,9,8,7,6,5,4,3,2)"
                              maxLength={2}
                            />
                            <button
                              onClick={playCards}
                              disabled={selectedCards.length === 0}
                              className="px-6 py-2 bg-poker-gold hover:bg-poker-gold-dark text-poker-wood 
                                       font-bold text-base rounded-lg btn-poker
                                       disabled:opacity-50 disabled:cursor-not-allowed
                                       border-2 border-poker-wood
                                       transition-all duration-200"
                            >
                              Start Round
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Player's Cards */}
                  <div className="poker-panel rounded-xl p-4 backdrop-blur-sm">
                    <div className="text-sm uppercase tracking-widest text-gray-400 font-semibold mb-2">
                      Your Hand ({myCards.length} cards)
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {sortCards(myCards).map((card, index) => (
                        <button
                          key={`${card}-${index}`}
                          onClick={() => toggleCardSelection(card)}
                          className={`relative rounded-lg transition-all duration-200 ${selectedCards.includes(card) ? "ring-4 ring-poker-gold -translate-y-2" : ""
                            }`}
                        >
                          <img
                            src={getCardImageUrl(card)}
                            alt={card}
                            className="w-12 h-16 md:w-28 md:h-44 rounded-lg shadow-xl"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Waiting for game to start */}
              {!gameState.gameStarted && (
                <div className="poker-panel rounded-2xl p-4 text-center backdrop-blur-sm">
                  <div className="space-y-4">
                    <div className="text-5xl text-poker-gold animate-float">♠</div>
                    <p className="text-gray-300 text-lg">
                      Waiting for host to start the game...
                    </p>
                    <p className="text-poker-gold font-semibold">
                      {gameState.players.length} player(s) in room
                    </p>
                    <p className="text-sm text-gray-400">
                      At least 2 players required
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar - Game Log (top half) and Chat (bottom half) */}
            <div
              className={`relative flex-shrink-0 space-y-3 flex flex-col transition-width duration-300 ease-in-out
                ${isSidebarOpen
                  ? 'w-56 xl:w-72 opacity-100'
                  : 'w-0 opacity-0 overflow-hidden'
                }`}
              style={{ height: 'calc(100vh - 120px)' }}
            >

              {/* Game Log - Top Half of Right Sidebar */}
              <div className="poker-panel rounded-xl p-4 backdrop-blur-sm flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-3 border-b border-poker-gold/30 pb-2">
                  <h3 className="font-bold text-poker-gold text-sm uppercase tracking-wider">
                    Game Log
                  </h3>
                </div>

                <div className="space-y-2 overflow-y-auto poker-scrollbar flex-1">
                  {logs.map((log, i) => (
                    <div key={i} className="text-sm border-l-2 border-poker-gold/50 pl-3 py-1 text-gray-200">
                      {log}
                    </div>
                  ))}
                </div>

              </div>

              {/* Chat - Bottom Half of Right Sidebar */}
              <div className="poker-panel rounded-xl p-4 backdrop-blur-sm flex-1 flex flex-col overflow-hidden">
                <h3 className="font-bold text-poker-gold text-sm uppercase tracking-wider mb-3 border-b border-poker-gold/30 pb-2">
                  Chat
                </h3>

                {/* Chat Messages */}
                <div
                  ref={chatContainerRef}
                  onScroll={handleChatScroll}
                  className="flex-1 space-y-2 mb-3 overflow-y-auto poker-scrollbar"
                >
                  {chatMessages.length === 0 ? (
                    <div className="text-gray-400 text-xs text-center py-4">
                      No messages yet
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="bg-poker-wood/30 rounded-lg p-2 border border-poker-gold/10">
                        <div className="text-poker-gold text-xs font-semibold mb-1">{msg.playerName}</div>
                        <div className="text-gray-200 text-sm break-words">{msg.text}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* Chat Input */}
                <div className="flex gap-1.5 w-full">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        sendChatMessage();
                      }
                    }}
                    placeholder="Message..."
                    className="flex-1 px-2 py-1 sm:py-1.5 bg-poker-wood border border-poker-gold/30 rounded-lg 
                             text-white text-[11px] sm:text-xs placeholder-gray-400
                             focus:outline-none focus:border-poker-gold focus:ring-1 focus:ring-poker-gold/30
                             transition-all duration-200 w-full"
                    maxLength={100}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim()}
                    className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-poker-gold hover:bg-poker-gold-dark text-poker-wood 
                             font-semibold text-[11px] sm:text-xs rounded-lg btn-poker whitespace-nowrap
                             disabled:opacity-50 disabled:cursor-not-allowed
                             border border-poker-wood/50 w-16 sm:w-auto
                             transition-all duration-200"
                  >
                    Send
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



export default function GamePage() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV === 'development') {
      const keepAlive = setInterval(() => {
        fetch('/api/health')
          .then(res => res.json())
          .catch(console.error);
      }, 5 * 60 * 1000); 

      return () => clearInterval(keepAlive);
    }
  }, []);

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-poker-gold font-display">Loading game...</div>
      </div>
    }>
      <GameContent />
    </Suspense>
  );
}