import { GameRoom, Player } from './types';
import { getCardRank } from './deck';

export interface BotMove {
  action: 'play' | 'pass' | 'call-bluff';
  cards?: string[];
  claimedRank?: string;
}

export class Bot {
  id: string;
  name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  makeMove(room: GameRoom): BotMove {
    const me = room.players.find(p => p.id === this.id);
    if (!me) throw new Error('Bot not in room');


    if (room.lastPlay && room.lastPlay.playerId !== this.id) {
      const shouldCall = this.shouldCallBluff(room, me);
      if (shouldCall) {
        return { action: 'call-bluff' };
      }
    }

    const currentRank = room.currentRank;

    if (!currentRank) {

      const bestPlay = this.findBestStartingPlay(me.cards);
      return {
        action: 'play',
        cards: bestPlay.cards,
        claimedRank: bestPlay.rank
      };
    } else {
      const myCardsOfRank = me.cards.filter(c => getCardRank(c) === currentRank);

      if (myCardsOfRank.length > 0) {
        return {
          action: 'play',
          cards: myCardsOfRank,
          claimedRank: currentRank
        };
      } else {
        const canPass = room.passedPlayers.size < room.players.filter(p => !p.finished).length - 1;

        if (canPass) {
          if (room.pile.length > 5) {
            return { action: 'pass' };
          }
        }

        const bluffCard = this.getLowestCard(me.cards);
        return {
          action: 'play',
          cards: [bluffCard],
          claimedRank: currentRank
        };
      }
    }
  }

  private shouldCallBluff(room: GameRoom, me: Player): boolean {
    if (!room.lastPlay) return false;

    const lastPlayer = room.players.find(p => p.id === room.lastPlay?.playerId);
    if (lastPlayer && lastPlayer.cards.length === 0) {
      return true;
    }

    const claimedRank = room.lastPlay.claimedRank;
    const cardsPlayed = room.lastPlay.cards.length;

    if (cardsPlayed >= 3) return Math.random() > 0.5;

    const myCount = me.cards.filter(c => getCardRank(c) === claimedRank).length;
    const totalInDeck = 4;
    if (myCount + cardsPlayed > totalInDeck) {
      return true;
    }

    return Math.random() < 0.1;
  }

  private findBestStartingPlay(cards: string[]): { cards: string[], rank: string } {
    const groups: Record<string, string[]> = {};
    cards.forEach(c => {
      const rank = getCardRank(c);
      if (!groups[rank]) groups[rank] = [];
      groups[rank].push(c);
    });

    const ranks = Object.keys(groups);
    if (ranks.length === 0) return { cards: [], rank: 'A' };

    const rankToPlay = ranks[0];
    return {
      cards: groups[rankToPlay],
      rank: rankToPlay
    };
  }
  private getLowestCard(cards: string[]): string {
    return cards[0];
  }
}
