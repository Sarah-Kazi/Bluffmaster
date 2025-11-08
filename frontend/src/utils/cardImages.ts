// using deck of cards api for card images
export function getCardImageUrl(card: string): string {
  // card format: rank + suit (e.g., "AH", "10D", "KC")
  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  
  // map suits to full names
  const suitMap: { [key: string]: string } = {
    'H': 'HEARTS',
    'D': 'DIAMONDS',
    'C': 'CLUBS',
    'S': 'SPADES'
  };
  
  // map ranks to card codes
  const rankMap: { [key: string]: string } = {
    'A': 'A',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '0',
    'J': 'J',
    'Q': 'Q',
    'K': 'K'
  };
  
  const suitName = suitMap[suit];
  const rankCode = rankMap[rank];
  
  if (!suitName || !rankCode) {
    return '/card-back.png';
  }
  
  // using deckofcardsapi.com images
  return `https://deckofcardsapi.com/static/img/${rankCode}${suit}.png`;
}

export function getCardBackUrl(): string {
  return 'https://deckofcardsapi.com/static/img/back.png';
}
