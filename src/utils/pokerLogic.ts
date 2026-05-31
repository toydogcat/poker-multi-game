/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, Suit } from '../types';

// ==========================================
// Deck & Basic Utility Functions
// ==========================================

export function createDeck(): Card[] {
  const suits: Suit[] = ['S', 'H', 'D', 'C']; // Spades ♠, Hearts ♥, Diamonds ♦, Clubs ♣
  const deck: Card[] = [];
  for (const suit of suits) {
    for (let value = 1; value <= 13; value++) {
      deck.push({
        id: `${suit}-${value}`,
        suit,
        value,
      });
    }
  }
  return deck;
}

export function shuffle(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function cardToString(card: Card): string {
  const suitsMap = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const valuesMap: { [key: number]: string } = {
    1: 'A',
    11: 'J',
    12: 'Q',
    13: 'K',
  };
  const valStr = valuesMap[card.value] || card.value.toString();
  return `${suitsMap[card.suit]}${valStr}`;
}

// ==========================================
// Big Two (大老二) Rule Engine
// ==========================================

/**
 * Big Two card value weights:
 * 3 -> 3
 * 4 -> 4
 * ...
 * 10 -> 10
 * J  -> 11
 * Q  -> 12
 * K  -> 13
 * A  -> 14
 * 2  -> 15
 * 
 * Suit weight (Taiwan rules): Spades (S) > Hearts (H) > Diamonds (D) > Clubs (C)
 * S: 4, H: 3, D: 2, C: 1
 */
export function getBigTwoCardNumberValue(card: Card): number {
  if (card.isJoker === 'big') return 15.8;
  if (card.isJoker === 'small') return 15.6;
  if (card.value === 1) return 14; // Ace is 14
  if (card.value === 2) return 15; // 2 is 15
  return card.value;
}

export function getBigTwoCardWeight(card: Card): number {
  if (card.isJoker === 'big') return 153.8;
  if (card.isJoker === 'small') return 153.6;
  const numValue = getBigTwoCardNumberValue(card);
  const suitWeights = { S: 4, H: 3, D: 2, C: 1 };
  const suitWeight = suitWeights[card.suit] || 0;
  return numValue * 10 + suitWeight;
}

/**
 * Sorts card list in ascending order of Big Two weight
 */
export function sortBigTwoCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => getBigTwoCardWeight(a) - getBigTwoCardWeight(b));
}

export enum BigTwoComboType {
  INVALID = 'INVALID',
  SINGLE = 'SINGLE',
  PAIR = 'PAIR',
  TRIPLE = 'TRIPLE',
  STRAIGHT = 'STRAIGHT',
  FLUSH = 'FLUSH',
  FULL_HOUSE = 'FULL_HOUSE',
  FOUR_OF_A_KIND = 'FOUR_OF_A_KIND', // 四條/鐵支 + 隨意單張
  STRAIGHT_FLUSH = 'STRAIGHT_FLUSH',
}

export interface BigTwoCombo {
  type: BigTwoComboType;
  cards: Card[];
  compareWeight: number; // Primary weight used to decide which combo beats another of same type
  hasJoker?: boolean;
}

/**
 * Get internal straight sequence order.
 * In Big Two, is 3-4-5-6-7 the lowest?
 * Standard straight sorting based on Big Two card weights.
 * Valid straights are 5 cards long.
 */
export function isConsecutiveStraight(rawValues: number[]): boolean {
  // rawValues: values in 1..13 range.
  // We can have straights like:
  // 3-4-5-6-7, 4-5-6-7-8, ..., 10-J-Q-K-A (10-11-12-13-1), J-Q-K-A-2 (11-12-13-1-2), A-2-3-4-5 (1-2-3-4-5), 2-3-4-5-6 (2-3-4-5-6).
  // Let's model this by mapping values to their relative values.
  // Standard straight values in Big Two: card values mapped to 3..15:
  // values are: 3,4,5,6,7,8,9,10,11(J),12(Q),13(K),14(A),15(2)
  // Let's sort the weights of the numbers:
  const sortedBigVals = rawValues.map(v => (v === 1 ? 14 : v === 2 ? 15 : v)).sort((a, b) => a - b);
  
  // Check standard sequential (e.g. 3-4-5-6-7)
  let normalStraight = true;
  for (let i = 0; i < sortedBigVals.length - 1; i++) {
    if (sortedBigVals[i + 1] !== sortedBigVals[i] + 1) {
      normalStraight = false;
      break;
    }
  }
  if (normalStraight) return true;

  // Let's check wrap-around.
  // What about A-2-3-4-5? In values: 1, 2, 3, 4, 5.
  const rawSorted = [...rawValues].sort((a, b) => a - b);
  if (JSON.stringify(rawSorted) === JSON.stringify([1, 2, 3, 4, 5])) return true;
  // What about 2-3-4-5-6? In values: 2, 3, 4, 5, 6.
  if (JSON.stringify(rawSorted) === JSON.stringify([2, 3, 4, 5, 6])) return true;
  
  // What about 10-J-Q-K-A? In values: 1, 10, 11, 12, 13.
  if (JSON.stringify(rawSorted) === JSON.stringify([1, 10, 11, 12, 13])) return true;

  return false;
}

