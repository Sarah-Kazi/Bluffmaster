import { Server, Socket } from 'socket.io';
import { GameRoom, Player, JoinRoomData, PlayCardsData } from './types';
import { distributeCards, getCardRank } from './deck';
import { saveRoom, getRoom, deleteRoom } from './redis';

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

    // Check if the current player has won by playing their last card
    if (currentPlayer.cards.length === 0) {
      // Game ends when a player runs out of cards
      room.gameStarted = false;
      // Update all clients with the final game state
      io.to(roomCode).emit('game-state', {
        ...getGameState(room),
        gameStarted: false,
        winner: currentPlayer.name
      });
      // Let everyone know who won
      io.to(roomCode).emit('game-won', { winnerName: currentPlayer.name });
      // Give clients time to see the results before cleaning up the room
      setTimeout(async () => {
        await deleteRoom(roomCode);
        rooms.delete(roomCode);
      }, 5000);
    } else {
      // Move to next player's turn
      room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
      await saveRoom(room);
      io.to(currentPlayer.socketId).emit('your-cards', currentPlayer.cards);
      io.to(roomCode).emit('game-state', getGameState(room));
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
    if (caller.id === lastPlayer.id) {
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
    room.currentPlayerIndex = winnerIndex;

    io.to(roomCode).emit('bluff-called', {
      callerName: caller.name,
      lastPlayerName: lastPlayer.name,
      wasBluff,
      penalizedPlayerName: penalizedPlayer.name,
    });

    await saveRoom(room);

    io.to(penalizedPlayer.socketId).emit('your-cards', penalizedPlayer.cards);
    io.to(roomCode).emit('game-state', getGameState(room));
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

    if (room.passedPlayers.size === room.players.length - 1) {
      // If everyone else passed, current player starts fresh round
      room.currentRank = null;
      room.pile = [];
      room.lastPlay = null;
      room.passedPlayers.clear();

      io.to(roomCode).emit('round-ended', { starterName: currentPlayer.name });
    } else {
      room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
    }

    await saveRoom(room);
    io.to(roomCode).emit('game-state', getGameState(room));
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
    isActive: true,
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
    canPass: room.currentRank !== null && room.passedPlayers.size < room.players.length - 1,
    roundEnded: room.currentRank === null && room.pile.length === 0 && room.gameStarted,
    gameStarted: room.gameStarted,
    winner: null,
  };
}
