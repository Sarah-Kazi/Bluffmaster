import { Server, Socket } from 'socket.io';
import { GameRoom, Player, JoinRoomData, PlayCardsData } from './types';
import { distributeCards, getCardRank } from './deck';
import { saveRoom, getRoom, deleteRoom } from './redis';
import { Bot } from './bot';

const rooms = new Map<string, GameRoom>();

export function setupGameHandlers(io: Server, socket: Socket) {
  socket.on('join-room', async (data: JoinRoomData) => {
    const { roomCode, playerName } = data;

    let room = rooms.get(roomCode);

    if (!room) {
      const existingRoom = await getRoom(roomCode);
      if (existingRoom) {
        room = existingRoom;
        rooms.set(roomCode, room);
      }
    }

    if (!room) {
      room = {
        code: roomCode,
        players: [],
        currentPlayerIndex: 0,
        currentRank: null,
        pile: [],
        lastPlay: null,
        finishOrder: [],
        passedPlayers: new Set(),
        gameStarted: false,
        hostId: socket.id,
      };
      rooms.set(roomCode, room);
    }

    if (room.gameStarted) {
      socket.emit('error', 'Game already started');
      return;
    }

    const existingPlayer = room.players.find(p => p.socketId === socket.id);
    if (existingPlayer) {
      socket.emit('error', 'Already in room');
      return;
    }

    const player: Player = {
      id: socket.id,
      name: playerName,
      cards: [],
      socketId: socket.id,
    };

    room.players.push(player);
    socket.join(roomCode);

    socket.emit('player-id', socket.id);
    io.to(roomCode).emit('room-joined', { players: getPlayerInfo(room) });
    io.to(roomCode).emit('game-state', getGameState(room));

    await saveRoom(room);
    await saveRoom(room);
  });

  socket.on('add-bot', async (data: { roomCode: string }) => {
    const { roomCode } = data;
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.hostId !== socket.id) {
      socket.emit('error', 'Only host can add bots');
      return;
    }

    if (room.gameStarted) {
      socket.emit('error', 'Game already started');
      return;
    }

    const botId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const botName = `Bot ${room.players.length + 1}`;

    const botPlayer: Player = {
      id: botId,
      name: botName,
      cards: [],
      socketId: 'bot',
    };

    room.players.push(botPlayer);

    io.to(roomCode).emit('room-joined', { players: getPlayerInfo(room) });
    io.to(roomCode).emit('game-state', getGameState(room));

    await saveRoom(room);
  });

  socket.on('start-game', async (data: { roomCode: string }) => {
    const { roomCode } = data;
    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.hostId !== socket.id) {
      socket.emit('error', 'Only host can start game');
      return;
    }

    if (room.players.length < 2) {
      socket.emit('error', 'Need at least 2 players');
      return;
    }

    const hands = distributeCards(room.players.length);
    room.players.forEach((player, index) => {
      player.cards = hands[index];
    });

    room.gameStarted = true;
    room.currentPlayerIndex = 0;

    await saveRoom(room);

    room.players.forEach((player) => {
      io.to(player.socketId).emit('your-cards', player.cards);
    });

    io.to(roomCode).emit('game-started');
    io.to(roomCode).emit('game-state', getGameState(room));

    const firstPlayer = room.players[room.currentPlayerIndex];
    if (firstPlayer.socketId === 'bot') {
      setTimeout(() => processBotTurn(io, roomCode), 1000);
    }
  });

  socket.on('play-cards', async (data: PlayCardsData) => {
    const { roomCode, cards, claimedRank } = data;
    const room = rooms.get(roomCode);

    if (!room || !room.gameStarted) {
      socket.emit('error', 'Invalid game state');
      return;
    }

    const currentPlayer = room.players[room.currentPlayerIndex];
    if (currentPlayer.socketId !== socket.id) {
      socket.emit('error', 'Not your turn');
      return;
    }

    // if starting new round, player chooses the rank
    if (!room.currentRank && !claimedRank) {
      socket.emit('error', 'Must specify a rank');
      return;
    }

    const hasCards = cards.every(card => currentPlayer.cards.includes(card));
    if (!hasCards) {
      socket.emit('error', 'Invalid cards');
      return;
    }

    currentPlayer.cards = currentPlayer.cards.filter(card => !cards.includes(card));
    room.pile.push(...cards);

    // First player to play in a round sets the rank for that round
    if (!room.currentRank) {
      room.currentRank = claimedRank.toUpperCase();
    }

    room.lastPlay = {
      playerId: currentPlayer.id,
      cards: cards,
      claimedRank: room.currentRank,
    };
    room.passedPlayers.clear();

    io.to(roomCode).emit('play-made', {
      playerName: currentPlayer.name,
      count: cards.length,
      rank: claimedRank.toUpperCase(),
    });

    // Did the player empty their hand?
    const playerEmptiedHand = currentPlayer.cards.length === 0;
    if (playerEmptiedHand) {
      currentPlayer.finished = true;
      if (!room.finishOrder.includes(currentPlayer.id)) {
        room.finishOrder.push(currentPlayer.id);
      }
    }

    // Move to next active player's turn (skip finished players)
    let nextIndex = (room.currentPlayerIndex + 1) % room.players.length;
    let safety = 0;
    while (room.players[nextIndex].finished && safety < room.players.length) {
      nextIndex = (nextIndex + 1) % room.players.length;
      safety++;
    }
    room.currentPlayerIndex = nextIndex;

    await saveRoom(room);
    io.to(currentPlayer.socketId).emit('your-cards', currentPlayer.cards);

    // Broadcast game state
    io.to(roomCode).emit('game-state', getGameState(room));

    if (playerEmptiedHand) {
      io.to(roomCode).emit('player-finished', { playerId: currentPlayer.id, playerName: currentPlayer.name });
    }

    // Check if next player is bot
    const nextPlayer = room.players[room.currentPlayerIndex];
    if (nextPlayer.socketId === 'bot' && room.gameStarted) {
      setTimeout(() => processBotTurn(io, roomCode), 1500);
    }
  });

  socket.on('call-bluff', async (data: { roomCode: string }) => {
    const { roomCode } = data;
    const room = rooms.get(roomCode);

    if (!room || !room.gameStarted || !room.lastPlay) {
      socket.emit('error', 'Invalid game state');
      return;
    }

    const caller = room.players.find(p => p.socketId === socket.id);
    if (!caller) {
      socket.emit('error', 'Player not found');
      return;
    }

    const lastPlayer = room.players.find(p => p.id === room.lastPlay!.playerId);
    if (!lastPlayer) {
      socket.emit('error', 'Last player not found');
      return;
    }

    // Players can't call bluff on themselves

    if (caller.id === lastPlayer.id && !lastPlayer.finished) {
      socket.emit('error', 'Cannot call bluff on your own play');
      return;
    }

    const claimedRank = room.lastPlay.claimedRank;
    const actualCards = room.lastPlay.cards;
    const wasBluff = !actualCards.every(card => getCardRank(card) === claimedRank);

    let penalizedPlayer: Player;
    if (wasBluff) {
      penalizedPlayer = lastPlayer;
    } else {
      penalizedPlayer = caller;
    }

    penalizedPlayer.cards.push(...room.pile);
    room.pile = [];
    room.lastPlay = null;
    room.currentRank = null;
    room.passedPlayers.clear();

    // Winner of the bluff call goes first in the next round
    const winnerIndex = room.players.findIndex(p => p.id === (wasBluff ? caller.id : lastPlayer.id));
    // If a penalized player was previously marked finished and now gains cards, reset finished flag
    if (penalizedPlayer.cards.length > 0) {
      penalizedPlayer.finished = false;
      const idxInFinish = room.finishOrder.indexOf(penalizedPlayer.id);
      if (idxInFinish !== -1) {
        room.finishOrder.splice(idxInFinish, 1);
      }
    }

    // Winner of the bluff call takes the first turn in the next round.
    room.currentPlayerIndex = winnerIndex;

    // If that winner has already finished their cards, move to the next active player.
    let rotateSafe = 0;
    while (room.players[room.currentPlayerIndex].finished && rotateSafe < room.players.length) {
      room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
      rotateSafe++;
    }

    io.to(roomCode).emit('bluff-called', {
      callerName: caller.name,
      lastPlayerName: lastPlayer.name,
      wasBluff,
      penalizedPlayerName: penalizedPlayer.name,
    });

    await saveRoom(room);

    io.to(penalizedPlayer.socketId).emit('your-cards', penalizedPlayer.cards);
    io.to(roomCode).emit('game-state', getGameState(room));

    // Check if game should end after bluff resolution
    const activePlayers = room.players.filter(p => !p.finished);
    if (activePlayers.length <= 1) {
      room.gameStarted = false;

      const leaderboard = [...room.finishOrder];
      activePlayers.forEach(player => {
        if (!leaderboard.includes(player.id)) {
          leaderboard.push(player.id);
        }
      });

      const leaderboardNames = leaderboard
        .map(id => {
          const player = room.players.find(p => p.id === id);
          return player ? player.name : null;
        })
        .filter((name): name is string => name !== null);

      console.log('Game over! Leaderboard:', leaderboardNames);
      io.to(roomCode).emit('game-over', { leaderboard: leaderboardNames });
      await saveRoom(room);
      return;
    }

    // Check if next player is bot
    const nextPlayer = room.players[room.currentPlayerIndex];
    if (nextPlayer.socketId === 'bot' && room.gameStarted) {
      setTimeout(() => processBotTurn(io, roomCode), 1500);
    }
  });

  socket.on('pass', async (data: { roomCode: string }) => {
    const { roomCode } = data;
    const room = rooms.get(roomCode);

    if (!room || !room.gameStarted) {
      socket.emit('error', 'Invalid game state');
      return;
    }

    const currentPlayer = room.players[room.currentPlayerIndex];
    if (currentPlayer.socketId !== socket.id) {
      socket.emit('error', 'Not your turn');
      return;
    }

    if (!room.currentRank) {
      socket.emit('error', 'Cannot pass at start of game');
      return;
    }

    room.passedPlayers.add(currentPlayer.id);

    io.to(roomCode).emit('player-passed', { playerName: currentPlayer.name });

    // If every other active player except current has passed
    const activePlayersCount = room.players.filter(p => !p.finished).length;
    if (room.passedPlayers.size === activePlayersCount - 1) {
      // If everyone else passed, current player starts fresh round
      room.currentRank = null;
      room.pile = [];
      room.lastPlay = null;
      room.passedPlayers.clear();

      io.to(roomCode).emit('round-ended', { starterName: currentPlayer.name });
    } else {
      // Move to next active player
      let nextPassIdx = (room.currentPlayerIndex + 1) % room.players.length;
      let guard = 0;
      while (room.players[nextPassIdx].finished && guard < room.players.length) {
        nextPassIdx = (nextPassIdx + 1) % room.players.length;
        guard++;
      }
      room.currentPlayerIndex = nextPassIdx;
    }

    await saveRoom(room);
    io.to(roomCode).emit('game-state', getGameState(room));

    // Check if next player is bot
    const nextPlayer = room.players[room.currentPlayerIndex];
    if (nextPlayer.socketId === 'bot' && room.gameStarted) {
      setTimeout(() => processBotTurn(io, roomCode), 1500);
    }
  });

  socket.on('disconnect', async () => {
    for (const [roomCode, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);

        if (room.players.length === 0) {
          await deleteRoom(roomCode);
          rooms.delete(roomCode);
        } else {
          if (room.hostId === socket.id && room.players.length > 0) {
            room.hostId = room.players[0].socketId;
          }

          if (room.gameStarted && room.currentPlayerIndex >= room.players.length) {
            room.currentPlayerIndex = 0;
          }

          await saveRoom(room);
          io.to(roomCode).emit('game-state', getGameState(room));
        }
        break;
      }
    }
  });
}