/**
 * Identify card combination for Big Two
 */
export function evaluateBigTwoComboNatural(cards: Card[]): BigTwoCombo {
  if (cards.length === 0) {
    return { type: BigTwoComboType.INVALID, cards: [], compareWeight: 0 };
  }

  const sorted = sortBigTwoCards(cards);
  const len = cards.length;

  // 1. Single (1 Card)
  if (len === 1) {
    return {
      type: BigTwoComboType.SINGLE,
      cards: sorted,
      compareWeight: getBigTwoCardWeight(sorted[0]),
    };
  }

  // 2. Pair (2 Cards)
  if (len === 2) {
    if (sorted[0].value === sorted[1].value) {
      // Compare by the higher card in pair (which is the second card since it's sorted)
      return {
        type: BigTwoComboType.PAIR,
        cards: sorted,
        compareWeight: getBigTwoCardWeight(sorted[1]),
      };
    }
    return { type: BigTwoComboType.INVALID, cards: [], compareWeight: 0 };
  }

  // 3. Triple (3 Cards)
  if (len === 3) {
    if (sorted[0].value === sorted[1].value && sorted[1].value === sorted[2].value) {
      return {
        type: BigTwoComboType.TRIPLE,
        cards: sorted,
        compareWeight: getBigTwoCardWeight(sorted[2]),
      };
    }
    return { type: BigTwoComboType.INVALID, cards: [], compareWeight: 0 };
  }

  // 4. Five-Cards hands (5 Cards)
  if (len === 5) {
    const counts: { [key: number]: number } = {};
    for (const c of sorted) {
      counts[c.value] = (counts[c.value] || 0) + 1;
    }
    const countPairs = Object.entries(counts).sort((a, b) => b[1] - a[1]); // sort descending of count

    // Check Flush (同花)
    const allSameSuit = sorted.every(c => c.suit === sorted[0].suit);

    // Check Straight (順子)
    const cardValues = sorted.map(c => c.value);
    const isStraight = isConsecutiveStraight(cardValues);

    // Straight Flush (同花順)
    if (allSameSuit && isStraight) {
      // In straights, compare by the highest card weight
      // (Exception can be A-2-3-4-5 etc, let's just use the weight of the highest Big Two card in the sorted combo)
      return {
        type: BigTwoComboType.STRAIGHT_FLUSH,
        cards: sorted,
        compareWeight: getBigTwoCardWeight(sorted[4]),
      };
    }

    // Four of a Kind (鐵支/四條)
    if (countPairs[0][1] === 4) {
      const quadValue = Number(countPairs[0][0]);
      const quadRepresentCard = sorted.find(c => c.value === quadValue)!;
      return {
        type: BigTwoComboType.FOUR_OF_A_KIND,
        cards: sorted,
        compareWeight: getBigTwoCardNumberValue(quadRepresentCard) * 10, // Quad decide
      };
    }

    // Full House (葫蘆)
    if (countPairs[0][1] === 3 && countPairs[1]?.[1] === 2) {
      const tripleValue = Number(countPairs[0][0]);
      const tripleRepresentCard = sorted.find(c => c.value === tripleValue)!;
      return {
        type: BigTwoComboType.FULL_HOUSE,
        cards: sorted,
        compareWeight: getBigTwoCardNumberValue(tripleRepresentCard) * 10,
      };
    }

    // Flush (同花)
    if (allSameSuit) {
      // Compare based on suit weight, then the highest card number in flush
      const suitWeight = { S: 4, H: 3, D: 2, C: 1 }[sorted[0].suit] || 0;
      const topBigNum = getBigTwoCardNumberValue(sorted[4]);
      return {
        type: BigTwoComboType.FLUSH,
        cards: sorted,
        compareWeight: suitWeight * 100 + topBigNum,
      };
    }

    // Straight (順子)
    if (isStraight) {
      // Compare based on the highest card rank in the straight.
      // E.g., if there's a 2 (highest), we find it and use its weight.
      // Let's sort the cards to find which one is the actual "highest straight card"
      // In Taiwan rules, 2-3-4-5-6 is the highest straight because 2 is the highest card!
      // A-2-3-4-5 is the second highest because 2 is second highest or 14-15..
      // Standard comparison: just get the maximum big-two weight card in the set
      let maxCardWeight = 0;
      for (const c of sorted) {
        const w = getBigTwoCardWeight(c);
        if (w > maxCardWeight) maxCardWeight = w;
      }
      return {
        type: BigTwoComboType.STRAIGHT,
        cards: sorted,
        compareWeight: maxCardWeight,
      };
    }
  }

  return { type: BigTwoComboType.INVALID, cards: [], compareWeight: 0 };
}

