import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useGame } from '../../contexts/GameContext';

const MoveListContainer = styled.div`
  background: ${props => props.theme.colors.white};
  border-radius: 1rem;
  box-shadow: ${props => props.theme.shadows.medium};
  overflow: hidden;
  height: 400px;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  background: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.white};
  padding: 1rem;
  font-weight: 600;
  text-align: center;
`;

const MovesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;

const MoveRow = styled(motion.div)`
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: 0.25rem;
  margin-bottom: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.light};
  }
  
  &.current-move {
    background-color: ${props => props.theme.colors.secondary};
    color: ${props => props.theme.colors.white};
  }
`;

const MoveNumber = styled.span`
  font-weight: 600;
  margin-right: 0.5rem;
  min-width: 30px;
  color: ${props => props.theme.colors.dark};
`;

const WhiteMove = styled.span`
  flex: 1;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  margin-right: 0.5rem;
  background-color: ${props => props.theme.colors.light};
  font-family: 'Courier New', monospace;
`;

const BlackMove = styled.span`
  flex: 1;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  background-color: ${props => props.theme.colors.dark};
  color: ${props => props.theme.colors.white};
  font-family: 'Courier New', monospace;
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${props => props.theme.colors.dark};
  font-style: italic;
`;

const GameResult = styled.div`
  background: ${props => props.theme.colors.success};
  color: ${props => props.theme.colors.white};
  padding: 0.75rem;
  text-align: center;
  font-weight: 600;
  margin-top: 0.5rem;
  border-radius: 0.5rem;
`;

function MoveList() {
  const { game, gameState, lastMove } = useGame();
  const [moves, setMoves] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);

  // Update moves when game state changes
  useEffect(() => {
    if (game) {
      const gameMoves = game.history({ verbose: true });
      setMoves(gameMoves);
      setCurrentMoveIndex(gameMoves.length - 1);
    }
  }, [game, lastMove]);

  // Handle move click to navigate to specific position
  const handleMoveClick = (index) => {
    if (!game) return;
    
    // Create a new game instance and navigate to the clicked move
    const tempGame = game.clone();
    const movesToReplay = moves.slice(0, index + 1);
    
    // Reset to starting position
    tempGame.reset();
    
    // Replay moves up to the clicked move
    movesToReplay.forEach(move => {
      tempGame.move(move);
    });
    
    setCurrentMoveIndex(index);
    // TODO: Update board position (this would require additional context/props)
  };

  // Format move notation
  const formatMove = (move) => {
    let notation = move.san;
    
    // Add check/checkmate symbols
    if (move.flags.includes('+')) {
      notation += '+';
    }
    if (move.flags.includes('#')) {
      notation += '#';
    }
    
    return notation;
  };

  // Get game result
  const getGameResult = () => {
    if (!game || !game.isGameOver()) return null;
    
    if (game.isCheckmate()) {
      return game.turn() === 'w' ? '0-1' : '1-0';
    }
    
    if (game.isStalemate() || game.isDraw()) {
      return '1/2-1/2';
    }
    
    return null;
  };

  const gameResult = getGameResult();

  return (
    <MoveListContainer>
      <Header>Move List</Header>
      
      <MovesContainer>
        {moves.length === 0 ? (
          <EmptyState>No moves yet</EmptyState>
        ) : (
          <>
            {Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => {
              const whiteMove = moves[i * 2];
              const blackMove = moves[i * 2 + 1];
              const moveNumber = i + 1;
              
              return (
                <MoveRow
                  key={i}
                  className={currentMoveIndex >= i * 2 && currentMoveIndex < (i + 1) * 2 ? 'current-move' : ''}
                  onClick={() => handleMoveClick(i * 2 + (blackMove ? 1 : 0))}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                >
                  <MoveNumber>{moveNumber}.</MoveNumber>
                  
                  <WhiteMove>
                    {whiteMove ? formatMove(whiteMove) : ''}
                  </WhiteMove>
                  
                  {blackMove && (
                    <BlackMove>
                      {formatMove(blackMove)}
                    </BlackMove>
                  )}
                </MoveRow>
              );
            })}
            
            {gameResult && (
              <GameResult>
                {gameResult}
              </GameResult>
            )}
          </>
        )}
      </MovesContainer>
    </MoveListContainer>
  );
}

export default MoveList;
