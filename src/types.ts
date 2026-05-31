/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Suit = 'S' | 'H' | 'D' | 'C'; // S: Spades ♠, H: Hearts ♥, D: Diamonds ♦, C: Clubs ♣

export interface Card {
  id: string; // unique card id, e.g., "S-A", "D-3" or "power-1"
  suit: Suit;
  value: number; // 1 to 13
  originalSuit?: Suit; // For Saint of Gamblers card-changing (變牌)
  originalValue?: number;
  isPowerChanged?: boolean; // True if manipulated with superpowers!
  isJoker?: 'small' | 'big'; // Added for Joker support
}

export enum GameType {
  BIG_TWO = 'BIG_TWO',          // 大老二
  TEXAS_HOLDEM = 'TEXAS_HOLDEM', // 德州撲克
  SHOW_HAND = 'SHOW_HAND'        // 梭哈 (港式五張)
}

export enum SuperPower {
  RUB_CARD = 'RUB_CARD',        // 搓牌/變牌: Change cards to any card
  PEEK_HAND = 'PEEK_HAND',      // 透視眼: See other players' cards
  ILLUSION = 'ILLUSION',        // 幻境催眠: Force an opponent to skip their next action, or randomized chaos
  YEE_MUNG_BOOST = 'YEE_MUNG',  // 綺夢加持: Double or restore MP (Mental Power)
}

export interface Player {
  id: string;
  name: string;
  avatar: string; // 'star' | 'tat' | 'yee_mung' | 'tai_kwan' | 'dagger' | 'devil_chan' | 'player'
  chips: number;  // Chips/Money
  mp: number;     // Mental Power (特異功能能量, 0-100)
  cards: Card[];  // Player's hand
  isReady: boolean;
  isBot: boolean;
  isHost: boolean;
  
  // Texas Hold'em specifics
  currentBet?: number;
  hasFolded?: boolean;
  isAllIn?: boolean;
  
  // Presence and visual effects
  lastAction?: string;
  isRubbing?: boolean; // currently performing the card-rubbing superpower
  hasPeekedBy?: string[]; // list of players who peeked this hand
  actionTimer?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatar: string;
  message: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface GameState {
  roomId: string;
  roomName: string;
  gameType: GameType;
  isPowerMode: boolean; // 賭聖特異功能模式 (Enabled/Disabled)
  status: 'LOBBY' | 'PLAYING' | 'SHOWDOWN' | 'GAME_OVER';
  players: Player[];
  activePlayerIndex: number;
  deck: Card[];
  chatHistory: ChatMessage[];
  creatorId: string;
  turnTimeLimit?: number; // 思考時間限制（秒）
  turnEndsAt?: number;     // 當前玩家回合截止時間戳 (Date.now() + seconds * 1000)
  useJokers?: boolean;     // 是否加入大小鬼 (Jokers)

  // Big Two specific state
  lastPlayCards?: Card[];       // The last laid combo of cards
  lastPlayUserId?: string;      // The user ID who laid the current hand
  currentRoundPassCount: number; // Consecutive passes
  startingDiamond3PlayerId?: string; // Player who starts the first hand of Big Two

  // Texas Hold'em specific state
  communityCards: Card[];       // Up to 5 community cards
  currentStep: number;          // 0: Pre-flop, 1: Flop, 2: Turn, 3: River, 4: Showdown
  pot: number;                  // Chips in pot
  currentHighBet: number;       // High bet requirements to stay in hand
  dealerIndex: number;          // Position of the Button
  smallBlind: number;           // Small Blind amount (e.g. 100)
  bigBlind: number;             // Big Blind amount (e.g. 200)
  winnerIds: string[];          // Hand winner(s)
  winningHandDesc?: string;     // E.g. "Full House (葫蘆)"
}

export const CHARACTER_DATA = {
  player: { name: '你 (玩家)', avatar: 'player', title: '特異功能新手', desc: '新入行賭壇，實力未知，擁有均衡的超能力天賦！', baseMp: 100 },
  star: { name: '賭聖 (阿星)', avatar: 'star', title: '特異功能宗師', desc: '最強變牌大師！搓牌消耗的精神力(MP)減半，最容易搓出好牌。', baseMp: 120 },
  tat: { name: '三叔 (達叔)', avatar: 'tat', title: '軟飯王/先天性失控', desc: '雖然不能自己用超能力，但被喊「星哥」時會狂暴，能將隨機一名玩家打入幻境！', baseMp: 80 },
  yee_mung: { name: '綺夢', avatar: 'yee_mung', title: '幸運女神', desc: '親密打氣！每回合開始時恢復額外20點精神力(MP)。', baseMp: 100 },
  tai_kwan: { name: '大軍 (獨眼龍)', avatar: 'tai_kwan', title: '一對一透視高手', desc: '透視眼只需消耗極少MP，並有機率發功遮蔽其他人的超能力。', baseMp: 110 },
  dagger: { name: '賭俠 (阿刀)', avatar: 'dagger', title: '至尊飛牌客', desc: '即使不搓牌，高難度的德州撲克聽牌機率也會大幅上升！而且賭技超一流！', baseMp: 90 },
  devil_chan: { name: '賭魔 (陳金城)', avatar: 'devil_chan', title: '老謀深算', desc: '「我們已經到了公海了！」能夠使出假牌心理干擾，讓對手的超能力高機率失敗。', baseMp: 70 },
};

export type CharacterKey = keyof typeof CHARACTER_DATA;