export function evaluateBigTwoCombo(cards: Card[]): BigTwoCombo {
  const hasJokers = cards.some(c => c.isJoker);
  if (!hasJokers) {
    return evaluateBigTwoComboNatural(cards);
  }

  const jokers = cards.filter(c => c.isJoker);
  const nonJokers = cards.filter(c => !c.isJoker);

  if (cards.length === 1) {
    const sorted = sortBigTwoCards(cards);
    return {
      type: BigTwoComboType.SINGLE,
      cards: sorted,
      compareWeight: getBigTwoCardWeight(sorted[0]),
      hasJoker: true,
    };
  }

  const standardSuits: Suit[] = ['S', 'H', 'D', 'C'];
  const substitutionPool: Card[] = [];
  for (const suit of standardSuits) {
    for (let value = 1; value <= 13; value++) {
      substitutionPool.push({
        id: `wild-${suit}-${value}`,
        suit,
        value,
      });
    }
  }

  let bestCombo: BigTwoCombo = { type: BigTwoComboType.INVALID, cards: [], compareWeight: 0, hasJoker: true };

  const isBetterCombo = (cand: BigTwoCombo, best: BigTwoCombo): boolean => {
    if (cand.type === BigTwoComboType.INVALID) return false;
    if (best.type === BigTwoComboType.INVALID) return true;

    const strength = {
      [BigTwoComboType.SINGLE]: 1,
      [BigTwoComboType.PAIR]: 2,
      [BigTwoComboType.TRIPLE]: 3,
      [BigTwoComboType.STRAIGHT]: 4,
      [BigTwoComboType.FLUSH]: 5,
      [BigTwoComboType.FULL_HOUSE]: 6,
      [BigTwoComboType.FOUR_OF_A_KIND]: 7,
      [BigTwoComboType.STRAIGHT_FLUSH]: 8,
    };

    const candStr = strength[cand.type] || 0;
    const bestStr = strength[best.type] || 0;

    if (candStr > bestStr) return true;
    if (candStr < bestStr) return false;

    return cand.compareWeight > best.compareWeight;
  };

  if (jokers.length === 1) {
    for (const candCard of substitutionPool) {
      const testCards = [...nonJokers, { ...candCard, originalSuit: candCard.suit, originalValue: candCard.value, isPowerChanged: true }];
      const combo = evaluateBigTwoComboNatural(testCards);
      
      if (combo.type !== BigTwoComboType.INVALID) {
        const wildCombo: BigTwoCombo = {
          type: combo.type,
          cards: cards,
          compareWeight: combo.compareWeight,
          hasJoker: true
        };
        if (isBetterCombo(wildCombo, bestCombo)) {
          bestCombo = wildCombo;
        }
      }
    }
  } else if (jokers.length === 2) {
    for (let i = 0; i < substitutionPool.length; i += 2) {
      for (let j = 0; j < substitutionPool.length; j += 2) {
        const c1 = substitutionPool[i];
        const c2 = substitutionPool[j];
        if (c1.id === c2.id) continue;

        const testCards = [
          ...nonJokers,
          { ...c1, originalSuit: c1.suit, originalValue: c1.value, isPowerChanged: true },
          { ...c2, originalSuit: c2.suit, originalValue: c2.value, isPowerChanged: true }
        ];
        const combo = evaluateBigTwoComboNatural(testCards);
        if (combo.type !== BigTwoComboType.INVALID) {
          const wildCombo: BigTwoCombo = {
            type: combo.type,
            cards: cards,
            compareWeight: combo.compareWeight,
            hasJoker: true
          };
          if (isBetterCombo(wildCombo, bestCombo)) {
            bestCombo = wildCombo;
          }
        }
      }
    }
  }

  return bestCombo;
}

/**
 * Decides whether a new played hand successfully beats the previous played hand.
 * In Big Two, single beats single, pair beats pair, etc.
 * Five-cards hands can beat each other based on strength:
 * Straight (1) < Flush (2) < Full House (3) < Four of a Kind (4) < Straight Flush (5)
 */
