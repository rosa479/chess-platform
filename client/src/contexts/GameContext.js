import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const { user } = useAuth();
  const [game, setGame] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInQueue, setIsInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState(null);
  const [ws, setWs] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ white: 0, black: 0 });
  const [gameResult, setGameResult] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize chess.js instance
  useEffect(() => {
    if (gameState?.fen) {
      const chess = new Chess(gameState.fen);
      setGame(chess);
      setIsMyTurn(
        (chess.turn() === 'w' && gameState.whitePlayerId === user?.userId) ||
        (chess.turn() === 'b' && gameState.blackPlayerId === user?.userId)
      );
      setIsGameOver(chess.isGameOver());
    }
  }, [gameState, user]);

  // WebSocket connection management
  const connectWebSocket = (gameId) => {
    if (!user?.token) return;

    try {
      const wsUrl = `ws://localhost:8080?token=${user.token}&gameId=${gameId}`;
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting... Attempt ${reconnectAttemptsRef.current}`);
            connectWebSocket(gameId);
          }, delay);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error('Connection error occurred');
      };

      setWs(websocket);
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      toast.error('Failed to connect to game server');
    }
  };

  const disconnectWebSocket = () => {
    if (ws) {
      ws.close(1000, 'User disconnected');
      setWs(null);
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    setIsConnected(false);
  };

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'game_state_update':
        setGameState(message.payload);
        break;
        
      case 'move_made':
        setLastMove(message.payload);
        toast.success(`Move: ${message.payload.san}`);
        break;
        
      case 'game_over':
        setGameResult(message.payload);
        setIsGameOver(true);
        toast.success(`Game Over: ${message.payload.winner || 'Draw'}`);
        break;
        
      case 'time_update':
        setTimeLeft(message.payload);
        break;
        
      case 'error':
        toast.error(message.payload.message);
        break;
        
      case 'invalid_move':
        toast.error('Invalid move');
        break;
        
      case 'not_your_turn':
        toast.error('Not your turn');
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  // Send message via WebSocket
  const sendMessage = (type, payload) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    } else {
      toast.error('Not connected to game server');
    }
  };

  // Make a move
  const makeMove = (move) => {
    if (!isMyTurn || isGameOver) {
      toast.error('Cannot make move at this time');
      return;
    }

    sendMessage('move', { move });
  };

  // Join matchmaking queue
  const joinQueue = async (timeControl) => {
    try {
      const response = await fetch('http://localhost:3003/matchmaking/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          userId: user.userId,
          timeControl,
          rating: user.rating
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.gameId) {
          // Match found immediately
          toast.success('Match found!');
          return { success: true, gameId: data.gameId };
        } else {
          // Added to queue
          setIsInQueue(true);
          setQueueStatus({ position: data.position, timeControl });
          toast.success(`Added to queue (Position: ${data.position})`);
          return { success: true, inQueue: true };
        }
      } else {
        toast.error(data.error || 'Failed to join queue');
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Error joining queue:', error);
      toast.error('Failed to join queue');
      return { success: false, error: 'Network error' };
    }
  };

  // Leave matchmaking queue
  const leaveQueue = async () => {
    try {
      const response = await fetch('http://localhost:3003/matchmaking/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          userId: user.userId
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setIsInQueue(false);
        setQueueStatus(null);
        toast.success('Left queue');
        return { success: true };
      } else {
        toast.error(data.error || 'Failed to leave queue');
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Error leaving queue:', error);
      toast.error('Failed to leave queue');
      return { success: false, error: 'Network error' };
    }
  };

  // Get queue status
  const getQueueStatus = async () => {
    if (!isInQueue) return;

    try {
      const response = await fetch(`http://localhost:3003/matchmaking/status/${user.userId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      const data = await response.json();
      
      if (response.ok && data.inQueue) {
        setQueueStatus(data);
      } else {
        setIsInQueue(false);
        setQueueStatus(null);
      }
    } catch (error) {
      console.error('Error getting queue status:', error);
    }
  };

  // Check queue status periodically
  useEffect(() => {
    if (isInQueue) {
      const interval = setInterval(getQueueStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [isInQueue, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, []);

  const value = {
    game,
    gameState,
    isConnected,
    isInQueue,
    queueStatus,
    lastMove,
    timeLeft,
    gameResult,
    isMyTurn,
    isGameOver,
    connectWebSocket,
    disconnectWebSocket,
    makeMove,
    joinQueue,
    leaveQueue,
    sendMessage
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