function getPlayerInfo(room: GameRoom) {
  return room.players.map(p => ({
    id: p.id,
    name: p.name,
    cardCount: p.cards.length,
    isActive: !p.finished,
  }));
}

function getGameState(room: GameRoom) {
  return {
    players: getPlayerInfo(room),
    currentPlayerIndex: room.currentPlayerIndex,
    currentRank: room.currentRank,
    pileCount: room.pile.length,
    lastPlay: room.lastPlay ? {
      playerId: room.lastPlay.playerId,
      playerName: room.players.find(p => p.id === room.lastPlay!.playerId)?.name || '',
      count: room.lastPlay.cards.length,
      rank: room.lastPlay.claimedRank,
    } : null,
    canCallBluff: room.lastPlay !== null,
    canPass: room.currentRank !== null && room.passedPlayers.size < room.players.filter(p => !p.finished).length - 1,
    roundEnded: room.currentRank === null && room.pile.length === 0 && room.gameStarted,
    gameStarted: room.gameStarted,
    // Only declare a winner after the game actually started and at least one player has finished
    winner: (!room.gameStarted && room.players.filter(p => !p.finished).length === 1 && room.players.some(p => p.finished)) ?
      room.players.find(p => !p.finished)?.name || null : null,
  };
}

async function processBotTurn(io: Server, roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room || !room.gameStarted) return;

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (currentPlayer.socketId !== 'bot') return; // Not a bot turn

  const bot = new Bot(currentPlayer.id, currentPlayer.name);
  const move = bot.makeMove(room);

  console.log(`Bot ${currentPlayer.name} doing ${move.action}`);

  if (move.action === 'play') {
    const cards = move.cards!;
    const claimedRank = move.claimedRank!;

    currentPlayer.cards = currentPlayer.cards.filter(card => !cards.includes(card));
    room.pile.push(...cards);

    if (!room.currentRank) {
      room.currentRank = claimedRank.toUpperCase();
    }

    room.lastPlay = {
      playerId: currentPlayer.id,
      cards: cards,
      claimedRank: room.currentRank!,
    };
    room.passedPlayers.clear();

    io.to(roomCode).emit('play-made', {
      playerName: currentPlayer.name,
      count: cards.length,
      rank: claimedRank.toUpperCase(),
    });

    const playerEmptiedHand = currentPlayer.cards.length === 0;
    if (playerEmptiedHand) {
      currentPlayer.finished = true;
      if (!room.finishOrder.includes(currentPlayer.id)) {
        room.finishOrder.push(currentPlayer.id);
      }
    }

    let nextIndex = (room.currentPlayerIndex + 1) % room.players.length;
    let safety = 0;
    while (room.players[nextIndex].finished && safety < room.players.length) {
      nextIndex = (nextIndex + 1) % room.players.length;
      safety++;
    }
    room.currentPlayerIndex = nextIndex;

    await saveRoom(room);
    // No need to emit 'your-cards' to bot
    io.to(roomCode).emit('game-state', getGameState(room));

    if (playerEmptiedHand) {
      io.to(roomCode).emit('player-finished', { playerId: currentPlayer.id, playerName: currentPlayer.name });
    }

    // Check next player
    const nextPlayer = room.players[room.currentPlayerIndex];
    if (nextPlayer.socketId === 'bot' && room.gameStarted) {
      setTimeout(() => processBotTurn(io, roomCode), 1500);
    }

  } else if (move.action === 'pass') {
    room.passedPlayers.add(currentPlayer.id);
    io.to(roomCode).emit('player-passed', { playerName: currentPlayer.name });

    const activePlayersCount = room.players.filter(p => !p.finished).length;
    if (room.passedPlayers.size === activePlayersCount - 1) {
      room.currentRank = null;
      room.pile = [];
      room.lastPlay = null;
      room.passedPlayers.clear();
      io.to(roomCode).emit('round-ended', { starterName: currentPlayer.name });
    } else {
      let nextPassIdx = (room.currentPlayerIndex + 1) % room.players.length;
      let guard = 0;
      while (room.players[nextPassIdx].finished && guard < room.players.length) {
        nextPassIdx = (nextPassIdx + 1) % room.players.length;
        guard++;
      }
      room.currentPlayerIndex = nextPassIdx;
    }

    await saveRoom(room);
    io.to(roomCode).emit('game-state', getGameState(room));

    const nextPlayer = room.players[room.currentPlayerIndex];
    if (nextPlayer.socketId === 'bot' && room.gameStarted) {
      setTimeout(() => processBotTurn(io, roomCode), 1500);
    }

  } else if (move.action === 'call-bluff') {


    const lastPlayerId = room.lastPlay!.playerId;
    const lastPlayer = room.players.find(p => p.id === lastPlayerId)!;

    const claimedRank = room.lastPlay!.claimedRank;
    const actualCards = room.lastPlay!.cards;
    const wasBluff = !actualCards.every(card => getCardRank(card) === claimedRank);

    let penalizedPlayer: Player;
    if (wasBluff) {
      penalizedPlayer = lastPlayer;
    } else {
      penalizedPlayer = currentPlayer;
    }

    penalizedPlayer.cards.push(...room.pile);
    room.pile = [];
    room.lastPlay = null;
    room.currentRank = null;
    room.passedPlayers.clear();

    const winnerIndex = room.players.findIndex(p => p.id === (wasBluff ? currentPlayer.id : lastPlayer.id));

    if (penalizedPlayer.cards.length > 0) {
      penalizedPlayer.finished = false;
      const idxInFinish = room.finishOrder.indexOf(penalizedPlayer.id);
      if (idxInFinish !== -1) room.finishOrder.splice(idxInFinish, 1);
    }

    room.currentPlayerIndex = winnerIndex;
    let rotateSafe = 0;
    while (room.players[room.currentPlayerIndex].finished && rotateSafe < room.players.length) {
      room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
      rotateSafe++;
    }

    io.to(roomCode).emit('bluff-called', {
      callerName: currentPlayer.name,
      lastPlayerName: lastPlayer.name,
      wasBluff,
      penalizedPlayerName: penalizedPlayer.name,
    });

    await saveRoom(room);
    if (penalizedPlayer.socketId !== 'bot') {
      io.to(penalizedPlayer.socketId).emit('your-cards', penalizedPlayer.cards);
    }
    io.to(roomCode).emit('game-state', getGameState(room));

    // Check if game should end after bluff resolution
    const activePlayers = room.players.filter(p => !p.finished);
    if (activePlayers.length <= 1) {
      room.gameStarted = false;

      const leaderboard = [...room.finishOrder];
      activePlayers.forEach(player => {
        if (!leaderboard.includes(player.id)) {
          leaderboard.push(player.id);
        }
      });

      const leaderboardNames = leaderboard
        .map(id => {
          const player = room.players.find(p => p.id === id);
          return player ? player.name : null;
        })
        .filter((name): name is string => name !== null);

      console.log('Game over! Leaderboard:', leaderboardNames);
      io.to(roomCode).emit('game-over', { leaderboard: leaderboardNames });
      await saveRoom(room);
      return;
    }

    const nextPlayer = room.players[room.currentPlayerIndex];
    if (nextPlayer.socketId === 'bot' && room.gameStarted) {
      setTimeout(() => processBotTurn(io, roomCode), 1500);
    }
  }
}