export function canBeatBigTwo(played: Card[], previous: Card[] | undefined): boolean {
  if (!previous || previous.length === 0) {
    // If starting a new turn/round, any valid hand of length 1, 2, 3, or 5 is allowed
    const combo = evaluateBigTwoCombo(played);
    return combo.type !== BigTwoComboType.INVALID;
  }

  const pCombo = evaluateBigTwoCombo(previous);
  const nCombo = evaluateBigTwoCombo(played);

  if (pCombo.type === BigTwoComboType.INVALID || nCombo.type === BigTwoComboType.INVALID) {
    return false;
  }

  // Must play the same number of cards (except in five-cards hands)
  if (played.length !== previous.length) {
    return false;
  }

  // 1. Single / Pair / Triple: must match type exactly and have higher weight
  if (played.length < 5) {
    if (pCombo.type !== nCombo.type) return false;
    if (nCombo.compareWeight > pCombo.compareWeight) {
      return true;
    }
    if (nCombo.compareWeight === pCombo.compareWeight) {
      if (pCombo.hasJoker && !nCombo.hasJoker) {
        return true; // Natural beats wild
      }
    }
    return false;
  }

  // 2. Five-Cards hands
  const strength = {
    [BigTwoComboType.STRAIGHT]: 1,
    [BigTwoComboType.FLUSH]: 2,
    [BigTwoComboType.FULL_HOUSE]: 3,
    [BigTwoComboType.FOUR_OF_A_KIND]: 4,
    [BigTwoComboType.STRAIGHT_FLUSH]: 5,
  };

  const pStrength = strength[pCombo.type as keyof typeof strength] || 0;
  const nStrength = strength[nCombo.type as keyof typeof strength] || 0;

  if (nStrength > pStrength) {
    // High combo type beats lower combo type (e.g. Flush beats Straight)
    return true;
  } else if (nStrength === pStrength) {
    // Same combo type, compare weigths
    if (nCombo.compareWeight > pCombo.compareWeight) {
      return true;
    }
    if (nCombo.compareWeight === pCombo.compareWeight) {
      if (pCombo.hasJoker && !nCombo.hasJoker) {
        return true; // Natural beats wild
      }
    }
    return false;
  }

  return false;
}


// ==========================================
// Texas Hold'em (德州撲克) Rule Engine
// ==========================================

export enum TexasHandRank {
  HIGH_CARD = 1,
  ONE_PAIR = 2,
  TWO_PAIR = 3,
  THREE_OF_A_KIND = 4,
  STRAIGHT = 5,
  FLUSH = 6,
  FULL_HOUSE = 7,
  FOUR_OF_A_KIND = 8,
  STRAIGHT_FLUSH = 9,
}

export interface TexasEvaluation {
  rank: TexasHandRank;
  rankName: string;
  compareSequence: number[]; // Numbers used for tie-breaking
  hasJoker?: boolean;
}

/**
 * Converts card values to Texas values (Ace is high: 14, 2-13 stay same)
 */
export function getTexasCardNumeral(card: Card): number {
  return card.value === 1 ? 14 : card.value;
}

export function evaluateTexasHandNatural(cards: Card[]): TexasEvaluation {
  if (cards.length < 5) {
    return { rank: TexasHandRank.HIGH_CARD, rankName: '高牌', compareSequence: [] };
  }

  // Generate all combinations of 5 from N cards (N <= 7)
  const combos = getCombinations(cards, 5);
  let bestEval: TexasEvaluation = { rank: TexasHandRank.HIGH_CARD, rankName: '高牌', compareSequence: [0] };

  for (const combo of combos) {
    const currentEval = evaluateExactlyFiveTexasCards(combo);
    if (compareTexasEvaluations(currentEval, bestEval) > 0) {
      bestEval = currentEval;
    }
  }

  return bestEval;
}

/**
 * Finds the best 5-card hand rank out of up to 7 cards (2 pocket + 5 community)
 */
