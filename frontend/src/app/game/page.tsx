"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { getCardImageUrl } from "@/utils/cardImages";

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
  winner: string | null;
}

function GameContent() {
  const searchParams = useSearchParams();
  const roomCode = searchParams.get("room");
  const playerName = searchParams.get("name");
  const isHost = searchParams.get("host") === "true";

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
    winner: null,
  });
  const [claimedRank, setClaimedRank] = useState("");
  const [message, setMessage] = useState("");
  const [myPlayerId, setMyPlayerId] = useState("");

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
      setMessage(`Joined room ${roomCode}`);
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
      setMessage("Game started!");
    });

    newSocket.on("play-made", (data: { playerName: string; count: number; rank: string }) => {
      setMessage(`${data.playerName} played ${data.count} ${data.rank}(s)`);
    });

    newSocket.on("bluff-called", (data: { callerName: string; lastPlayerName: string; wasBluff: boolean; penalizedPlayerName: string }) => {
      if (data.wasBluff) {
        setMessage(`${data.callerName} called bluff! ${data.lastPlayerName} was bluffing and takes all cards!`);
      } else {
        setMessage(`${data.callerName} called bluff! ${data.lastPlayerName} was NOT bluffing! ${data.callerName} takes all cards!`);
      }
    });

    newSocket.on("player-passed", (data: { playerName: string }) => {
      setMessage(`${data.playerName} passed`);
    });

    newSocket.on("round-ended", (data: { starterName: string }) => {
      setMessage(`Round ended. ${data.starterName} starts the next round!`);
    });

    newSocket.on("game-won", (data: { winnerName: string }) => {
      setMessage(`${data.winnerName} won the game!`);
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
    if (selectedCards.length === 0) {
      alert("Select at least one card");
      return;
    }
    if (!claimedRank) {
      alert("Enter the rank you're claiming");
      return;
    }
    if (socket) {
      socket.emit("play-cards", {
        roomCode,
        cards: selectedCards,
        claimedRank: claimedRank.toUpperCase(),
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

  if (gameState.winner) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Game Over!</h1>
          <p className="text-2xl">{gameState.winner} won!</p>
          <button
            onClick={() => window.location.href = "/"}
            className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Room: {roomCode}</h1>
            <p className="text-sm text-gray-400">{message}</p>
          </div>
          {isHost && !gameState.gameStarted && gameState.players.length >= 2 && (
            <button
              onClick={startGame}
              className="px-6 py-2 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Start Game
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {gameState.players.map((player, index) => (
            <div
              key={player.id}
              className={`p-4 rounded-lg border-2 ${
                index === gameState.currentPlayerIndex
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
                        onClick={() => {
                          setClaimedRank(gameState.currentRank || '');
                          playCards();
                        }}
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
                    className={`relative rounded-lg transition-all transform hover:scale-105 ${
                      selectedCards.includes(card)
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
              {gameState.players.length} player(s) in room
            </p>
          </div>
        )}
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
