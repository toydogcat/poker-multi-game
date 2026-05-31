/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Card, Suit } from '../types';
import { Sparkles, RefreshCw, X } from 'lucide-react';

interface RubModalProps {
  card: Card;
  isOpen: boolean;
  onClose: () => void;
  onRubExecute: (targetSuit: Suit, targetValue: number) => void;
}

export default function RubModal({ card, isOpen, onClose, onRubExecute }: RubModalProps) {
  const [targetSuit, setTargetSuit] = useState<Suit>('S');
  const [targetValue, setTargetValue] = useState<number>(2); // Default to 2 (highest in Big Two)
  const [progress, setProgress] = useState(0);
  const [isRubbing, setIsRubbing] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  if (!isOpen) return null;

  // Track dragging/hovering speed on the rubbing pad to increment progress
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRubbing) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    if (lastMousePos.current.x !== 0 && lastMousePos.current.y !== 0) {
      const dist = Math.sqrt(
        Math.pow(currentX - lastMousePos.current.x, 2) +
        Math.pow(currentY - lastMousePos.current.y, 2)
      );

      // Dist represents cursor speed. Safe increments
      if (dist > 5) {
        setProgress(prev => {
          const next = prev + Math.floor(dist / 14);
          if (next >= 100) {
            setIsRubbing(false);
            // Auto trigger play
            onRubExecute(targetSuit, targetValue);
            setProgress(0);
            onClose();
            return 100;
          }
          return next;
        });
      }
    }

    lastMousePos.current = { x: currentX, y: currentY };
  };

  const handleStartRubbing = () => {
    setIsRubbing(true);
  };

  const handleStopRubbing = () => {
    setIsRubbing(false);
    lastMousePos.current = { x: 0, y: 0 };
  };

  const suits = [
    { key: 'S' as Suit, label: '♠ 黑桃', color: 'text-slate-900 bg-slate-105 hover:bg-slate-200' },
    { key: 'H' as Suit, label: '♥ 紅心', color: 'text-red-600 bg-red-50 hover:bg-red-100' },
    { key: 'D' as Suit, label: '♦ 磚塊', color: 'text-red-505 bg-red-50 hover:bg-red-100' },
    { key: 'C' as Suit, label: '♣ 梅花', color: 'text-slate-700 bg-slate-105 hover:bg-slate-200' },
  ];

  const ranks = [
    { value: 15, actual: 2, label: '2 (神牌)' },
    { value: 14, actual: 1, label: 'Ace' },
    { value: 13, actual: 13, label: 'K' },
    { value: 12, actual: 12, label: 'Q' },
    { value: 11, actual: 11, label: 'J' },
    { value: 10, actual: 10, label: '10' },
    { value: 9, actual: 9, label: '9' },
    { value: 8, actual: 8, label: '8' },
    { value: 7, actual: 7, label: '7' },
    { value: 6, actual: 6, label: '6' },
    { value: 5, actual: 5, label: '5' },
    { value: 4, actual: 4, label: '4' },
    { value: 3, actual: 3, label: '3' },
  ];

  return (
    <div id="rub-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#0c0a09]/55 border border-white/10 backdrop-blur-md rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="border-b border-white/10 p-4 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2 text-yellow-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <h3 className="font-serif font-bold text-lg tracking-widest">特異功能搓牌室</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/5 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Card to rub info */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-4">
            <div className="bg-white text-zinc-900 font-bold p-3 rounded-lg w-12 h-16 flex flex-col justify-between border-2 border-yellow-400 shadow">
              <span className="text-xs leading-none">{card.value === 1 ? 'A' : card.value === 11 ? 'J' : card.value === 12 ? 'Q' : card.value === 13 ? 'K' : card.value}</span>
              <span className="text-right text-lg self-end leading-none">{card.suit === 'S' ? '♠' : card.suit === 'H' ? '♥' : card.suit === 'D' ? '♦' : '♣'}</span>
            </div>
            <div>
              <p className="text-slate-405 text-xs">正在搓揉手牌：</p>
              <h4 className="text-white font-serif font-bold text-base">
                {card.suit === 'S' ? '黑桃' : card.suit === 'H' ? '紅心' : card.suit === 'D' ? '磚塊' : '梅花'}
                {card.value === 1 ? 'A' : card.value === 11 ? 'J' : card.value === 12 ? 'Q' : card.value === 13 ? 'K' : card.value}
              </h4>
              <p className="text-purple-305 text-xs mt-1">💡 提示：搓牌有一定機率失敗，失敗將變為烏龍牌。發功者阿星成功機率最高！</p>
            </div>
          </div>

          {/* Step 1: Select target Suit */}
          <div>
            <label className="block text-slate-400 font-serif text-sm mb-2">【 步驟 1 】選擇你想要的 花色 (Suit)</label>
            <div className="grid grid-cols-4 gap-2">
              {suits.map(s => (
                <button
                  key={s.key}
                  onClick={() => setTargetSuit(s.key)}
                  className={`
                    py-2.5 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 border cursor-pointer
                    ${targetSuit === s.key 
                      ? 'border-yellow-400 ring-2 ring-yellow-400/50 bg-amber-950/40 text-yellow-300' 
                      : 'border-white/10 bg-black/45 text-slate-400'
                    }
                  `}
                >
                  <span className={`text-xl ${targetSuit === s.key ? '' : 'opacity-70'}`}>
                    {s.label.split(' ')[0]}
                  </span>
                  <span>{s.label.split(' ')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Select rank */}
          <div>
            <label className="block text-slate-400 font-serif text-sm mb-2">【 步驟 2 】選擇你想要的 牌點 (Value)</label>
            <div className="grid grid-cols-5 gap-1.5 max-h-32 overflow-y-auto p-1 bg-black/45 border border-white/10 rounded-xl">
              {ranks.map(r => (
                <button
                  key={r.value}
                  onClick={() => setTargetValue(r.actual)}
                  className={`
                    py-1.5 px-0.5 rounded-lg text-xs font-mono font-medium transition border cursor-pointer
                    ${targetValue === r.actual
                      ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400 font-bold'
                      : 'border-white/5 hover:bg-white/5 text-slate-400'
                    }
                  `}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Rubbing Pad */}
          <div className="space-y-3">
            <label className="block text-slate-400 font-serif text-sm">
              【 步驟 3 】摩擦起電！請在下方板塊中來回劃屏搓動
            </label>
            
            {/* Rubbing Area */}
            <div
              id="rubbing-pad"
              onMouseDown={handleStartRubbing}
              onMouseUp={handleStopRubbing}
              onMouseLeave={handleStopRubbing}
              onMouseMove={handleMouseMove}
              onTouchStart={handleStartRubbing}
              onTouchEnd={handleStopRubbing}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                if (touch) {
                  const simulatedEvent = {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                  } as any;
                  handleMouseMove(simulatedEvent);
                }
              }}
              className={`
                h-36 rounded-2xl border-2 border-dashed bg-gradient-to-b from-black/40 to-black/25
                flex flex-col items-center justify-center p-4 cursor-pointer select-none transition-all duration-300
                ${isRubbing 
                  ? 'border-yellow-500 bg-yellow-500/5 shadow-inner' 
                  : 'border-white/10 hover:border-white/15'
                }
              `}
            >
              <div className="text-center pointer-events-none space-y-2">
                <RefreshCw className={`w-10 h-10 mx-auto text-yellow-500/70 border border-dashed border-yellow-500/30 p-2 rounded-full ${isRubbing ? 'animate-spin' : ''}`} />
                <p className="font-serif font-bold text-sm text-yellow-500">
                  {isRubbing ? '🔥 快快快！瘋狂摩擦手感中... 🔥' : '🖱️ 按住並在此板塊來回高速摩擦 🖱️'}
                </p>
                <p className="text-slate-500 text-[10px]">
                  {isRubbing ? '發功中...精神力高度集中！' : '摩擦越快，熱量越高，好牌成功機率翻倍！'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-serif text-yellow-400">
                <span>特異發功專注度：</span>
                <span className="font-mono font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-black/40 h-3.5 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 h-full rounded-full transition-all duration-100 ease-out shadow-glow"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>

        </div>

        <div className="border-t border-white/10 p-4 bg-white/5 text-center">
          <p className="text-[10px] text-slate-500">
            「搓好了就是大老二，搓不好就是烏龍3，賭壇有風險，發功需謹慎！」
          </p>
        </div>

      </div>
    </div>
  );
}
