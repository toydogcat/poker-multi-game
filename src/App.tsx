/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { GameType } from './types';
import Lobby from './components/Lobby';
import GameTable from './components/GameTable';
import { useP2PGame } from './hooks/useP2PGame';

export default function App() {
  const [clientId, setClientId] = useState('');
  
  // 1. Initialize Client Unique ID
  useEffect(() => {
    let id = localStorage.getItem('poker_client_id');
    if (!id) {
      id = `client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      localStorage.setItem('poker_client_id', id);
    }
    setClientId(id);
  }, []);

  const {
    gameState,
    isHost,
    roomId,
    connectionStatus,
    createRoom,
    joinRoom,
    startGame,
    performAction
  } = useP2PGame(clientId);

  const [peekedCards, setPeekedCards] = useState<{ [playerId: string]: any[] }>({});

  // Luna Hub Scroll Broadcast
  useEffect(() => {
    let lastScrollY = 0;
    const scrollThreshold = 8;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold && currentScrollY > 10) return;
      const direction = currentScrollY > lastScrollY ? 'down' : 'up';
      window.parent.postMessage({
        type: 'iframe_scroll',
        scrollY: currentScrollY,
        direction: direction
      }, '*');
      lastScrollY = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dispatch game events in gameTable
  const handleActionDispatch = (actionType: string, payload: any) => {
    if (actionType === 'START_GAME') {
      startGame();
    } else {
      performAction(actionType, payload);
    }
  };

  const handleSendMessage = (message: string) => {
    performAction('SEND_CHAT', { message });
  };

  const handleLeaveRoom = () => {
    window.location.reload(); // Simple way to leave for now
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col justify-between overflow-hidden relative font-sans">
      
      {/* Frosted Glass Radial Background Glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_#1e3a8a_0%,_transparent_55%),radial-gradient(circle_at_80%_80%,_#4c1d95_0%,_transparent_55%)] opacity-35 pointer-events-none z-0"></div>

      {/* Network connection line */}
      <div className="absolute top-1 left-2 z-50 text-[9px] font-mono select-none pointer-events-none flex items-center gap-1.5 opacity-60">
        <span className={`w-2 h-2 rounded-full ${
          connectionStatus === 'CONNECTED' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' :
          connectionStatus === 'CONNECTING' ? 'bg-amber-500 animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
        }`}></span>
        <span>
          P2P MESH: {connectionStatus === 'CONNECTED' ? 'SYNCED' : 'INITIALIZING'}
        </span>
      </div>

      <div className="flex-1 flex flex-col z-10 overflow-hidden relative">
        {gameState ? (
          <GameTable
            state={gameState}
            clientId={clientId}
            onSendMessage={handleSendMessage}
            onAction={handleActionDispatch}
            onLeaveRoom={handleLeaveRoom}
            peekedCards={peekedCards}
          />
        ) : (
          <Lobby
            clientId={clientId}
            rooms={[]}
            onRefreshRooms={() => {}}
            onCreateRoom={(name, type, power, pName, pAvatar) => createRoom(name, type, pName, pAvatar)}
            onJoinRoom={(rId, pName, pAvatar) => joinRoom(rId, pName, pAvatar)}
          />
        )}
      </div>

    </div>
  );
}
