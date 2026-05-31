
import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import { GameState, GameType, Player, ChatMessage, CHARACTER_DATA } from '../types';
import { 
  initBigTwo, 
  initTexasHoldem, 
  initShowHand, 
  getBotAction,
  handleGameAction 
} from '../utils/gameEngine';

const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
const STUN_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function useP2PGame(clientId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  
  const peerConnections = useRef<{ [playerId: string]: RTCPeerConnection }>({});
  const dataChannels = useRef<{ [playerId: string]: RTCDataChannel }>({});
  const gameStateRef = useRef<GameState | null>(null);

  // Sync ref with state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const broadcastState = useCallback((state: GameState) => {
    const message = JSON.stringify({ type: 'GAME_STATE_UPDATED', state });
    Object.values(dataChannels.current).forEach((dc: RTCDataChannel) => {
      if (dc.readyState === 'open') dc.send(message);
    });
    setGameState(state);
  }, []);

  const sendToHost = useCallback((message: any) => {
    const dc = Object.values(dataChannels.current)[0] as RTCDataChannel | undefined; // If guest, only one DC to host
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify(message));
    }
  }, []);

  const handleMessage = useCallback((playerId: string, message: any) => {
    const { type, payload, state } = message;

    if (isHost) {
      // Host handles actions from guests
      if (gameStateRef.current) {
        const newState = { ...gameStateRef.current };
        
        if (type === 'ADD_BOT_OPPONENT') {
          const { avatarKey } = payload;
          const charInfo = (CHARACTER_DATA as any)[avatarKey];
          const botPlayer: Player = {
            id: `bot-${avatarKey}-${Date.now()}`,
            name: `${charInfo.name} (AI)`,
            avatar: avatarKey,
            chips: 10000,
            mp: charInfo.baseMp,
            cards: [],
            isReady: true,
            isBot: true,
            isHost: false,
          };
          newState.players.push(botPlayer);
          broadcastState(newState);
          return;
        }

        const changed = handleGameAction(newState, type, { ...payload, clientId: playerId });
        if (changed) {
          broadcastState(newState);
        }
      }
    } else {
      // Guest handles updates from host
      if (type === 'GAME_STATE_UPDATED') {
        setGameState(state);
      }
    }
  }, [isHost, broadcastState]);

  // MQTT Signaling Setup
  const setupSignaling = useCallback((rId: string, role: 'host' | 'guest') => {
    const client = mqtt.connect(MQTT_BROKER);
    setMqttClient(client);
    setConnectionStatus('CONNECTING');

    const topicJoin = `poker/${rId}/join`;
    const topicSignal = `poker/${rId}/signal/${clientId}`;

    client.on('connect', () => {
      setConnectionStatus('CONNECTED');
      client.subscribe(topicSignal);
      if (role === 'host') {
        client.subscribe(topicJoin);
      } else {
        client.publish(topicJoin, JSON.stringify({ clientId }));
      }
    });

    client.on('message', async (topic, message) => {
      const data = JSON.parse(message.toString());

      if (topic === topicJoin && role === 'host') {
        // Host receives join request, initiates WebRTC
        setupPeerConnection(data.clientId, true);
      } else if (topic === topicSignal) {
        // Signaling message (SDP/ICE)
        const { fromId, sdp, ice } = data;
        if (sdp) {
          const pc = setupPeerConnection(fromId, false);
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          if (sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            client.publish(`poker/${rId}/signal/${fromId}`, JSON.stringify({ fromId: clientId, sdp: answer }));
          }
        } else if (ice) {
          const pc = peerConnections.current[fromId];
          if (pc) await pc.addIceCandidate(new RTCIceCandidate(ice));
        }
      }
    });

    return client;
  }, [clientId]);

  const setupPeerConnection = (targetId: string, isInitiator: boolean) => {
    if (peerConnections.current[targetId]) return peerConnections.current[targetId];

    const pc = new RTCPeerConnection(STUN_SERVERS);
    peerConnections.current[targetId] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && mqttClient) {
        mqttClient.publish(`poker/${roomId}/signal/${targetId}`, JSON.stringify({ fromId: clientId, ice: event.candidate }));
      }
    };

    if (isInitiator) {
      const dc = pc.createDataChannel('game');
      setupDataChannel(targetId, dc);
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        mqttClient?.publish(`poker/${roomId}/signal/${targetId}`, JSON.stringify({ fromId: clientId, sdp: offer }));
      });
    } else {
      pc.ondatachannel = (event) => setupDataChannel(targetId, event.channel);
    }

    return pc;
  };

  const setupDataChannel = (targetId: string, dc: RTCDataChannel) => {
    dataChannels.current[targetId] = dc;
    dc.onmessage = (e) => handleMessage(targetId, JSON.parse(e.data));
    dc.onopen = () => console.log(`DataChannel to ${targetId} opened`);
    dc.onclose = () => {
      delete dataChannels.current[targetId];
      delete peerConnections.current[targetId];
    };
  };

  const createRoom = (roomName: string, gameType: GameType, hostName: string, hostAvatar: string) => {
    const rId = Math.random().toString(36).substring(2, 7).toUpperCase();
    setRoomId(rId);
    setIsHost(true);
    
    const initialState: GameState = {
      roomId: rId,
      roomName,
      gameType,
      isPowerMode: false,
      status: 'LOBBY',
      players: [{
        id: clientId,
        name: hostName,
        avatar: hostAvatar,
        chips: 10000,
        mp: 100,
        cards: [],
        isReady: true,
        isBot: false,
        isHost: true
      }],
      activePlayerIndex: -1,
      deck: [],
      chatHistory: [],
      creatorId: clientId,
      currentRoundPassCount: 0,
      communityCards: [],
      currentStep: 0,
      pot: 0,
      currentHighBet: 0,
      dealerIndex: -1,
      smallBlind: 100,
      bigBlind: 200,
      winnerIds: []
    };
    
    setGameState(initialState);
    setupSignaling(rId, 'host');
  };

  const joinRoom = (rId: string, playerName: string, playerAvatar: string) => {
    setRoomId(rId);
    setIsHost(false);
    setupSignaling(rId, 'guest');
  };

  const startGame = () => {
    if (!isHost || !gameState) return;
    const newState = { ...gameState };
    if (newState.gameType === GameType.BIG_TWO) initBigTwo(newState);
    else if (newState.gameType === GameType.TEXAS_HOLDEM) initTexasHoldem(newState);
    else if (newState.gameType === GameType.SHOW_HAND) initShowHand(newState);
    broadcastState(newState);
  };

  const performAction = (type: string, payload: any) => {
    if (isHost) {
      handleMessage(clientId, { type, payload });
    } else {
      sendToHost({ type, payload });
    }
  };

  return {
    gameState,
    isHost,
    roomId,
    connectionStatus,
    createRoom,
    joinRoom,
    startGame,
    performAction
  };
}
