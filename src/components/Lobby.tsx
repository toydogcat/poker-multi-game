/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameType, CHARACTER_DATA } from '../types';
import CameraQRScanner from './CameraQRScanner';
import { 
  Sparkles, 
  Gamepad2, 
  Plus, 
  RotateCw, 
  Users, 
  Crown, 
  AlertCircle, 
  Camera
} from 'lucide-react';

interface LobbyProps {
  clientId: string;
  rooms: any[];
  onRefreshRooms: () => void;
  onCreateRoom: (roomName: string, gameType: GameType, isPowerMode: boolean, playerName: string, playerAvatar: string, turnTimeLimit: number, useJokers: boolean) => void;
  onJoinRoom: (roomId: string, playerName: string, playerAvatar: string) => void;
}

export default function Lobby({
  clientId,
  rooms,
  onRefreshRooms,
  onCreateRoom,
  onJoinRoom,
}: LobbyProps) {
  const [playerName, setPlayerName] = useState('熱血賭神');
  const [selectedAvatar, setSelectedAvatar] = useState('star'); // Default to Stephen Chow Sing-ge
  const [newRoomName, setNewRoomName] = useState('公海大決戰');
  const [newGameType, setNewGameType] = useState<GameType>(GameType.BIG_TWO);
  const [isPowerMode, setIsPowerMode] = useState(true);
  const [turnTimeLimit, setTurnTimeLimit] = useState(30); // Default to 30s
  const [useJokers, setUseJokers] = useState(false); // Enable Jokers
  const [manualRoomId, setManualRoomId] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // URL Parameter Detection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rId = params.get('room');
    if (rId) {
      setManualRoomId(rId.toUpperCase());
    }
  }, []);

  const characters = Object.entries(CHARACTER_DATA).map(([key, value]) => ({
    key,
    ...value,
  }));

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      alert('請填寫你的 名號！');
      return;
    }
    if (!newRoomName.trim()) {
      alert('請填寫 房間名稱！');
      return;
    }
    onCreateRoom(newRoomName, newGameType, isPowerMode, playerName, selectedAvatar, turnTimeLimit, useJokers);
  };

  const handleJoinSubmit = (roomId: string) => {
    if (!playerName.trim()) {
      alert('請填寫你的 名號！');
      return;
    }
    onJoinRoom(roomId, playerName, selectedAvatar);
  };

  const handleManualJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRoomId.trim()) {
      alert('請填寫 房間號碼！');
      return;
    }
    if (!playerName.trim()) {
      alert('請填寫你的 名號！');
      return;
    }
    handleJoinSubmit(manualRoomId.trim());
  };

  return (
    <div id="lobby-screen" className="min-h-screen w-full bg-transparent text-slate-100 flex flex-col items-center justify-start p-4 md:p-8 overflow-y-auto select-none font-sans scrollbar-none relative z-10">
      
      {/* Cinematic Glowing Header */}
      <div className="text-center space-y-2 max-w-2xl mb-8 mt-4 relative z-10">
        <div className="flex justify-center items-center gap-2">
          <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
          <h1 className="font-serif font-black text-4xl tracking-[6px] bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 uppercase drop-shadow-md">
            中華賭聖：撲克之王
          </h1>
          <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse animate-delay-150" />
        </div>
        <p className="text-[10px] uppercase tracking-[3px] text-slate-400 font-bold mt-1">
          🏆 「搓牌變牌、透視大師」 港片特異功能爆笑再現！ 🏆
        </p>
        <div className="h-[1px] w-48 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto mt-4"></div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">
        
        {/* LEFT COLUMN: Identity & Character Profile selection (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Identity input */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="font-serif font-bold text-base flex items-center gap-2 text-amber-400">
              <Crown className="w-5 h-5 text-yellow-400" />
              1. 建立閣下的賭壇名號
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <label className="md:col-span-3 text-xs text-slate-400 font-medium">填入你的尊姓大名:</label>
              <div className="md:col-span-9 relative">
                <input
                  type="text"
                  maxLength={12}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm text-yellow-300 font-serif font-semibold focus:outline-none focus:ring-1 focus:ring-yellow-400/30 backdrop-blur-md"
                  placeholder="例如：至尊賭俠"
                />
              </div>
            </div>
          </div>

          {/* Character selection carousel/gird */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="font-serif font-bold text-base flex items-center gap-2 text-amber-400">
                <Gamepad2 className="w-5 h-5 text-yellow-400" />
                2. 繼承經典電影角色之「特異功能」流派
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                不同角色繼承各異的超能力優勢噢！點擊卡片即可鎖定出戰：
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {characters.map(char => {
                const isSelected = selectedAvatar === char.key;
                
                return (
                  <div
                    key={char.key}
                    onClick={() => setSelectedAvatar(char.key)}
                    className={`
                      p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-300 
                      flex flex-col justify-between space-y-2 relative h-[140px] shadow-sm hover:shadow-md backdrop-blur-md
                      ${isSelected 
                        ? 'border-yellow-400 bg-amber-500/10 -translate-y-1 ring-4 ring-yellow-400/20 shadow-yellow-500/10' 
                        : 'border-white/10 bg-black/35 opacity-75 hover:opacity-100 hover:border-white/20 hover:-translate-y-0.5'
                      }
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-serif font-extrabold text-sm text-yellow-300">
                          {char.name.split(' ')[0]}
                        </h4>
                        <span className="text-[8px] font-medium text-indigo-300 font-sans tracking-wide uppercase mt-0.5 block leading-none">
                          {char.title}
                        </span>
                      </div>
                      
                      {isSelected && (
                        <span className="absolute top-2 right-2 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                        </span>
                      )}
                    </div>

                    <p className="text-[9px] text-slate-400 leading-relaxed font-sans line-clamp-3">
                      {char.desc}
                    </p>

                    <div className="flex justify-between items-center border-t border-white/5 pt-2 text-[9px] font-mono text-slate-500">
                      <span>初始 MP:</span>
                      <span className="text-purple-400 font-bold">{char.baseMp}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Game Rooms creation / join (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Create Room box */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-xl relative overflow-hidden bg-gradient-to-b from-white/5 to-amber-500/5">
            <h3 className="font-serif font-bold text-base flex items-center gap-2 text-amber-400 mb-4">
              <Plus className="w-5 h-5 text-yellow-400" />
              主持豪桌 (開設新房間)
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400">自定義決戰房間名稱:</label>
                <input
                  type="text"
                  maxLength={16}
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNewGameType(GameType.BIG_TWO)}
                  className={`py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    newGameType === GameType.BIG_TWO
                      ? 'border-yellow-400 bg-amber-500/10 text-yellow-400'
                      : 'border-white/10 bg-black/30 text-slate-400 hover:border-white/20'
                  }`}
                >
                  ♣️ 大老二
                </button>
                <button
                  type="button"
                  onClick={() => setNewGameType(GameType.SHOW_HAND)}
                  className={`py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    newGameType === GameType.SHOW_HAND
                      ? 'border-yellow-400 bg-amber-500/10 text-yellow-400'
                      : 'border-white/10 bg-black/30 text-slate-400 hover:border-white/20'
                  }`}
                >
                  ♦️ 梭哈
                </button>
                <button
                  type="button"
                  onClick={() => setNewGameType(GameType.TEXAS_HOLDEM)}
                  className={`py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    newGameType === GameType.TEXAS_HOLDEM
                      ? 'border-yellow-400 bg-amber-500/10 text-yellow-400'
                      : 'border-white/10 bg-black/30 text-slate-400 hover:border-white/20'
                  }`}
                >
                  ♥️ 德州撲克
                </button>
              </div>

              {/* Turn Time Limit Setting */}
              <div className="space-y-1.5 text-left">
                <label className="text-[11px] text-slate-400 font-bold block">⏱️ 玩家思考時間限制:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 0].map((sec) => (
                    <button
                      type="button"
                      key={sec}
                      onClick={() => setTurnTimeLimit(sec)}
                      className={`py-2 rounded-xl text-[10px] font-bold transition border cursor-pointer text-center ${
                        turnTimeLimit === sec
                          ? 'border-yellow-400 bg-amber-500/10 text-yellow-400 font-extrabold'
                          : 'border-white/10 bg-black/30 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {sec === 0 ? '無限制' : `${sec}秒`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jokers Toggler */}
              <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/10 backdrop-blur-sm transition-all duration-300">
                <div className="flex flex-col text-left">
                  <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                    🤡 裝配【大小鬼】鬼牌
                  </span>
                  <span className="text-[9px] text-slate-500">
                    大小鬼為萬能牌（可充當任何牌），但同手牌中比實牌小，单張輸給黑桃2
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={useJokers}
                  onChange={(e) => setUseJokers(e.target.checked)}
                  className="w-4 h-4 cursor-pointer text-yellow-500 bg-black border-white/20 rounded focus:ring-yellow-500"
                />
              </div>

              {/* Superpowers toggler */}
              <div className={`flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/10 backdrop-blur-sm transition-all duration-300 ${newGameType !== GameType.SHOW_HAND ? 'opacity-55' : ''}`}>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    啟用賭聖之特異功能
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {newGameType === GameType.SHOW_HAND 
                      ? "搓牌變牌、透視神眼、幻境干擾" 
                      : "🚨 大老二與德州撲克不適用，維持一般標準規則"}
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled={newGameType !== GameType.SHOW_HAND}
                  checked={newGameType === GameType.SHOW_HAND && isPowerMode}
                  onChange={(e) => setIsPowerMode(e.target.checked)}
                  className="w-4 h-4 cursor-pointer text-yellow-500 bg-black border-white/20 rounded focus:ring-yellow-500 disabled:cursor-not-allowed disabled:opacity-30"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-550 text-slate-950 font-serif font-black tracking-widest text-sm rounded-2xl cursor-pointer shadow-lg shadow-orange-950/20 active:scale-98 transition duration-200"
              >
                豪橫開房 (Create)
              </button>
            </form>
          </div>

          {/* Join Rooms list */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-serif font-bold text-base flex items-center gap-2 text-amber-400">
                <Users className="w-5 h-5 text-yellow-400" />
                入座參戰 (已有戰局)
              </h3>
              <button
                onClick={onRefreshRooms}
                className="p-1 px-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                title="刷新房間列表"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Quick manual connect ID */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="🔑 房間號碼..."
                value={manualRoomId}
                onChange={(e) => setManualRoomId(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-400/50"
              />
              <button
                onClick={() => setShowScanner(true)}
                className="p-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl hover:bg-indigo-600/30 transition cursor-pointer"
                title="掃描二維碼"
              >
                <Camera className="w-4 h-4" />
              </button>
              <button
                onClick={handleManualJoin}
                className="bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold px-4 rounded-xl shadow border border-white/15 cursor-pointer transition-all"
              >
                加入
              </button>
            </div>

            {showScanner && (
              <CameraQRScanner 
                onScan={(rId) => {
                  setManualRoomId(rId);
                  setShowScanner(false);
                }}
                onClose={() => setShowScanner(false)}
              />
            )}

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 p-0.5">
              {rooms.map(room => (
                <div
                  key={room.roomId}
                  id={`room-${room.roomId}`}
                  className="p-3 bg-black/30 border border-white/5 hover:border-white/15 rounded-2xl flex items-center justify-between text-left transition hover:bg-white/5"
                >
                  <div className="space-y-1 truncate max-w-[65%]">
                    <h5 className="text-xs font-bold text-slate-200 truncate">
                      {room.roomName}
                    </h5>
                    <div className="flex items-center gap-2 text-[9px] text-slate-400">
                      <span>房主：{room.creator}</span>
                      <span>•</span>
                      <span>
                        {room.gameType === GameType.BIG_TWO 
                          ? '♣️ 大老二' 
                          : room.gameType === GameType.SHOW_HAND 
                            ? '♦️ 梭哈 (港式五張)' 
                            : '♥️ 德州撲克'}
                      </span>
                      {room.turnTimeLimit !== undefined && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium">⏱️ {room.turnTimeLimit > 0 ? `${room.turnTimeLimit}秒` : '自訂無限時'}</span>
                        </>
                      )}
                      {room.useJokers && (
                        <>
                          <span>•</span>
                          <span className="text-pink-400 font-bold">🤡 鬼牌</span>
                        </>
                      )}
                      {room.isPowerMode && room.gameType === GameType.SHOW_HAND && (
                        <>
                          <span>•</span>
                          <span className="text-purple-400 font-bold">🔮 特異功能</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-mono text-slate-350 border border-white/10 bg-black/40 rounded px-1.5 py-0.5">
                      {room.playersCount} / {room.gameType === GameType.BIG_TWO ? '4' : room.gameType === GameType.SHOW_HAND ? '5' : '6'} 人
                    </span>
                    
                    <button
                      onClick={() => handleJoinSubmit(room.roomId)}
                      className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-550 text-slate-950 text-xs font-serif font-bold rounded-xl shadow-md transition cursor-pointer"
                    >
                      進房
                    </button>
                  </div>
                </div>
              ))}

              {rooms.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs font-serif space-y-1 bg-black/20 border border-white/5 rounded-2xl">
                  <AlertCircle className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                  <p>目前公海上風平浪靜，尚無對局。</p>
                  <p className="text-[10px] text-slate-500">快點擊上方「主持豪桌」開拓新天地吧！</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
      
    </div>
  );
}
