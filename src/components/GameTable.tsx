/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  GameState, 
  Player, 
  Card, 
  GameType, 
  SuperPower, 
  CHARACTER_DATA 
} from '../types';
import PokerCard from './PokerCard';
import RubModal from './RubModal';
import RoomQRCode from './RoomQRCode';
import { 
  Crown, 
  MessageSquare, 
  LogOut, 
  Eye, 
  Flame, 
  Sparkles, 
  Coins, 
  Send, 
  RefreshCw, 
  UserPlus, 
  Zap, 
  Smile, 
  ShieldAlert 
} from 'lucide-react';
import { getBigTwoCardWeight, sortCardsCustom } from '../utils/pokerLogic';

interface GameTableProps {
  state: GameState;
  clientId: string;
  onSendMessage: (msg: string) => void;
  onAction: (type: string, payload: any) => void;
  onLeaveRoom: () => void;
  peekedCards: { [playerId: string]: Card[] };
}

export default function GameTable({
  state,
  clientId,
  onSendMessage,
  onAction,
  onLeaveRoom,
  peekedCards,
}: GameTableProps) {
  const me = state.players.find(p => p.id === clientId);
  const isMyTurn = state.status === 'PLAYING' && state.activePlayerIndex !== -1 && state.players[state.activePlayerIndex]?.id === clientId;

  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [sortMethod, setSortMethod] = useState<'small_to_large' | 'straight_priority' | 'flush_priority'>('small_to_large');
  const [isSortLocked, setIsSortLocked] = useState<boolean>(true);

  // Memoized auto-sorted cards
  const mySortedCards = React.useMemo(() => {
    if (!me || !me.cards) return [];
    if (!isSortLocked) {
      return me.cards;
    }
    return sortCardsCustom(me.cards, sortMethod);
  }, [me?.cards, sortMethod, isSortLocked]);
  const [chatBoxInput, setChatBoxInput] = useState('');
  const [rubModalCard, setRubModalCard] = useState<Card | null>(null);
  const [targetPeekPlayerId, setTargetPeekPlayerId] = useState<string | null>(null);
  const [targetIllusionPlayerId, setTargetIllusionPlayerId] = useState<string | null>(null);
  const [botShouting, setBotShouting] = useState<{ id: string; text: string } | null>(null);
  const [isBotShoutActive, setIsBotShoutActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Turn time countdown effect
  useEffect(() => {
    if (!state.turnEndsAt || !state.turnTimeLimit || state.status !== 'PLAYING') {
      setSecondsLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = state.turnEndsAt! - now;
      const left = Math.max(0, Math.ceil(diff / 1000));
      setSecondsLeft(left);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);

    return () => clearInterval(interval);
  }, [state.turnEndsAt, state.turnTimeLimit, state.activePlayerIndex, state.status]);

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatHistory]);

  // Handle player shouting effect
  useEffect(() => {
    // If the latest chat message is a bot shouting, render a popup bubble
    if (state.chatHistory.length > 0) {
      const lastMsg = state.chatHistory[state.chatHistory.length - 1];
      if (!lastMsg.isSystem && lastMsg.senderId !== clientId) {
        setBotShouting({ id: lastMsg.senderId, text: lastMsg.message });
        setIsBotShoutActive(true);
        const t = setTimeout(() => {
          setIsBotShoutActive(false);
        }, 4000);
        return () => clearTimeout(t);
      }
    }
  }, [state.chatHistory, clientId]);

  // Cycle through custom sorting methods
  const handleCycleSort = () => {
    if (!me) return;
    setSortMethod(prev => {
      if (prev === 'small_to_large') return 'straight_priority';
      if (prev === 'straight_priority') return 'flush_priority';
      return 'small_to_large';
    });
  };

  const handleCardClick = (cardId: string) => {
    if (state.status !== 'PLAYING') return;
    
    setSelectedCards(prev => {
      const copy = new Set(prev);
      if (copy.has(cardId)) {
        copy.delete(cardId);
      } else {
        copy.add(cardId);
      }
      return copy;
    });
  };

  // Big Two actions
  const handlePlayCards = () => {
    if (!me) return;
    const cardsToPlay = mySortedCards.filter(c => selectedCards.has(c.id));
    if (cardsToPlay.length === 0) return;
    
    onAction('PLAY_BIG_TWO_CARDS', { cardsToPlay });
    setSelectedCards(new Set());
  };

  const handlePass = () => {
    onAction('PASS_BIG_TWO_TURN', {});
    setSelectedCards(new Set());
  };

  // Texas Hold'em actions
  const handleTexasAction = (actionType: 'CHECK' | 'CALL' | 'RAISE' | 'FOLD', customAmount?: number) => {
    if (!me) return;
    const callValue = state.currentHighBet - (me.currentBet || 0);
    let betAmount = 0;
    
    if (actionType === 'CALL') {
      betAmount = callValue;
    } else if (actionType === 'RAISE') {
      betAmount = customAmount || callValue + 200; // Raise by $200 by default
    }

    onAction('TEXAS_BET_ACTION', {
      amount: betAmount,
      actionType,
    });
  };

  // Show Hand actions
  const handleShowHandAction = (actionType: 'CHECK' | 'CALL' | 'RAISE' | 'FOLD', customAmount?: number) => {
    if (!me) return;
    const callValue = state.currentHighBet - (me.currentBet || 0);
    let betAmount = 0;
    
    if (actionType === 'CALL') {
      betAmount = callValue;
    } else if (actionType === 'RAISE') {
      betAmount = customAmount || Math.max(100, callValue + 200); // Standard show hand raise
    }

    onAction('SHOW_HAND_BET_ACTION', {
      amount: betAmount,
      actionType,
    });
  };

  // Send Chat Message
  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatBoxInput.trim()) return;
    onSendMessage(chatBoxInput);
    setChatBoxInput('');
  };

  const handleShoutQuote = (quote: string) => {
    onSendMessage(quote);
  };

  // Superpower Triggering
  const triggerRubPower = () => {
    if (selectedCards.size !== 1) {
      alert('請先在你的手牌中【選擇剛好一張卡牌】以進行搓變！');
      return;
    }
    const cardId = Array.from(selectedCards)[0];
    const cardToRub = me?.cards.find(c => c.id === cardId);
    if (cardToRub) {
      setRubModalCard(cardToRub);
    }
  };

  const executePowerRub = (suit: string, value: number) => {
    if (!rubModalCard || !me) return;
    onAction('TRIGGER_SUPER_POWER', {
      powerType: SuperPower.RUB_CARD,
      args: { cardId: rubModalCard.id, suit, value },
    });
    setSelectedCards(new Set());
    setRubModalCard(null);
  };

  const triggerPeekPower = () => {
    if (targetPeekPlayerId) {
      onAction('TRIGGER_SUPER_POWER', {
        powerType: SuperPower.PEEK_HAND,
        args: { targetPlayerId: targetPeekPlayerId },
      });
      setTargetPeekPlayerId(null);
    }
  };

  const triggerIllusionPower = () => {
    if (targetIllusionPlayerId) {
      onAction('TRIGGER_SUPER_POWER', {
        powerType: SuperPower.ILLUSION,
        args: { targetPlayerId: targetIllusionPlayerId },
      });
      setTargetIllusionPlayerId(null);
    }
  };

  const triggerYeeMungBoost = () => {
    onAction('TRIGGER_SUPER_POWER', {
      powerType: SuperPower.YEE_MUNG_BOOST,
      args: {},
    });
  };

  const handleAddBot = (avatarKey: string) => {
    onAction('ADD_BOT_OPPONENT', { avatarKey });
  };

  // Arrange slots clockwise so details represent visual cards around table
  // Settle seat arrangement logic
  const arrangeSeats = (): Player[] => {
    const list = [...state.players];
    const myIdx = list.findIndex(p => p.id === clientId);
    if (myIdx === -1) return list;

    // Rotate so Client is always index 0 (rendered bottom)
    const beforeMe = list.slice(0, myIdx);
    const fromMe = list.slice(myIdx);
    return [...fromMe, ...beforeMe];
  };

  const rotatedPlayers = arrangeSeats();

  // Coordinates based styling for seats dynamically
  const getSeatPositionClass = (index: number, total: number) => {
    // index is rotated index: 0 is Me, 1 is Left/Next, etc.
    if (total === 4) {
      const posMapBigTwo = [
        'bottom-4 left-1/2 -translate-x-1/2',          // Seat 0 (Me)
        'left-4 top-1/2 -translate-y-1/2 md:left-12',  // Seat 1 (Left)
        'top-4 left-1/2 -translate-x-1/2 md:top-8',    // Seat 2 (Top)
        'right-4 top-1/2 -translate-y-1/2 md:right-12' // Seat 3 (Right)
      ];
      return posMapBigTwo[index] || '';
    } else {
      // 2..6 players for Texas Hold'em
      const posMapTexas = [
        'bottom-4 left-1/2 -translate-x-1/2',                           // Seat 0 (Me)
        'left-4 bottom-28 md:left-12 -translate-y-1/2',                 // Seat 1 (Bottom Left)
        'left-4 top-24 md:left-12 -translate-y-1/2',                    // Seat 2 (Top Left)
        'top-4 left-1/2 -translate-x-1/2 md:top-8',                     // Seat 3 (Top Center)
        'right-4 top-24 md:right-12 -translate-y-1/2',                  // Seat 4 (Top Right)
        'right-4 bottom-28 md:right-12 -translate-y-1/2'                // Seat 5 (Bottom Right)
      ];
      return posMapTexas[index] || '';
    }
  };

  // Profile cards for movie-characters representation
  const getAvatarPreset = (avatar: string) => {
    switch (avatar) {
      case 'star':
        return { label: '阿星', color: 'from-amber-400 to-yellow-600 border-yellow-300 ring-yellow-400/50', movie: '賭聖' };
      case 'tat':
        return { label: '三叔', color: 'from-emerald-600 to-teal-800 border-teal-500 ring-teal-400/50', movie: '星哥附身' };
      case 'yee_mung':
        return { label: '綺夢', color: 'from-pink-500 to-rose-600 border-pink-400 ring-pink-400/50', movie: '夢中情人' };
      case 'tai_kwan':
        return { label: '大軍', color: 'from-red-600 to-stone-800 border-red-500 ring-red-400/50', movie: '特異功能對手' };
      case 'dagger':
        return { label: '刀仔', color: 'from-sky-500 to-blue-700 border-sky-400 ring-sky-400/50', movie: '賭俠' };
      case 'devil_chan':
        return { label: '陳金城', color: 'from-indigo-900 to-zinc-900 border-indigo-700 ring-indigo-500/50', movie: '公海賭魔' };
      default:
        return { label: '玩家', color: 'from-zinc-700 to-zinc-800 border-zinc-600 ring-zinc-500/50', movie: '賭壇新秀' };
    }
  };

  // Quick Movie Trashing Presets
  const quoteShouts = [
    '「太保，拿熱咖啡來！我要發功搓牌！」',
    '「我們現在在公海上，跟我鬥？」',
    '「星哥！星哥！受我一拜！」',
    '「大軍，你的發電量多少啊？」',
    '「只要有綺夢，奇蹟一定會發生！」',
  ];

  return (
    <div id="game-table" className="h-screen w-screen flex flex-col bg-transparent text-slate-100 overflow-hidden font-sans select-none relative z-10">
      
      {/* Top Banner Control Panel (Frosted Glass) */}
      <div className="bg-white/5 backdrop-blur-md p-3 px-4 border-b border-white/10 flex justify-between items-center z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-amber-500 to-orange-600 text-slate-950 p-1.5 rounded-lg shadow-md shadow-orange-900/10">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-sm tracking-wide flex items-center gap-2 text-slate-100">
              中華賭聖大賽：<span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent font-extrabold">{state.roomName}</span>
              {state.isPowerMode && (
                <span className="bg-purple-600/30 border border-purple-500/55 text-purple-300 text-[10px] leading-none px-2.5 py-1 rounded-full font-serif uppercase tracking-widest animate-pulse">
                  🔮 特異功能開啟
                </span>
              )}
            </h2>
            <p className="text-[10px] text-slate-400">
              遊戲模式：{' '}{state.gameType === GameType.BIG_TWO ? '大老二 (四大天王版)' : '德州撲克 (公海對賭版)'} | 
              房號：{' '}{state.roomId.split('-')[1] || state.roomId}
            </p>
          </div>
        </div>

        {/* Action controllers */}
        <div className="flex items-center gap-2">
          {state.status === 'LOBBY' && me?.isHost && (
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-xs text-slate-400">新增 AI角色:</span>
              <button onClick={() => handleAddBot('star')} className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-[11px] text-slate-950 font-bold rounded transition cursor-pointer">
                阿星
              </button>
              <button onClick={() => handleAddBot('tat')} className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-[11px] font-bold rounded transition cursor-pointer">
                三叔
              </button>
              <button onClick={() => handleAddBot('tai_kwan')} className="px-2 py-1 bg-red-650 hover:bg-red-550 text-[11px] font-bold rounded transition cursor-pointer">
                大軍
              </button>
              <button onClick={() => handleAddBot('yee_mung')} className="px-2 py-1 bg-pink-650 hover:bg-pink-550 text-[11px] font-bold rounded transition cursor-pointer">
                綺夢
              </button>
            </div>
          )}
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-955/40 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-900/30 rounded-lg text-xs font-semibold cursor-pointer transition shadow"
          >
            <LogOut className="w-4 h-4" />
            離開
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Felt Casino Table Canvas Area (LEFT/CENTER) with custom glass-themed dark gradient */}
        <div id="felt-canvas" className="flex-1 bg-gradient-to-b from-indigo-950/10 via-[#020617]/35 to-purple-950/10 p-4 flex flex-col justify-center items-center relative overflow-hidden">
          
          {/* Authentic Oval Casino Felt Mat outline as deep emerald frosted glass mat */}
          <div className="w-11/12 max-w-5xl h-3/5 rounded-[120px] bg-gradient-to-b from-emerald-950/50 via-emerald-900/45 to-[#064e3b]/45 border-[12px] border-amber-500/10 backdrop-blur-md shadow-2xl flex flex-col justify-center items-center p-8 relative ring-8 ring-amber-500/5">
            
            {/* Soft gold engraving label */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 opacity-20 select-none text-center pointer-events-none">
              <h1 className="font-serif font-black text-3xl tracking-[12px] text-yellow-300">
                中華賭聖大賽
              </h1>
              <p className="text-[10px] font-mono mt-1 text-yellow-350">
                INTERNATIONAL WATERS CASINO FELT
              </p>
            </div>

            {/* Center Area components depending on active game */}
            <div id="table-center" className="text-center z-10 flex flex-col items-center justify-center space-y-4">
              
              {/* If game is in lobby state */}
              {state.status === 'LOBBY' && (
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="space-y-4 text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl max-w-sm shadow-xl">
                    <h3 className="font-serif font-bold text-lg text-yellow-400 tracking-wider">
                      🎲 準備開賽 🎲
                    </h3>
                    <div className="text-sm space-y-1.5 text-slate-300">
                      <p>房間人數：{state.players.length} / {state.gameType === GameType.BIG_TWO ? '4' : '6'} 人</p>
                      <p className="text-xs text-slate-400">大老二需要 4 人。不足人數開賽時會自動補齊 AI 電影對手！</p>
                    </div>
                    
                    <div className="flex gap-2.5 justify-center py-2">
                      {me && !me.isHost && (
                        <button
                          onClick={() => onAction('TOGGLE_READY', { roomId: state.roomId, clientId })}
                          className={`px-6 py-2 rounded-xl font-bold transition shadow-lg cursor-pointer ${
                            me.isReady 
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                              : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10'
                          }`}
                        >
                          {me.isReady ? '已準備！' : '點擊準備'}
                        </button>
                      )}
                      
                      {me?.isHost && (
                        <button
                          onClick={() => onAction('START_GAME', { roomId: state.roomId })}
                          className="px-8 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black tracking-widest text-sm rounded-xl cursor-pointer shadow-lg animate-pulse"
                        >
                          開始對決
                        </button>
                      )}
                    </div>
                  </div>

                  {/* QR Code for sharing */}
                  <RoomQRCode roomId={state.roomId} playersCount={state.players.length} />
                </div>
              )}

              {/* BIG TWO: Active Labeled combination */}
              {state.status === 'PLAYING' && state.gameType === GameType.BIG_TWO && (
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-[10px] text-yellow-400 font-serif bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                    {state.lastPlayCards ? `上家出牌者：${state.players.find(p=>p.id === state.lastPlayUserId)?.name || '未知的賭客'}` : '🔥 新的一輪！首家可任意出牌 🔥'}
                  </span>
                  
                  {/* Laid cards preview */}
                  {state.lastPlayCards && state.lastPlayCards.length > 0 ? (
                    <div className="flex justify-center gap-1.5 p-3 rounded-xl bg-black/30 border border-white/15 backdrop-blur-sm shadow-md">
                      {state.lastPlayCards.map((card, idx) => (
                        <PokerCard key={card.id || idx} card={card} size="sm" />
                      ))}
                    </div>
                  ) : (
                    <div className="w-24 h-16 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-[10px] text-slate-400 font-mono">
                      等待出牌
                    </div>
                  )}

                  {state.currentRoundPassCount > 0 && (
                    <p className="text-xs text-rose-300 font-mono">
                      連續 PASS 人數：{state.currentRoundPassCount} / 3
                    </p>
                  )}
                </div>
              )}

              {/* SHOW_HAND or TEXAS_HOLDEM: Community Cards + Pot */}
              {state.status === 'PLAYING' && (state.gameType === GameType.TEXAS_HOLDEM || state.gameType === GameType.SHOW_HAND) && (
                <div className="flex flex-col items-center space-y-4">
                  {/* Pot Info */}
                  <div className="bg-black/40 backdrop-blur-sm p-3 py-2 rounded-2xl border border-white/10 flex items-center gap-2 shadow-inner">
                    <Coins className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="text-[9px] text-slate-400 leading-none">🎰 當前籌碼池 POT</p>
                      <h3 className="font-mono text-xl font-extrabold text-yellow-400 leading-none">${state.pot}</h3>
                    </div>
                  </div>

                  {/* 5 Community cards (Texas only) */}
                  {state.gameType === GameType.TEXAS_HOLDEM && (
                    <div className="flex gap-2">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const commCard = state.communityCards[i];
                        if (commCard) {
                          return <PokerCard key={commCard.id} card={commCard} size="sm" />;
                        } else {
                          return (
                            <div
                              key={i}
                              className="w-12 h-18 rounded-md border border-dashed border-white/10 flex items-center justify-center text-[10px] text-slate-500 bg-black/35 backdrop-blur-sm"
                            >
                              ?
                            </div>
                          );
                        }
                      })}
                    </div>
                  )}

                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                    {state.gameType === GameType.SHOW_HAND ? (
                      state.currentStep === 0 ? '💻 第二張牌 (起手明牌)' : state.currentStep === 1 ? '📢 第三張明牌' : state.currentStep === 2 ? '⚡ 第四張明牌' : '🔥 第五張明牌 (最後決戰)'
                    ) : (
                      state.currentStep === 0 ? '💻 翻牌前 Pre-Flop' : state.currentStep === 1 ? '📢 翻牌圈 Flop' : state.currentStep === 2 ? '⚡ 轉牌圈 Turn' : '🔥 河牌圈 River'
                    )}
                  </span>
                </div>
              )}

              {/* Showdown popup screen */}
              {state.status === 'GAME_OVER' && (
                <div className="bg-black/60 p-5 px-6 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl max-w-md text-center space-y-3 shrink-0">
                  <h3 className="font-serif font-black text-xl text-yellow-400 tracking-widest">
                    🏁 對局結算 🏁
                  </h3>
                  
                  {(state.gameType === GameType.TEXAS_HOLDEM || state.gameType === GameType.SHOW_HAND) && state.winningHandDesc && (
                    <p className="text-xs bg-purple-600/20 p-1.5 rounded text-purple-300 font-bold border border-purple-500/30">
                      獲勝牌型：【 {state.winningHandDesc} 】
                    </p>
                  )}

                  <div className="text-xs space-y-1.5 text-left border-y border-white/5 py-3 scrollbar-none max-h-32 overflow-y-auto">
                    {/* Settle result logs */}
                    {state.players.map(p => {
                      const isWinner = state.winnerIds.includes(p.id);
                      return (
                        <div key={p.id} className="flex justify-between items-center gap-4">
                          <span className={`font-medium ${isWinner ? 'text-yellow-400' : 'text-slate-400'}`}>
                            {isWinner ? '👑' : ''} {p.name}
                          </span>
                          <span className={`${isWinner ? 'text-yellow-400 font-extrabold' : 'text-slate-500'}`}>
                            籌碼: {p.chips}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {me?.isHost && (
                    <button
                      onClick={() => onAction('START_GAME', { roomId: state.roomId })}
                      className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black tracking-widest text-xs rounded-xl cursor-pointer transition shadow"
                    >
                      開始下一局
                    </button>
                  )}
                </div>
              )}

            </div>

            {/* SEATS - Arranged and styled around casino mat */}
            {rotatedPlayers.map((player, index) => {
              const seatClass = getSeatPositionClass(index, state.players.length);
              const isTurn = state.status === 'PLAYING' && state.activePlayerIndex !== -1 && state.players[state.activePlayerIndex]?.id === player.id;
              const preset = getAvatarPreset(player.avatar);
              const isMe = player.id === clientId;
              
              // Peeking status cards
              const hasPeeked = peekedCards[player.id];

              return (
                <div
                  key={player.id}
                  id={`seat-${player.id}`}
                  className={`absolute z-20 ${seatClass} scale-90 md:scale-95`}
                >
                  {/* Bot shouting bubble overlay */}
                  {isBotShoutActive && botShouting?.id === player.id && (
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-zinc-900 border border-yellow-300 font-serif font-black px-4 py-2.5 rounded-2xl shadow-xl text-center whitespace-nowrap text-xs speech-bubble">
                      {botShouting.text}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-yellow-400 border-r border-b border-yellow-300 rotate-45"></div>
                    </div>
                  )}

                  {/* Player Card Frame */}
                  <div
                    className={`
                      w-32 p-2 bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl flex flex-col items-center relative shadow-lg transition-all duration-300
                      ${isTurn ? 'ring-2 ring-yellow-400 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.35)] scale-105' : ''}
                      ${player.lastAction && player.hasFolded ? 'opacity-40' : ''}
                      ${player.lastAction?.includes('💫') ? 'blur-[0.5px] border-purple-500 animate-pulse' : ''}
                    `}
                  >
                    {/* User Label Badge */}
                    {isMe && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-500 text-white font-bold tracking-widest text-[8px] leading-none px-2 py-0.5 rounded-full uppercase z-10 shadow">
                        我
                      </span>
                    )}

                    {/* Active Turn Remaining Timer */}
                    {isTurn && secondsLeft !== null && (
                      <span className="absolute -top-3 -left-2 bg-red-600 text-white font-mono font-black text-[9px] w-6 h-5 rounded-full border border-red-400 flex items-center justify-center shadow animate-pulse z-20">
                        {secondsLeft}
                      </span>
                    )}

                    {/* Dealer button markup */}
                    {state.gameType === GameType.TEXAS_HOLDEM && state.status === 'PLAYING' && state.players[state.dealerIndex]?.id === player.id && (
                      <span className="absolute -top-3 -right-2 bg-yellow-500 text-black font-black text-[9px] w-5 h-5 rounded-full border border-yellow-300 flex items-center justify-center shadow">
                        D
                      </span>
                    )}

                    {/* Visual representation card avatar */}
                    <div className="w-full flex items-center gap-1.5 mb-1 bg-black/35 p-1 rounded-xl border border-white/5">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${preset.color} flex items-center justify-center border text-white text-xs font-serif shadow-inner font-extrabold shrink-0`}>
                        {preset.label.substring(0, 2)}
                      </div>
                      <div className="truncate text-left leading-tight w-full">
                        <h4 className="text-[10px] font-bold truncate text-slate-100">
                          {player.name}
                        </h4>
                        <p className="text-[8px] font-serif tracking-tight text-yellow-400 leading-none">
                          {preset.movie}
                        </p>
                      </div>
                    </div>

                    {/* Chips count */}
                    <div className="text-[10px] font-mono font-medium flex items-center gap-1 text-slate-200 bg-black/40 px-2 py-0.5 rounded w-full justify-center">
                      <Coins className="w-3 h-3 text-amber-500" />
                      <span>$ {player.chips}</span>
                    </div>

                    {/* Saint of Gambler Superpower MP bar */}
                    {state.isPowerMode && (
                      <div className="w-full mt-1.5 space-y-0.5">
                        <div className="flex justify-between text-[8px] font-mono text-purple-400 font-bold leading-none">
                          <span>精神力 MP</span>
                          <span>{player.mp}</span>
                        </div>
                        <div className="w-full bg-black/40 h-1.5 rounded-full p-[1px] border border-white/5">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${player.mp}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Action marker box */}
                    {player.lastAction && (
                      <div className="mt-1.5 w-full text-center">
                        <span className={`inline-block text-[8px] font-bold px-2 py-0.5 rounded-full ${
                          player.lastAction.includes('打出') ? 'bg-sky-950 text-sky-400' :
                          player.lastAction.includes('跟注') ? 'bg-emerald-950 text-emerald-400' :
                          player.lastAction.includes('棄牌') ? 'bg-stone-950 text-stone-500' :
                          player.lastAction.includes('幻境') ? 'bg-purple-950 text-purple-400 border border-purple-500/20' :
                          'bg-zinc-800 text-zinc-300'
                        }`}>
                          {player.lastAction}
                        </span>
                      </div>
                    )}

                    {/* Show peeked opponent cards if available */}
                    {hasPeeked && hasPeeked.length > 0 && !isMe && (
                      <div className="flex gap-0.5 mt-1 border-t border-dashed border-emerald-500/30 pt-1 justify-center">
                        {hasPeeked.map(card => (
                          <div key={card.id} className="scale-60 shrink-0 select-none pointer-events-none -mx-2 h-10 w-8">
                            <PokerCard card={card} size="sm" isPeeked />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Mini representation card pack left */}
                    {!isMe && player.cards.length > 0 && !(hasPeeked && hasPeeked.length > 0) && (
                      state.gameType === GameType.SHOW_HAND ? (
                        <div className="flex gap-0.5 mt-2 justify-center max-w-full overflow-visible scale-75 -mx-4">
                          {player.cards.map((card, idx) => {
                            if (idx === 0) {
                              return (
                                <div key={card.id} className="w-8 h-12 rounded-md border border-amber-600 bg-gradient-to-b from-red-650 to-amber-900 flex items-center justify-center shrink-0 shadow text-amber-300 font-extrabold text-[12px]">
                                  ?
                                </div>
                              );
                            } else {
                              return (
                                <div key={card.id} className="scale-75 -mx-2.5 shrink-0 select-none pointer-events-none">
                                  <PokerCard card={card} size="sm" />
                                </div>
                              );
                            }
                          })}
                        </div>
                      ) : (
                        <div className="flex gap-0.5 mt-2 justify-center max-w-full overflow-hidden font-sans">
                          {Array.from({ length: Math.min(6, player.cards.length) }).map((_, i) => (
                            <div
                              key={i}
                              className="w-2.5 h-3.5 border border-yellow-500/30 bg-gradient-to-b from-amber-600 to-yellow-800 rounded-sm -mx-0.5"
                            ></div>
                          ))}
                          {player.cards.length > 6 && (
                            <span className="text-[8px] font-mono text-yellow-500 ml-0.5 flex items-center">
                              +{player.cards.length - 6}
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}

          </div>

          {/* LOWER INTERACTIVE HUB: Hand, Betting and Power panels */}
          {state.status === 'PLAYING' && me && (
            <div id="human-hub border" className="w-full mt-6 space-y-4 max-w-4xl z-30">
              
              {/* Cards in Hand Drawer */}
              <div id="player-hand-drawer" className="flex flex-col items-center space-y-2 w-full">
                <div className="flex justify-between items-center w-full px-2">
                  <span className="text-xs text-slate-400 font-serif">我的手牌 (My Hand Cards)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCycleSort}
                      className={`py-1.5 px-3 backdrop-blur-md text-[11px] font-semibold rounded-lg transition border cursor-pointer ${
                        sortMethod === 'small_to_large' 
                          ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/20 hover:bg-indigo-600/45'
                          : sortMethod === 'straight_priority'
                          ? 'bg-purple-600/30 text-purple-300 border-purple-500/20 hover:bg-purple-600/45'
                          : 'bg-rose-600/30 text-rose-300 border-rose-500/20 hover:bg-rose-600/45'
                      }`}
                      title="切換理牌方式（循環：小到大 -> 順子優先 -> 同花優先）"
                    >
                      理牌: {sortMethod === 'small_to_large' ? '小到大' : sortMethod === 'straight_priority' ? '順子優先' : '同花優先'}
                    </button>
                    
                    <button
                      onClick={() => setIsSortLocked(prev => !prev)}
                      className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg transition border cursor-pointer ${
                        isSortLocked
                          ? 'bg-amber-600/30 text-amber-300 border-amber-500/30 hover:bg-amber-600/40'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-400'
                      }`}
                      title={isSortLocked ? '鎖定排序：牌局更新時，自動套用選定之理牌法' : '未鎖定：牌局更新時，不自動套用排序'}
                    >
                      {isSortLocked ? '🔒 固定' : '🔓 解鎖'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 justify-center items-center flex-wrap max-h-40 overflow-y-auto w-full py-4.5 p-3.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md shadow-lg">
                  {mySortedCards.map((card, idx) => {
                    const isSelected = selectedCards.has(card.id);
                    return (
                      <div key={card.id} className="relative mt-2">
                        <PokerCard
                          card={card}
                          selected={isSelected}
                          onClick={() => handleCardClick(card.id)}
                          size="md"
                        />
                        {state.gameType === GameType.SHOW_HAND && idx === 0 && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-600 border border-rose-500 text-[8px] font-sans font-extrabold text-white px-2 py-0.5 rounded-full leading-none z-10 select-none shadow animate-pulse">
                            底牌 (暗)
                          </span>
                        )}
                        {state.gameType === GameType.SHOW_HAND && idx > 0 && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 border border-blue-500 text-[8px] font-sans font-extrabold text-white px-2 py-0.5 rounded-full leading-none z-10 select-none shadow">
                            明牌 {idx + 1}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {mySortedCards.length === 0 && (
                    <p className="text-slate-400 text-xs font-serif py-4">無任何手牌</p>
                  )}
                </div>
              </div>

              {/* Functional Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* 1. Poker Standard Decisions Panel */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-4 flex flex-col justify-center space-y-3 shadow-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-400 font-serif">牌局操控台 (Decision Hub)</span>
                    {isMyTurn ? (
                      <span className="bg-yellow-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                        輪到你出牌
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">等待其他玩家...</span>
                    )}
                  </div>

                  <div className="flex gap-2.5 flex-wrap">
                    {state.gameType === GameType.BIG_TWO ? (
                      <>
                        <button
                          onClick={handlePlayCards}
                          disabled={!isMyTurn || selectedCards.size === 0}
                          className={`flex-1 py-3 px-6 rounded-xl font-bold transition shadow text-sm ${
                            isMyTurn && selectedCards.size > 0
                              ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-450 hover:to-blue-550 text-white cursor-pointer active:scale-95'
                              : 'bg-white/5 text-slate-600 border border-white/5 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          出牌
                        </button>
                        <button
                          onClick={handlePass}
                          disabled={!isMyTurn || !state.lastPlayCards}
                          className={`py-3 px-6 rounded-xl font-bold transition border text-sm ${
                            isMyTurn && state.lastPlayCards
                              ? 'bg-white/10 hover:bg-white/20 text-rose-450 border-white/10 cursor-pointer active:scale-95'
                              : 'bg-white/5 text-slate-600 border-white/5 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          PASS (過)
                        </button>
                        <button
                          onClick={handleCycleSort}
                          className="py-3 px-4 bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold rounded-xl transition border border-white/10 cursor-pointer"
                        >
                          循環理牌
                        </button>
                      </>
                    ) : state.gameType === GameType.SHOW_HAND ? (
                      <>
                        {/* Show Hand Check Button */}
                        <button
                          onClick={() => handleShowHandAction('CHECK')}
                          disabled={!isMyTurn || (state.currentHighBet - (me?.currentBet || 0)) > 0}
                          className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition text-xs ${
                            isMyTurn && (state.currentHighBet - (me?.currentBet || 0)) === 0
                              ? 'bg-white/10 hover:bg-white/25 text-white cursor-pointer border border-white/10'
                              : 'bg-white/5 text-slate-600 border border-white/5 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          過牌 (Check)
                        </button>

                        {/* Show Hand Call Button */}
                        <button
                          onClick={() => handleShowHandAction('CALL')}
                          disabled={!isMyTurn || (state.currentHighBet - (me?.currentBet || 0)) === 0}
                          className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition text-xs ${
                            isMyTurn && (state.currentHighBet - (me?.currentBet || 0)) > 0
                              ? 'bg-blue-600 hover:bg-blue-550 text-white cursor-pointer shadow'
                              : 'bg-white/5 text-slate-600 border border-white/5 opacity-45 cursor-not-allowed'
                          }`}
                        >
                          跟注 (${state.currentHighBet - (me?.currentBet || 0)})
                        </button>

                        {/* Show Hand Raise Button */}
                        <button
                          onClick={() => handleShowHandAction('RAISE')}
                          disabled={!isMyTurn}
                          className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition text-xs ${
                            isMyTurn
                              ? 'bg-yellow-600 hover:bg-yellow-550 text-zinc-950 cursor-pointer shadow'
                              : 'bg-white/5 text-slate-650 border border-white/5 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          加注 ($200)
                        </button>

                        {/* Show Hand Fold Button */}
                        <button
                          onClick={() => handleShowHandAction('FOLD')}
                          disabled={!isMyTurn}
                          className={`py-2.5 px-4 rounded-xl font-bold transition text-xs border ${
                            isMyTurn
                              ? 'border-rose-950/40 bg-rose-950/20 text-rose-400 hover:bg-rose-900/30'
                              : 'border-white/5 text-slate-650 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          棄牌 (Fold)
                        </button>
                      </>
                    ) : (
                      // Texas holdem buttons
                      <>
                        {/* Check Button */}
                        <button
                          onClick={() => handleTexasAction('CHECK')}
                          disabled={!isMyTurn || (state.currentHighBet - (me.currentBet || 0)) > 0}
                          className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition text-xs ${
                            isMyTurn && (state.currentHighBet - (me.currentBet || 0)) === 0
                              ? 'bg-white/10 hover:bg-white/25 text-white cursor-pointer border border-white/10'
                              : 'bg-white/5 text-slate-600 border border-white/5 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          過牌 (Check)
                        </button>

                        {/* Call Button */}
                        <button
                          onClick={() => handleTexasAction('CALL')}
                          disabled={!isMyTurn || (state.currentHighBet - (me.currentBet || 0)) === 0}
                          className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition text-xs ${
                            isMyTurn && (state.currentHighBet - (me.currentBet || 0)) > 0
                              ? 'bg-blue-600 hover:bg-blue-550 text-white cursor-pointer shadow'
                              : 'bg-white/5 text-slate-600 border border-white/5 opacity-45 cursor-not-allowed'
                          }`}
                        >
                          跟注 (${state.currentHighBet - (me.currentBet || 0)})
                        </button>

                        {/* Raise Button */}
                        <button
                          onClick={() => handleTexasAction('RAISE')}
                          disabled={!isMyTurn}
                          className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition text-xs ${
                            isMyTurn
                              ? 'bg-yellow-600 hover:bg-yellow-550 text-zinc-950 cursor-pointer shadow'
                              : 'bg-white/5 text-slate-655 border border-white/5 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          加注 ($200)
                        </button>

                        {/* Fold Button */}
                        <button
                          onClick={() => handleTexasAction('FOLD')}
                          disabled={!isMyTurn}
                          className={`py-2.5 px-4 rounded-xl font-bold transition text-xs border ${
                            isMyTurn
                              ? 'border-rose-950/40 bg-rose-950/20 text-rose-400 hover:bg-rose-900/30'
                              : 'border-white/5 text-slate-655 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          棄牌 (Fold)
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. SPECIFIC SAINT OF GAMBLERS (賭聖) SUPERPOWERS ACTION BOX */}
                <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-4 flex flex-col justify-center space-y-3.5 shadow-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-purple-400 font-serif flex items-center gap-1.5 font-bold">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      特異功能武學 (Saint's Magic Desk)
                    </span>
                    {!state.isPowerMode && (
                      <span className="text-[8px] bg-red-950/50 border border-red-900/30 text-red-500 rounded px-2 py-0.5 leading-none">
                        本局未開超能力
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={triggerRubPower}
                      disabled={!state.isPowerMode}
                      className={`flex-1 py-2.5 px-3.5 rounded-xl font-serif font-black flex items-center justify-center gap-1.5 tracking-wide text-xs border transition ${
                        state.isPowerMode 
                          ? me.avatar === 'star'
                            ? 'bg-purple-950/70 border-purple-500 text-purple-300 hover:bg-purple-900/40 cursor-pointer shadow-purple-950/50 hover:shadow-lg'
                            : 'bg-purple-950/30 border-purple-900/60 text-purple-400 hover:bg-purple-900/20 cursor-pointer'
                          : 'bg-white/5 text-slate-650 border border-white/5 opacity-30 cursor-not-allowed'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      搓牌變牌
                    </button>

                    <button
                      onClick={triggerYeeMungBoost}
                      disabled={!state.isPowerMode}
                      className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-1 text-[11px] transition ${
                        state.isPowerMode
                          ? 'border-pink-500/30 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 cursor-pointer'
                          : 'bg-white/5 text-slate-650 border border-white/5 opacity-30 cursor-not-allowed'
                      }`}
                    >
                      <Smile className="w-3.5 h-3.5" />
                      綺夢打氣
                    </button>
                  </div>

                  {/* Secondary Targeted power setups (Peek and Illusion targets selectors) */}
                  {state.isPowerMode && (
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
                      {/* Peek hand target selection */}
                      <div className="flex items-center gap-1 bg-black/45 p-1.5 rounded-xl border border-white/10">
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <select
                          value={targetPeekPlayerId || ''}
                          onChange={(e) => setTargetPeekPlayerId(e.target.value)}
                          className="bg-transparent text-[10px] text-slate-300 focus:outline-none w-full truncate cursor-pointer [&>option]:bg-[#030712] [&>option]:text-slate-100"
                        >
                          <option value="">🔮 透視對手</option>
                          {state.players.filter(p => p.id !== clientId).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={triggerPeekPower}
                          disabled={!targetPeekPlayerId}
                          className={`px-2 py-1 rounded text-[9px] font-bold ${targetPeekPlayerId ? 'bg-emerald-600 cursor-pointer text-white' : 'bg-white/5 text-slate-600'}`}
                        >
                          看
                        </button>
                      </div>

                      {/* Illusion target selection */}
                      <div className="flex items-center gap-1 bg-black/45 p-1.5 rounded-xl border border-white/10">
                        <Flame className="w-3.5 h-3.5 text-purple-400" />
                        <select
                          value={targetIllusionPlayerId || ''}
                          onChange={(e) => setTargetIllusionPlayerId(e.target.value)}
                          className="bg-transparent text-[10px] text-slate-300 focus:outline-none w-full truncate cursor-pointer [&>option]:bg-[#030712] [&>option]:text-slate-100"
                        >
                          <option value="">💫 幻境催眠</option>
                          {state.players.filter(p => p.id !== clientId).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={triggerIllusionPower}
                          disabled={!targetIllusionPlayerId}
                          className={`px-2 py-1 rounded text-[9px] font-bold ${targetIllusionPlayerId ? 'bg-purple-600 cursor-pointer text-white' : 'bg-white/5 text-slate-600'}`}
                        >
                          發功
                        </button>
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

        </div>

        {/* RIGHT SIDE PANEL: Real-time dialogue chat feed */}
        <div id="chat-sidebar" className="w-[280px] md:w-[320px] bg-white/5 border-l border-white/10 flex flex-col z-10 backdrop-blur-xl shrink-0">
          
          <div className="p-3 border-b border-white/10 bg-white/5">
            <h4 className="font-serif font-bold text-xs tracking-wider flex items-center gap-1.5 text-yellow-400">
              <MessageSquare className="w-4 h-4 text-yellow-500" />
              賭苑風雲錄 (戰局通訊室)
            </h4>
          </div>

          {/* Quick cinema quote dials */}
          <div className="p-1 px-2 border-b border-white/10 flex gap-1 overflow-x-auto scrollbar-none bg-black/25 select-none">
            {quoteShouts.map((qs, i) => (
              <button
                key={i}
                onClick={() => handleShoutQuote(qs)}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-md text-[9px] text-slate-300 cursor-pointer transition shrink-0 max-w-28 truncate"
              >
                {qs}
              </button>
            ))}
          </div>

          {/* Chat scrolling feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800">
            {state.chatHistory.map((item) => {
              if (item.isSystem) {
                return (
                  <div key={item.id} className="p-2 border border-emerald-500/10 bg-emerald-500/10 text-emerald-300 font-serif rounded-lg text-[10px] leading-relaxed shadow-sm">
                    📢 {item.message}
                  </div>
                );
              }

              // Normal text or movie trash commentary
              const isMineMsg = item.senderId === clientId;
              const preset = getAvatarPreset(item.avatar);
              return (
                <div key={item.id} className={`flex gap-2 flex-col ${isMineMsg ? 'items-end' : 'items-start'}`}>
                  <div className={`flex gap-1.5 items-center ${isMineMsg ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[9px] text-white bg-gradient-to-br ${preset.color}`}>
                      {preset.label.charAt(0)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">{item.senderName}</span>
                    <span className="text-[8px] font-mono text-slate-655">{item.timestamp}</span>
                  </div>
                  
                  <div className={`p-2.5 rounded-2xl text-xs max-w-xs break-all leading-snug shadow-sm border ${
                    isMineMsg
                      ? 'bg-sky-500/15 border-sky-500/30 text-sky-200 rounded-tr-none'
                      : 'bg-black/35 border-white/5 text-slate-100 rounded-tl-none'
                  }`}>
                    {item.message}
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef}></div>
          </div>

          {/* Chat trigger input box */}
          <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 bg-white/5 flex gap-2">
            <input
              type="text"
              value={chatBoxInput}
              onChange={(e) => setChatBoxInput(e.target.value)}
              placeholder="💬 聊幾嘴/搓牌口訣..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20"
            />
            <button
              type="submit"
              className="bg-yellow-600 hover:bg-yellow-500 text-zinc-955 p-2 rounded-xl transition cursor-pointer shadow"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>

      </div>

      {/* RUB/CHANGE MODAL COMPONENT */}
      {rubModalCard && (
        <RubModal
          card={rubModalCard}
          isOpen={!!rubModalCard}
          onClose={() => setRubModalCard(null)}
          onRubExecute={executePowerRub}
        />
      )}

    </div>
  );
}
