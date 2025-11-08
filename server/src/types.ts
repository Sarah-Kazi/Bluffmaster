export interface Player {
  id: string;
  name: string;
  cards: string[];
  socketId: string;
}

export interface GameRoom {
  code: string;
  players: Player[];
  currentPlayerIndex: number;
  currentRank: string | null;
  pile: string[];
  lastPlay: {
    playerId: string;
    cards: string[];
    claimedRank: string;
  } | null;
  passedPlayers: Set<string>;
  gameStarted: boolean;
  hostId: string;
}

export interface PlayCardsData {
  roomCode: string;
  cards: string[];
  claimedRank: string;
}

export interface JoinRoomData {
  roomCode: string;
  playerName: string;
}
