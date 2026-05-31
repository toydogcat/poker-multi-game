
import { 
  Card, 
  Player, 
  GameState, 
  GameType, 
  CHARACTER_DATA,
  Suit
} from "../types";
import { 
  createDeck, 
  shuffle, 
  canBeatBigTwo, 
  getBigTwoCardWeight,
  evaluateBigTwoCombo, 
  BigTwoComboType,
  evaluateTexasHand, 
  compareTexasEvaluations, 
  evaluateShowHandSubset,
  compareShowHandEvaluations
} from "./pokerLogic";
import { 
  executeRubCard, 
  getCharacterTrashingSound
} from "./powerLogic";

// Manage turn countdown timer
export function clearAndScheduleTurnTimeout(room: GameState, onForceAction: (roomId: string) => void): NodeJS.Timeout | undefined {
  // If room is not in active play, exit
  if (room.status !== "PLAYING") {
    room.turnEndsAt = undefined;
    return undefined;
  }

  // Check configured turn limit
  const limit = room.turnTimeLimit || 0;
  if (limit <= 0) {
    room.turnEndsAt = undefined;
    return undefined;
  }

  // Update state turnEndsAt timestamp so client has visual progress bar/seconds
  room.turnEndsAt = Date.now() + limit * 1000;

  // Schedule forced action timeout
  const timeoutId = setTimeout(() => {
    onForceAction(room.roomId);
  }, limit * 1000);

  return timeoutId;
}

// Initialize individual Big Two game
export function initBigTwo(room: GameState) {
  room.status = "PLAYING";
  let deck = createDeck();
  if (room.useJokers) {
    deck.push({
      id: 'joker-small',
      suit: 'C',
      value: 15,
      isJoker: 'small',
    });
    deck.push({
      id: 'joker-big',
      suit: 'S',
      value: 15,
      isJoker: 'big',
    });
  }
  deck = shuffle(deck);

  // Big Two always has exactly 4 players. Fill with bots if needed.
  const slotsNeeded = 4 - room.players.length;
  if (slotsNeeded > 0) {
    const availableAvatars = ["star", "tat", "yee_mung", "tai_kwan", "dagger", "devil_chan"];
    const shuffledAvatars = availableAvatars.sort(() => Math.random() - 0.5);
    for (let i = 0; i < slotsNeeded; i++) {
      const avatarKey = shuffledAvatars[i] || "tai_kwan";
      const charInfo = CHARACTER_DATA[avatarKey as keyof typeof CHARACTER_DATA];
      const botPlayer: Player = {
        id: `bot-${avatarKey}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: `${charInfo.name} (AI)`,
        avatar: avatarKey,
        chips: 10000,
        mp: charInfo.baseMp,
        cards: [],
        isReady: true,
        isBot: true,
        isHost: false,
      };
      room.players.push(botPlayer);
    }
  }

  for (const player of room.players) {
    const charInfo = CHARACTER_DATA[player.avatar as keyof typeof CHARACTER_DATA] || CHARACTER_DATA.player;
    player.mp = charInfo.baseMp;
    player.cards = [];
    player.lastAction = undefined;
    player.isRubbing = false;
  }

  for (let i = 0; i < 4; i++) {
    room.players[i].cards = deck.slice(i * 13, (i + 1) * 13);
  }

  room.lastPlayCards = undefined;
  room.lastPlayUserId = undefined;
  room.currentRoundPassCount = 0;

  let startPlayerIndex = 0;
  let hasD3 = false;
  for (let i = 0; i < 4; i++) {
    const p = room.players[i];
    const d3 = p.cards.find(c => c.suit === 'D' && c.value === 3);
    if (d3) {
      startPlayerIndex = i;
      hasD3 = true;
      room.startingDiamond3PlayerId = p.id;
      break;
    }
  }

  if (!hasD3) {
    let minWeight = 9999;
    for (let i = 0; i < 4; i++) {
      for (const card of room.players[i].cards) {
        const w = getBigTwoCardWeight(card);
        if (w < minWeight) {
          minWeight = w;
          startPlayerIndex = i;
        }
      }
    }
    room.startingDiamond3PlayerId = room.players[startPlayerIndex].id;
  }

  room.activePlayerIndex = startPlayerIndex;
}

// Initialize Texas Hold'em game
export function initTexasHoldem(room: GameState) {
  room.status = "PLAYING";
  let deck = createDeck();
  if (room.useJokers) {
    deck.push({ id: 'joker-small', suit: 'C', value: 15, isJoker: 'small' });
    deck.push({ id: 'joker-big', suit: 'S', value: 15, isJoker: 'big' });
  }
  deck = shuffle(deck);

  if (room.players.length < 3) {
    const slotsNeeded = 4 - room.players.length;
    const availableAvatars = ["star", "tat", "yee_mung", "tai_kwan", "dagger", "devil_chan"];
    const shuffledAvatars = availableAvatars.sort(() => Math.random() - 0.5);
    for (let i = 0; i < slotsNeeded; i++) {
      const avatarKey = shuffledAvatars[i] || "tai_kwan";
      const charInfo = CHARACTER_DATA[avatarKey as keyof typeof CHARACTER_DATA];
      const botPlayer: Player = {
        id: `bot-${avatarKey}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: `${charInfo.name} (AI)`,
        avatar: avatarKey,
        chips: 10000,
        mp: charInfo.baseMp,
        cards: [],
        isReady: true,
        isBot: true,
        isHost: false,
      };
      room.players.push(botPlayer);
    }
  }

  for (const player of room.players) {
    const charInfo = CHARACTER_DATA[player.avatar as keyof typeof CHARACTER_DATA] || CHARACTER_DATA.player;
    player.mp = charInfo.baseMp;
    player.cards = [];
    player.currentBet = 0;
    player.hasFolded = false;
    player.isAllIn = false;
    player.lastAction = undefined;
    player.isRubbing = false;
  }

  room.communityCards = [];
  room.currentStep = 0;
  room.pot = 0;
  room.currentHighBet = room.bigBlind;

  room.dealerIndex = (room.dealerIndex + 1) % room.players.length;
  const sbIndex = (room.dealerIndex + 1) % room.players.length;
  const bbIndex = (room.dealerIndex + 2) % room.players.length;

  room.players[sbIndex].chips -= room.smallBlind;
  room.players[sbIndex].currentBet = room.smallBlind;
  room.players[sbIndex].lastAction = `小盲注 $${room.smallBlind}`;

  room.players[bbIndex].chips -= room.bigBlind;
  room.players[bbIndex].currentBet = room.bigBlind;
  room.players[bbIndex].lastAction = `大盲注 $${room.bigBlind}`;

  room.pot = room.smallBlind + room.bigBlind;

  for (let i = 0; i < room.players.length; i++) {
    room.players[i].cards = deck.slice(i * 2, (i + 1) * 2);
  }

  room.deck = deck.slice(room.players.length * 2);
  room.activePlayerIndex = (bbIndex + 1) % room.players.length;
}

