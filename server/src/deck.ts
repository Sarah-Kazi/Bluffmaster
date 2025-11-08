export function createDeck(): string[] {
  const suits = ['H', 'D', 'C', 'S'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: string[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(rank + suit);
    }
  }

  return deck;
}

export function shuffleDeck(deck: string[]): string[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function distributeCards(playerCount: number): string[][] {
  const deck = shuffleDeck(createDeck());
  const hands: string[][] = Array.from({ length: playerCount }, () => []);

  deck.forEach((card, index) => {
    hands[index % playerCount].push(card);
  });

  return hands;
}

export function getCardRank(card: string): string {
  return card.slice(0, -1);
}
