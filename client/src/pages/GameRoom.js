import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import ChessBoard from '../components/chessboard/ChessBoard';
import MoveList from '../components/movelist/MoveList';
import Chat from '../components/chat/Chat';
import toast from 'react-hot-toast';

const GameRoomContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  background: ${props => props.theme.colors.white};
  padding: 1rem 2rem;
  border-radius: 1rem;
  box-shadow: ${props => props.theme.shadows.medium};
`;

const BackButton = styled(motion.button)`
  background: ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.white};
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.theme.colors.primary};
  }
`;

const GameInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;

const GameId = styled.div`
  font-weight: 600;
  color: ${props => props.theme.colors.dark};
`;

const ConnectionStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  
  &.connected {
    color: ${props => props.theme.colors.success};
  }
  
  &.disconnected {
    color: ${props => props.theme.colors.danger};
  }
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.connected ? props.theme.colors.success : props.theme.colors.danger};
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 1rem;
  max-width: 1400px;
  margin: 0 auto;
  
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const GameArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const GameOverModal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const GameOverCard = styled(motion.div)`
  background: ${props => props.theme.colors.white};
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  max-width: 400px;
  width: 90%;
`;

const GameOverTitle = styled.h2`
  color: ${props => props.theme.colors.primary};
  margin-bottom: 1rem;
  font-size: 1.5rem;
`;

const GameOverMessage = styled.div`
  color: ${props => props.theme.colors.dark};
  margin-bottom: 2rem;
  font-size: 1.125rem;
`;

const GameOverButton = styled(motion.button)`
  background: ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.white};
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin: 0 0.5rem;
  
  &:hover {
    background: ${props => props.theme.colors.primary};
  }
`;

function GameRoom() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    gameState, 
    isConnected, 
    isGameOver, 
    gameResult, 
    connectWebSocket, 
    disconnectWebSocket 
  } = useGame();

  // Connect to WebSocket when component mounts
  useEffect(() => {
    if (gameId && user?.token) {
      connectWebSocket(gameId);
    }

    return () => {
      disconnectWebSocket();
    };
  }, [gameId, user?.token, connectWebSocket, disconnectWebSocket]);

  // Handle game over
  useEffect(() => {
    if (isGameOver && gameResult) {
      toast.success(`Game Over: ${gameResult.winner || 'Draw'} wins!`);
    }
  }, [isGameOver, gameResult]);

  const handleBackToDashboard = () => {
    disconnectWebSocket();
    navigate('/dashboard');
  };

  const handlePlayAgain = () => {
    disconnectWebSocket();
    navigate('/dashboard');
  };

  const handleAnalyzeGame = () => {
    // TODO: Implement game analysis
    toast.info('Game analysis feature coming soon!');
  };

  if (!gameState) {
    return (
      <GameRoomContainer>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          color: 'white',
          fontSize: '1.5rem'
        }}>
          Loading game...
        </div>
      </GameRoomContainer>
    );
  }

  return (
    <GameRoomContainer>
      <Header>
        <BackButton
          onClick={handleBackToDashboard}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ← Back to Dashboard
        </BackButton>
        
        <GameInfo>
          <GameId>Game: {gameId}</GameId>
          <ConnectionStatus className={isConnected ? 'connected' : 'disconnected'}>
            <StatusDot connected={isConnected} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </ConnectionStatus>
        </GameInfo>
      </Header>

      <MainContent>
        <GameArea>
          <ChessBoard />
        </GameArea>
        
        <Sidebar>
          <MoveList />
          <Chat />
        </Sidebar>
      </MainContent>

      {isGameOver && (
        <GameOverModal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <GameOverCard
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <GameOverTitle>Game Over</GameOverTitle>
            <GameOverMessage>
              {gameResult?.winner 
                ? `${gameResult.winner === 'white' ? 'White' : 'Black'} wins by ${gameResult.reason}!`
                : 'The game ended in a draw!'
              }
            </GameOverMessage>
            <div>
              <GameOverButton
                onClick={handlePlayAgain}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Play Again
              </GameOverButton>
              <GameOverButton
                onClick={handleAnalyzeGame}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Analyze Game
              </GameOverButton>
            </div>
          </GameOverCard>
        </GameOverModal>
      )}
    </GameRoomContainer>
  );
}

export default GameRoom;