export function evaluateTexasHand(cards: Card[]): TexasEvaluation {
  const hasJokers = cards.some(c => c.isJoker);
  if (!hasJokers) {
    return evaluateTexasHandNatural(cards);
  }

  const jokers = cards.filter(c => c.isJoker);
  const nonJokers = cards.filter(c => !c.isJoker);

  const standardSuits: Suit[] = ['S', 'H', 'D', 'C'];
  const substitutionPool: Card[] = [];
  for (const suit of standardSuits) {
    for (let value = 1; value <= 13; value++) {
      substitutionPool.push({
        id: `wild-${suit}-${value}`,
        suit,
        value,
      });
    }
  }

  let bestEval: TexasEvaluation = { rank: TexasHandRank.HIGH_CARD, rankName: '高牌', compareSequence: [0], hasJoker: true };

  if (jokers.length === 1) {
    for (const cand of substitutionPool) {
      const testCards = [...nonJokers, { ...cand, originalSuit: cand.suit, originalValue: cand.value, isPowerChanged: true }];
      const currentEval = evaluateTexasHandNatural(testCards);
      const currentEvalWithJokerFlag = { ...currentEval, hasJoker: true };
      if (compareTexasEvaluations(currentEvalWithJokerFlag, bestEval) > 0) {
        bestEval = currentEvalWithJokerFlag;
      }
    }
  } else if (jokers.length === 2) {
    // 2 Jokers - optimize by sampling/step size to keep it extremely fast
    for (let i = 0; i < substitutionPool.length; i += 2) {
      for (let j = 0; j < substitutionPool.length; j += 2) {
        const c1 = substitutionPool[i];
        const c2 = substitutionPool[j];
        const testCards = [
          ...nonJokers,
          { ...c1, originalSuit: c1.suit, originalValue: c1.value, isPowerChanged: true },
          { ...c2, originalSuit: c2.suit, originalValue: c2.value, isPowerChanged: true }
        ];
        const currentEval = evaluateTexasHandNatural(testCards);
        const currentEvalWithJokerFlag = { ...currentEval, hasJoker: true };
        if (compareTexasEvaluations(currentEvalWithJokerFlag, bestEval) > 0) {
          bestEval = currentEvalWithJokerFlag;
        }
      }
    }
  }

  return bestEval;
}

/**
 * Helper to get all combinations of size k from list
 */
function getCombinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  function helper(start: number, path: T[]) {
    if (path.length === k) {
      result.push([...path]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      path.push(arr[i]);
      helper(i + 1, path);
      path.pop();
    }
  }
  helper(0, []);
  return result;
}

/**
 * Comparison for two Texas evaluations
 * Returns positive if a > b, negative if a < b, 0 if equal
 */
export function compareTexasEvaluations(a: TexasEvaluation, b: TexasEvaluation): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  for (let i = 0; i < Math.max(a.compareSequence.length, b.compareSequence.length); i++) {
    const valA = a.compareSequence[i] || 0;
    const valB = b.compareSequence[i] || 0;
    if (valA !== valB) {
      return valA - valB;
    }
  }
  // Tie-breaker: Natural beats Wild (hasJoker = true means wild)
  if (a.hasJoker && !b.hasJoker) return -1;
  if (!a.hasJoker && b.hasJoker) return 1;
  return 0;
}

/**
 * Evaluates EXACTLY 5 poker cards for Texas Hold'em
 */
