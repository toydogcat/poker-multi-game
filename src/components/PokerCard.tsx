/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card } from '../types';

interface PokerCardProps {
  card: Card;
  hidden?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  isPeeked?: boolean;
  key?: string | number;
}

export default function PokerCard({
  card,
  hidden = false,
  selected = false,
  onClick,
  size = 'md',
  isPeeked = false,
}: PokerCardProps) {
  const isRed = card.isJoker === 'big' || card.suit === 'H' || card.suit === 'D';
  
  const suitsMap = {
    S: { symbol: '♠', label: '黑桃', colorClass: 'text-slate-900 dark:text-white' },
    H: { symbol: '♥', label: '紅心', colorClass: 'text-red-600' },
    D: { symbol: '♦', label: '磚塊', colorClass: 'text-red-500' },
    C: { symbol: '♣', label: '梅花', colorClass: 'text-slate-700 dark:text-zinc-300' },
  };

  const valuesMap: { [key: number]: string } = {
    1: 'A',
    11: 'J',
    12: 'Q',
    13: 'K',
  };
  let valStr = valuesMap[card.value] || card.value.toString();
  let suitInfo = suitsMap[card.suit] || { symbol: '?', label: '', colorClass: '' };

  if (card.isJoker === 'big') {
    valStr = '大鬼';
    suitInfo = { symbol: '🤡', label: '大鬼', colorClass: 'text-red-600 font-bold' };
  } else if (card.isJoker === 'small') {
    valStr = '小鬼';
    suitInfo = { symbol: '🤡', label: '小鬼', colorClass: 'text-zinc-600 dark:text-zinc-400 font-bold' };
  }

  // Dimension selections
  const sizeClasses = {
    sm: 'w-12 h-18 text-xs rounded-md',
    md: 'w-18 h-26 text-sm rounded-lg',
    lg: 'w-24 h-34 text-base rounded-xl',
  };

  if (hidden && !isPeeked) {
    // Elegant casino style golden back
    return (
      <div
        onClick={onClick}
        id={`card-back-${card.id}`}
        className={`${sizeClasses[size]} select-none cursor-pointer bg-gradient-to-br from-amber-600 to-yellow-800 shadow-md border-2 border-yellow-400 p-1 flex items-center justify-center transition-transform hover:-translate-y-2 active:scale-95`}
      >
        <div className="w-full h-full border border-yellow-300 rounded opacity-80 flex items-center justify-center bg-amber-900 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:10px_10px]">
          <span className="font-serif font-bold text-yellow-300 select-none tracking-widest" style={{ fontSize: size === 'lg' ? '1.5rem' : '1rem' }}>
            賭
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      id={`card-${card.id}`}
      className={`
        ${sizeClasses[size]}
        relative select-none cursor-pointer bg-white dark:bg-zinc-800 shadow-md hover:shadow-xl transition-all duration-200 
        flex flex-col justify-between p-2 font-sans border
        ${selected ? 'border-sky-500 ring-4 ring-sky-300 dark:ring-sky-800 -translate-y-4' : 'border-zinc-300 dark:border-zinc-700 hover:-translate-y-2'}
        ${card.isPowerChanged ? 'border-purple-400 ring-2 ring-purple-300 dark:ring-purple-900' : ''}
        ${isPeeked ? 'opacity-70 border-dashed border-emerald-500' : ''}
      `}
    >
      {/* Superpower Glow Aura */}
      {card.isPowerChanged && (
        <span className="absolute -top-3 -right-3 z-10 bg-purple-600 text-white font-mono font-bold text-[8px] leading-none px-1 py-0.5 rounded-full rotate-12 uppercase animate-bounce shadow">
          {card.id.includes('fail') ? '💥 烏龍' : '✨ 神力'}
        </span>
      )}

      {/* Peek Indicator */}
      {isPeeked && (
        <span className="absolute -top-3 left-1 z-10 bg-emerald-600 text-white font-serif font-bold text-[8px] leading-none px-1 py-0.5 rounded shadow">
          👁️ 透視
        </span>
      )}

      {/* Top Left value */}
      <div className="flex flex-col items-start leading-none">
        <span className={`font-bold ${isRed ? 'text-rose-600' : 'text-zinc-900 dark:text-zinc-100'}`}>
          {valStr}
        </span>
        <span className={`text-base ${suitInfo.colorClass}`}>
          {suitInfo.symbol}
        </span>
      </div>

      {/* Centered Large Suit Stamp */}
      <div className="self-center leading-none select-none text-center">
        <span 
          className={`
            block opacity-90 transition-all font-serif
            ${suitInfo.colorClass}
            ${size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-2xl' : 'text-lg'}
          `}
        >
          {suitInfo.symbol}
        </span>
        {card.isPowerChanged && (
          <span className="block text-[8px] dark:text-zinc-400 text-purple-700 font-serif leading-none mt-1">
            {card.id.includes('fail') ? '失控搓牌' : '特異變牌'}
          </span>
        )}
      </div>

      {/* Bottom Right value */}
      <div className="flex flex-col items-end leading-none rotate-180">
        <span className={`font-bold ${isRed ? 'text-rose-600' : 'text-zinc-900 dark:text-zinc-100'}`}>
          {valStr}
        </span>
        <span className="text-base">
          {suitInfo.symbol}
        </span>
      </div>
    </div>
  );
}
