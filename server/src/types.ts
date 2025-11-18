export interface Player {
  id: string;
  name: string;
  cards: string[];
  socketId: string;
  /**
   * Indicates that the player has successfully played all their cards and
   * is no longer taking part in the active rotation. A finished player can
   * still be the target of a bluff call on their final move, but they will
   * no longer receive turns.
   */
  finished?: boolean;
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
  /**
   * Ordered list of player ids in the order they finished all their cards.
   */
  finishOrder: string[];
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