function evaluateExactlyFiveTexasCards(cards: Card[]): TexasEvaluation {
  // Map card values: Ace -> 14
  const sorted = [...cards].sort((a, b) => getTexasCardNumeral(b) - getTexasCardNumeral(a));
  const numerals = sorted.map(c => getTexasCardNumeral(c));
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check straight
  // Standard straight check: consecutive values
  let isStraight = false;
  let straightHigh = 0;

  // Check normal consecutive
  if (
    numerals[0] - numerals[1] === 1 &&
    numerals[1] - numerals[2] === 1 &&
    numerals[2] - numerals[3] === 1 &&
    numerals[3] - numerals[4] === 1
  ) {
    isStraight = true;
    straightHigh = numerals[0];
  } else if (
    numerals[0] === 14 &&
    numerals[1] === 5 &&
    numerals[2] === 4 &&
    numerals[3] === 3 &&
    numerals[4] === 2
  ) {
    // Wheel Straight: A-2-3-4-5 (5 is highest card)
    isStraight = true;
    straightHigh = 5;
  }

  // Card frequencies
  const counts: { [key: number]: number } = {};
  for (const num of numerals) {
    counts[num] = (counts[num] || 0) + 1;
  }

  const entries = Object.entries(counts).map(([num, count]) => ({
    num: Number(num),
    count,
  }));

  // Sort: count descending, then num descending
  entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.num - a.num;
  });

  // 1. Straight Flush
  if (isStraight && isFlush) {
    return {
      rank: TexasHandRank.STRAIGHT_FLUSH,
      rankName: straightHigh === 14 ? '皇家同花順' : '同花順',
      compareSequence: [straightHigh],
    };
  }

  // 2. Four of a kind
  if (entries[0].count === 4) {
    return {
      rank: TexasHandRank.FOUR_OF_A_KIND,
      rankName: '四條(鐵支)',
      compareSequence: [entries[0].num, entries[1].num],
    };
  }

  // 3. Full house
  if (entries[0].count === 3 && entries[1]?.count === 2) {
    return {
      rank: TexasHandRank.FULL_HOUSE,
      rankName: '葫蘆',
      compareSequence: [entries[0].num, entries[1].num],
    };
  }

  // 4. Flush
  if (isFlush) {
    return {
      rank: TexasHandRank.FLUSH,
      rankName: '同花',
      compareSequence: numerals, // sorted descending
    };
  }

  // 5. Straight
  if (isStraight) {
    return {
      rank: TexasHandRank.STRAIGHT,
      rankName: '順子',
      compareSequence: [straightHigh],
    };
  }

  // 6. Three of a kind
  if (entries[0].count === 3) {
    return {
      rank: TexasHandRank.THREE_OF_A_KIND,
      rankName: '三條',
      compareSequence: [entries[0].num, entries[1].num, entries[2].num],
    };
  }

  // 7. Two Pair
  if (entries[0].count === 2 && entries[1]?.count === 2) {
    return {
      rank: TexasHandRank.TWO_PAIR,
      rankName: '雙對子(兩對)',
      compareSequence: [entries[0].num, entries[1].num, entries[2].num],
    };
  }

  // 8. One Pair
  if (entries[0].count === 2) {
    return {
      rank: TexasHandRank.ONE_PAIR,
      rankName: '對子(一對)',
      compareSequence: [
        entries[0].num,
        entries[1].num,
        entries[2].num,
        entries[3].num,
      ],
    };
  }

  // 9. High card
  return {
    rank: TexasHandRank.HIGH_CARD,
    rankName: '高牌(單張)',
    compareSequence: numerals,
  };
}

// ==========================================
// Show Hand (梭哈) Rule Engine
// ==========================================

export interface ShowHandEvaluation {
  rank: number; // 1: High Card, 2: One Pair, 3: Two Pair, 4: Three of a Kind, 5: Straight, 6: Flush, 7: Full House, 8: Four of a Kind, 9: Straight Flush
  rankName: string;
  compareSequence: number[];
  highestCardSuitWeight: number; // Suit weight of key card (S: 4, H: 3, D: 2, C: 1)
  hasJoker?: boolean;
}

export function getShowHandCardNumeral(card: Card): number {
  return card.value === 1 ? 14 : card.value; // Ace is 14
}

