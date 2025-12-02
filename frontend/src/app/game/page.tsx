"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { getCardImageUrl } from "@/utils/cardImages";
import { Copy, Check } from "lucide-react";

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

function GameContent() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("room");
  const playerName = searchParams.get("name");
  const isHost = searchParams.get("host") === "true";
  const isSinglePlayer = searchParams.get("singleplayer") === "true";

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
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

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 50)); // Keep last 50 logs
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
    });
    newSocket.on("bluff-called", (data: { callerName: string, lastPlayerName: string, wasBluff: boolean, penalizedPlayerName: string }) => {
      if (data.wasBluff) {
        addLog(`${data.callerName} called bluff on ${data.lastPlayerName}! It WAS a bluff! ${data.penalizedPlayerName} picked up the pile.`);
      } else {
        addLog(`${data.callerName} called bluff on ${data.lastPlayerName}! It was NOT a bluff. ${data.penalizedPlayerName} picked up the pile.`);
      }
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
    }
  };

  const callBluff = () => {
    if (socket) {
      socket.emit("call-bluff", { roomCode });
    }
  };

  const pass = () => {
    if (socket) {
      socket.emit("pass", { roomCode });
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

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Connecting...</div>
      </div>
    );
  }

  if (!gameState.gameStarted && gameState.leaderboard && gameState.leaderboard.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-900">
        <div className="text-center space-y-6 w-full max-w-md">
          <h1 className="text-4xl font-bold text-white mb-6">Game Over</h1>

          <div className="bg-zinc-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-zinc-700 p-4">
              <h2 className="text-2xl font-semibold text-white">Final Standings</h2>
            </div>

            <div className="p-6 space-y-3">
              {gameState.leaderboard.map((name, idx) => (
                <div
                  key={`${name}-${idx}`}
                  className={`flex items-center p-4 rounded-lg transition-all duration-200 ${idx === 0 ? 'bg-yellow-500/20 border-2 border-yellow-500' : 'bg-zinc-700/50 hover:bg-zinc-600/50'
                    }`}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-600 text-white font-bold text-lg mr-4">
                    {idx + 1}
                  </div>
                  <span className={`text-lg font-medium ${idx === 0 ? 'text-yellow-400' : 'text-white'
                    }`}>
                    {name}
                  </span>
                  {idx === 0 && (
                    <span className="ml-auto bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                      WINNER
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 bg-zinc-800/50 border-t border-zinc-700">
              <button
                onClick={() => window.location.href = "/"}
                className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Room: {roomCode}</h1>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(roomCode || '');
                  setMessage('Room code copied to clipboard!');
                  setTimeout(() => setMessage(''), 2000);
                }}
                className="p-1.5 rounded-full hover:bg-zinc-700 transition-colors"
                title="Copy room code"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (socket) socket.disconnect();
                window.location.href = "/";
              }}
              className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Leave Room
            </button>
            {isHost && !gameState.gameStarted && gameState.players.length >= 2 && (
              <button
                onClick={startGame}
                className="px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Start Game
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {gameState.players.map((player, index) => (
            <div
              key={player.id}
              className={`p-4 rounded-lg border-2 ${index === gameState.currentPlayerIndex
                ? "border-white bg-zinc-800"
                : "border-zinc-700 bg-zinc-900"
                }`}
            >
              <div className="font-medium">{player.name}</div>
              <div className="text-sm text-gray-400">{player.cardCount} cards</div>
            </div>
          ))}
        </div>

        {gameState.gameStarted && (
          <>
            <div className="bg-zinc-900 rounded-lg p-6 text-center">
              <div className="text-sm text-gray-400 mb-2">Central Pile</div>
              <div className="text-3xl font-bold">{gameState.pileCount} cards</div>
              {gameState.currentRank && (
                <div className="text-lg mt-2">Current Rank: {gameState.currentRank}</div>
              )}
              {gameState.lastPlay && (
                <div className="text-sm text-gray-400 mt-2">
                  Last play: {gameState.lastPlay.playerName} played {gameState.lastPlay.count}{" "}
                  {gameState.lastPlay.rank}(s)
                </div>
              )}
            </div>

            {gameState.canCallBluff && gameState.lastPlay && gameState.lastPlay.playerId !== myPlayerId && !isMyTurn() && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={callBluff}
                  className="px-8 py-3 bg-red-600 font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Call Bluff
                </button>
              </div>
            )}

            {isMyTurn() && (
              <div className="bg-zinc-900 rounded-lg p-6 space-y-4">
                <div className="text-center font-medium">Your Turn</div>

                {!gameState.roundEnded && gameState.currentRank && (
                  <>
                    <div className="flex gap-3 justify-center items-center">
                      <div className="text-lg font-medium">
                        Playing: {gameState.currentRank}
                      </div>
                      <button
                        onClick={playCards}
                        disabled={selectedCards.length === 0}
                        className="px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        Play {selectedCards.length} card(s)
                      </button>
                      {gameState.canPass && (
                        <button
                          onClick={pass}
                          className="px-6 py-2 bg-zinc-800 border border-zinc-700 font-medium rounded-lg hover:bg-zinc-700 transition-colors"
                        >
                          Pass
                        </button>
                      )}
                    </div>
                    {gameState.canCallBluff && gameState.lastPlay && gameState.lastPlay.playerId !== myPlayerId && (
                      <div className="flex justify-center">
                        <button
                          onClick={callBluff}
                          className="px-6 py-2 bg-red-600 font-medium rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Call Bluff
                        </button>
                      </div>
                    )}
                  </>
                )}

                {gameState.roundEnded && (
                  <div className="text-center">
                    <input
                      type="text"
                      value={claimedRank}
                      onChange={(e) => setClaimedRank(e.target.value.toUpperCase())}
                      className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-500 text-center w-32 mb-3"
                      placeholder="Rank"
                      maxLength={2}
                    />
                    <button
                      onClick={playCards}
                      disabled={selectedCards.length === 0}
                      className="px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 ml-3"
                    >
                      Start New Round
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="bg-zinc-900 rounded-lg p-6">
              <div className="text-sm text-gray-400 mb-3">Your Cards ({myCards.length})</div>
              <div className="flex flex-wrap gap-3">
                {sortCards(myCards).map((card, index) => (
                  <button
                    key={`${card}-${index}`}
                    onClick={() => toggleCardSelection(card)}
                    className={`relative rounded-lg transition-all transform hover:scale-105 ${selectedCards.includes(card)
                      ? "ring-4 ring-white -translate-y-4"
                      : "hover:-translate-y-2"
                      }`}
                  >
                    <img
                      src={getCardImageUrl(card)}
                      alt={card}
                      className="w-20 h-28 rounded-lg shadow-lg"
                    />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {!gameState.gameStarted && (
          <div className="bg-zinc-900 rounded-lg p-6 text-center">
            <p className="text-gray-400">
              Waiting for host to start the game...
              <br />
              {gameState.players.length} player(s) in room. Atleast 2 players are required to start.
            </p>
          </div>
        )}

        <div className="fixed bottom-4 left-4 w-80 max-h-60 overflow-y-auto bg-black/80 text-white p-4 rounded-lg pointer-events-none">
          <h3 className="font-bold mb-2 text-gray-400 text-xs uppercase tracking-wider">Game Log</h3>
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="text-sm border-l-2 border-zinc-600 pl-2 py-0.5">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <GameContent />
    </Suspense>
  );
}