// Initialize Show Hand (梭哈) game
export function initShowHand(room: GameState) {
  room.status = "PLAYING";
  let deck = createDeck();
  if (room.useJokers) {
    deck.push({ id: 'joker-small', suit: 'C', value: 15, isJoker: 'small' });
    deck.push({ id: 'joker-big', suit: 'S', value: 15, isJoker: 'big' });
  }
  deck = shuffle(deck);

  if (room.players.length < 3) {
    const slotsNeeded = 4 - room.players.length;
    const availableAvatars = ["star", "tat", "yee_mung", "tai_kwan", "dagger", "devil_chan"];
    const shuffledAvatars = availableAvatars.sort(() => Math.random() - 0.5);
    for (let i = 0; i < slotsNeeded; i++) {
      const avatarKey = shuffledAvatars[i] || "tai_kwan";
      const charInfo = CHARACTER_DATA[avatarKey as keyof typeof CHARACTER_DATA];
      const botPlayer: Player = {
        id: `bot-${avatarKey}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: `${charInfo.name} (AI)`,
        avatar: avatarKey,
        chips: 10000,
        mp: charInfo.baseMp,
        cards: [],
        isReady: true,
        isBot: true,
        isHost: false,
      };
      room.players.push(botPlayer);
    }
  }

  for (const player of room.players) {
    const charInfo = CHARACTER_DATA[player.avatar as keyof typeof CHARACTER_DATA] || CHARACTER_DATA.player;
    player.mp = charInfo.baseMp;
    player.cards = [];
    player.currentBet = 0;
    player.hasFolded = false;
    player.isAllIn = false;
    player.lastAction = undefined;
    player.isRubbing = false;
  }

  room.communityCards = [];
  room.currentStep = 0;
  room.pot = 0;
  room.currentHighBet = 0;

  for (let i = 0; i < room.players.length; i++) {
    room.players[i].cards = deck.slice(i * 2, (i + 1) * 2);
  }

  room.deck = deck.slice(room.players.length * 2);

  let startPlayerIndex = 0;
  let highestVisibleCardEval = evaluateShowHandSubset([room.players[0].cards[1]]);
  for (let i = 1; i < room.players.length; i++) {
    const pCardEval = evaluateShowHandSubset([room.players[i].cards[1]]);
    if (compareShowHandEvaluations(pCardEval, highestVisibleCardEval) > 0) {
      highestVisibleCardEval = pCardEval;
      startPlayerIndex = i;
    }
  }

  room.activePlayerIndex = startPlayerIndex;
}

// Bot logic trigger (simplified for client-side use)
export function getBotAction(room: GameState): { type: string, payload: any } | null {
  if (room.status !== "PLAYING") return null;

  const botIndex = room.activePlayerIndex;
  const bot = room.players[botIndex];
  if (!bot || !bot.isBot) return null;

  // Simplified bot logic
  if (room.gameType === GameType.BIG_TWO) {
    const sortedHand = [...bot.cards].sort((a, b) => getBigTwoCardWeight(a) - getBigTwoCardWeight(b));
    const isFirstPlayWithD3 = room.startingDiamond3PlayerId === bot.id && !room.lastPlayCards;
    
    if (isFirstPlayWithD3) {
      const d3Card = sortedHand.find(c => c.suit === 'D' && c.value === 3);
      if (d3Card) return { type: 'PLAY_BIG_TWO_CARDS', payload: { cardsToPlay: [d3Card] } };
    }

    if (!room.lastPlayCards || room.lastPlayCards.length === 0) {
      return { type: 'PLAY_BIG_TWO_CARDS', payload: { cardsToPlay: [sortedHand[0]] } };
    } else {
      for (const card of sortedHand) {
        if (canBeatBigTwo([card], room.lastPlayCards)) {
          return { type: 'PLAY_BIG_TWO_CARDS', payload: { cardsToPlay: [card] } };
        }
      }
      return { type: 'PASS_BIG_TWO_TURN', payload: {} };
    }
  } else if (room.gameType === GameType.TEXAS_HOLDEM || room.gameType === GameType.SHOW_HAND) {
    const callAmount = room.currentHighBet - (bot.currentBet || 0);
    const actionType = room.gameType === GameType.TEXAS_HOLDEM ? 'TEXAS_BET_ACTION' : 'SHOW_HAND_BET_ACTION';
    
    if (callAmount === 0) {
      return { type: actionType, payload: { amount: 0, actionType: 'CHECK' } };
    } else {
      if (Math.random() < 0.2) return { type: actionType, payload: { amount: 0, actionType: 'FOLD' } };
      return { type: actionType, payload: { amount: callAmount, actionType: 'CALL' } };
    }
  }

  return null;
}

// Game Action Handlers (Move logic from server.ts)
export function handleGameAction(room: GameState, type: string, payload: any): boolean {
  // Returns true if state changed significantly
  switch (type) {
    case 'PLAY_BIG_TWO_CARDS':
      return playBigTwoCards(room, payload.clientId, payload.cardsToPlay);
    case 'PASS_BIG_TWO_TURN':
      return passBigTwoTurn(room, payload.clientId);
    // ... other actions
  }
  return false;
}

function playBigTwoCards(room: GameState, playerId: string, cardsToPlay: Card[]): boolean {
  if (room.activePlayerIndex === -1) return false;
  const activePlayer = room.players[room.activePlayerIndex];
  if (activePlayer.id !== playerId) return false;

  const isFirstPlayWithD3 = room.startingDiamond3PlayerId === playerId && !room.lastPlayCards;
  if (isFirstPlayWithD3) {
    const hasD3InHand = activePlayer.cards.some(c => c.suit === 'D' && c.value === 3);
    if (hasD3InHand && !cardsToPlay.some(c => c.suit === 'D' && c.value === 3)) return false;
  }

  if (!canBeatBigTwo(cardsToPlay, room.lastPlayCards)) return false;

  const playedIds = cardsToPlay.map(c => c.id);
  activePlayer.cards = activePlayer.cards.filter(c => !playedIds.includes(c.id));
  
  const comboEval = evaluateBigTwoCombo(cardsToPlay);
  activePlayer.lastAction = `打出 ${comboEval.type}`;
  room.lastPlayCards = cardsToPlay;
  room.lastPlayUserId = activePlayer.id;
  room.currentRoundPassCount = 0;

  advanceBigTwoTurn(room);
  return true;
}

function passBigTwoTurn(room: GameState, playerId: string): boolean {
  if (room.activePlayerIndex === -1) return false;
  const activePlayer = room.players[room.activePlayerIndex];
  if (activePlayer.id !== playerId) return false;

  if (!room.lastPlayCards || room.lastPlayCards.length === 0 || room.lastPlayUserId === activePlayer.id) return false;

  activePlayer.lastAction = "過 (PASS)";
  room.currentRoundPassCount += 1;

  if (room.currentRoundPassCount >= 3) {
    room.lastPlayCards = undefined;
    room.lastPlayUserId = undefined;
    room.currentRoundPassCount = 0;
    for (const p of room.players) if (p.lastAction?.includes("過")) p.lastAction = undefined;
  }

  advanceBigTwoTurn(room);
  return true;
}

function advanceBigTwoTurn(room: GameState) {
  const winner = room.players.find(p => p.cards.length === 0);
  if (winner) {
    room.status = "GAME_OVER";
    room.winnerIds = [winner.id];
    return;
  }

  room.activePlayerIndex = (room.activePlayerIndex + 1) % room.players.length;
  if (room.isPowerMode) {
    const p = room.players[room.activePlayerIndex];
    if (p) p.mp = Math.min(100, p.mp + (p.avatar === 'yee_mung' ? 30 : 10));
  }
}