export function evaluateShowHandSubsetNatural(cards: Card[]): ShowHandEvaluation {
  if (cards.length === 0) {
    return { rank: 1, rankName: '高牌', compareSequence: [0], highestCardSuitWeight: 0 };
  }

  const sorted = [...cards].sort((a, b) => getShowHandCardNumeral(b) - getShowHandCardNumeral(a));
  const numerals = sorted.map(c => getShowHandCardNumeral(c));
  
  const suitValues = { S: 4, H: 3, D: 2, C: 1 };

  // Frequencies
  const counts: { [key: number]: Card[] } = {};
  for (const card of sorted) {
    const num = getShowHandCardNumeral(card);
    if (!counts[num]) counts[num] = [];
    counts[num].push(card);
  }

  const entries = Object.entries(counts).map(([numStr, list]) => ({
    num: Number(numStr),
    count: list.length,
    cards: list,
  }));

  // Sort by count descending, then num descending
  entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.num - a.num;
  });

  const len = cards.length;

  // 1. Five card specific checks
  if (len === 5) {
    const isFlush = sorted.every(c => c.suit === sorted[0].suit);
    
    // Check Straight
    let isStraight = false;
    let straightHigh = 0;
    if (
      numerals[0] - numerals[1] === 1 &&
      numerals[1] - numerals[2] === 1 &&
      numerals[2] - numerals[3] === 1 &&
      numerals[3] - numerals[4] === 1
    ) {
      isStraight = true;
      straightHigh = numerals[0];
    } else if (
      numerals[0] === 14 &&
      numerals[1] === 5 &&
      numerals[2] === 4 &&
      numerals[3] === 3 &&
      numerals[4] === 2
    ) {
      isStraight = true;
      straightHigh = 5;
    }

    if (isStraight && isFlush) {
      const repCard = sorted.find(c => getShowHandCardNumeral(c) === straightHigh) || sorted[0];
      return {
        rank: 9,
        rankName: straightHigh === 14 ? '皇家同花順' : '同花順',
        compareSequence: [straightHigh],
        highestCardSuitWeight: suitValues[repCard.suit] || 0,
      };
    }

    if (entries[0].count === 4) {
      const quadCards = entries[0].cards;
      const sortedQuad = [...quadCards].sort((a, b) => suitValues[b.suit] - suitValues[a.suit]);
      return {
        rank: 8,
        rankName: '鐵支(四條)',
        compareSequence: [entries[0].num, entries[1].num],
        highestCardSuitWeight: suitValues[sortedQuad[0].suit] || 0,
      };
    }

    if (entries[0].count === 3 && entries[1]?.count === 2) {
      const tripCards = entries[0].cards;
      const sortedTrip = [...tripCards].sort((a, b) => suitValues[b.suit] - suitValues[a.suit]);
      return {
        rank: 7,
        rankName: '葫蘆',
        compareSequence: [entries[0].num, entries[1].num],
        highestCardSuitWeight: suitValues[sortedTrip[0].suit] || 0,
      };
    }

    if (isFlush) {
      const highestCard = sorted[0];
      return {
        rank: 6,
        rankName: '同花',
        compareSequence: numerals,
        highestCardSuitWeight: suitValues[highestCard.suit] || 0,
      };
    }

    if (isStraight) {
      const repCard = sorted.find(c => getShowHandCardNumeral(c) === straightHigh) || sorted[0];
      return {
        rank: 5,
        rankName: '順子',
        compareSequence: [straightHigh],
        highestCardSuitWeight: suitValues[repCard.suit] || 0,
      };
    }
  }

  // 2. Default subset check for 1-4 cards (or 5 non-special cards)
  if (entries[0]?.count === 4) {
    const quadCards = entries[0].cards;
    const sortedQuad = [...quadCards].sort((a, b) => suitValues[b.suit] - suitValues[a.suit]);
    return {
      rank: 8,
      rankName: '鐵支(四條)',
      compareSequence: [entries[0].num, entries[1]?.num || 0],
      highestCardSuitWeight: suitValues[sortedQuad[0].suit] || 0,
    };
  }

  if (entries[0]?.count === 3) {
    const tripCards = entries[0].cards;
    const sortedTrip = [...tripCards].sort((a, b) => suitValues[b.suit] - suitValues[a.suit]);
    const kickers = entries.slice(1).map(e => e.num);
    return {
      rank: 4,
      rankName: '三條',
      compareSequence: [entries[0].num, ...kickers],
      highestCardSuitWeight: suitValues[sortedTrip[0].suit] || 0,
    };
  }

  if (entries[0]?.count === 2 && entries[1]?.count === 2) {
    const pair1Cards = entries[0].cards;
    const sortedPair1 = [...pair1Cards].sort((a, b) => suitValues[b.suit] - suitValues[a.suit]);
    const kicker = entries[2]?.num || 0;
    return {
      rank: 3,
      rankName: '兩對',
      compareSequence: [entries[0].num, entries[1].num, kicker],
      highestCardSuitWeight: suitValues[sortedPair1[0].suit] || 0,
    };
  }

  if (entries[0]?.count === 2) {
    const pairCards = entries[0].cards;
    const sortedPair = [...pairCards].sort((a, b) => suitValues[b.suit] - suitValues[a.suit]);
    const kickers = entries.slice(1).map(e => e.num);
    return {
      rank: 2,
      rankName: '對子(一對)',
      compareSequence: [entries[0].num, ...kickers],
      highestCardSuitWeight: suitValues[sortedPair[0].suit] || 0,
    };
  }

  const highestCard = sorted[0];
  return {
    rank: 1,
    rankName: '高牌(單張)',
    compareSequence: numerals,
    highestCardSuitWeight: highestCard ? suitValues[highestCard.suit] || 0 : 0,
  };
}

export function evaluateShowHandSubset(cards: Card[]): ShowHandEvaluation {
  const hasJokers = cards.some(c => c.isJoker);
  if (!hasJokers) {
    return evaluateShowHandSubsetNatural(cards);
  }

  const jokers = cards.filter(c => c.isJoker);
  const nonJokers = cards.filter(c => !c.isJoker);

  const standardSuits: Suit[] = ['S', 'H', 'D', 'C'];
  const substitutionPool: Card[] = [];
  for (const suit of standardSuits) {
    for (let value = 1; value <= 13; value++) {
      substitutionPool.push({
        id: `wild-${suit}-${value}`,
        suit,
        value,
      });
    }
  }

  let bestEval: ShowHandEvaluation = { rank: 1, rankName: '高牌', compareSequence: [0], highestCardSuitWeight: 0, hasJoker: true };

  if (jokers.length === 1) {
    for (const cand of substitutionPool) {
      const testCards = [...nonJokers, { ...cand, originalSuit: cand.suit, originalValue: cand.value, isPowerChanged: true }];
      const currentEval = evaluateShowHandSubsetNatural(testCards);
      const currentEvalWithJokerFlag = { ...currentEval, hasJoker: true };
      if (compareShowHandEvaluations(currentEvalWithJokerFlag, bestEval) > 0) {
        bestEval = currentEvalWithJokerFlag;
      }
    }
  } else if (jokers.length === 2) {
    for (let i = 0; i < substitutionPool.length; i += 2) {
      for (let j = 0; j < substitutionPool.length; j += 2) {
        const c1 = substitutionPool[i];
        const c2 = substitutionPool[j];
        if (c1.id === c2.id) continue;

        const testCards = [
          ...nonJokers,
          { ...c1, originalSuit: c1.suit, originalValue: c1.value, isPowerChanged: true },
          { ...c2, originalSuit: c2.suit, originalValue: c2.value, isPowerChanged: true }
        ];
        const currentEval = evaluateShowHandSubsetNatural(testCards);
        const currentEvalWithJokerFlag = { ...currentEval, hasJoker: true };
        if (compareShowHandEvaluations(currentEvalWithJokerFlag, bestEval) > 0) {
          bestEval = currentEvalWithJokerFlag;
        }
      }
    }
  }

  return bestEval;
}

export function compareShowHandEvaluations(a: ShowHandEvaluation, b: ShowHandEvaluation): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  for (let i = 0; i < Math.max(a.compareSequence.length, b.compareSequence.length); i++) {
    const valA = a.compareSequence[i] || 0;
    const valB = b.compareSequence[i] || 0;
    if (valA !== valB) {
      return valA - valB;
    }
  }
  // Tie-breaker: Natural beats Wild (hasJoker = true means wild)
  if (a.hasJoker && !b.hasJoker) return -1;
  if (!a.hasJoker && b.hasJoker) return 1;

  return a.highestCardSuitWeight - b.highestCardSuitWeight;
}

export function sortCardsCustom(cards: Card[], method: 'small_to_large' | 'straight_priority' | 'flush_priority'): Card[] {
  if (cards.length < 5) {
    // If fewer than 5 cards, flush/straight priority are identical to small to large
    return sortBigTwoCards(cards);
  }

  const sortedBase = sortBigTwoCards(cards);

  if (method === 'small_to_large') {
    return sortedBase;
  }

  const allFiveCardCombos = (arr: Card[]): Card[][] => {
    const result: Card[][] = [];
    function helper(start: number, path: Card[]) {
      if (path.length === 5) {
        result.push([...path]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        path.push(arr[i]);
        helper(i + 1, path);
        path.pop();
      }
    }
    helper(0, []);
    return result;
  };

  const combos = allFiveCardCombos(sortedBase);

  if (method === 'straight_priority') {
    // Find combos that are STRAIGHT or STRAIGHT_FLUSH
    const straightCombos = combos.filter(combo => {
      const evaled = evaluateBigTwoCombo(combo);
      return evaled.type === BigTwoComboType.STRAIGHT || evaled.type === BigTwoComboType.STRAIGHT_FLUSH;
    });

    if (straightCombos.length > 0) {
      // Sort straights by compareWeight descending to pick the strongest straight
      straightCombos.sort((a, b) => {
        return evaluateBigTwoCombo(b).compareWeight - evaluateBigTwoCombo(a).compareWeight;
      });

      const bestStraight = straightCombos[0];
      const bestStraightIds = new Set(bestStraight.map(c => c.id));
      const remainingCards = sortedBase.filter(c => !bestStraightIds.has(c.id));

      return [...bestStraight, ...remainingCards];
    }
  }

  if (method === 'flush_priority') {
    // Find combos that are FLUSH or STRAIGHT_FLUSH
    const flushCombos = combos.filter(combo => {
      const evaled = evaluateBigTwoCombo(combo);
      return evaled.type === BigTwoComboType.FLUSH || evaled.type === BigTwoComboType.STRAIGHT_FLUSH;
    });

    if (flushCombos.length > 0) {
      // Sort flushes by compareWeight descending
      flushCombos.sort((a, b) => {
        return evaluateBigTwoCombo(b).compareWeight - evaluateBigTwoCombo(a).compareWeight;
      });

      const bestFlush = flushCombos[0];
      const bestFlushIds = new Set(bestFlush.map(c => c.id));
      const remainingCards = sortedBase.filter(c => !bestFlushIds.has(c.id));

      return [...bestFlush, ...remainingCards];
    }
  }

  // Fallback
  return sortedBase;
}
