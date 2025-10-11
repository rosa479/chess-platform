import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useGame } from '../../contexts/GameContext';

const BoardContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: ${props => props.theme.colors.white};
  border-radius: 1rem;
  box-shadow: ${props => props.theme.shadows.medium};
`;

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  width: 400px;
  height: 400px;
  border: 2px solid ${props => props.theme.colors.dark};
  border-radius: 0.5rem;
  overflow: hidden;
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 300px;
    height: 300px;
  }
`;

const Square = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background-color: ${props => props.isLight ? props.theme.colors.boardLight : props.theme.colors.boardDark};
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  
  &.highlighted {
    background-color: rgba(255, 255, 0, 0.4) !important;
  }
  
  &.last-move {
    background-color: rgba(255, 255, 0, 0.2) !important;
  }
  
  &.check {
    background-color: rgba(255, 0, 0, 0.3) !important;
  }
  
  &.selected {
    background-color: rgba(0, 123, 255, 0.3) !important;
  }
  
  &.possible-move {
    &::after {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      background-color: rgba(0, 0, 0, 0.3);
      border-radius: 50%;
    }
  }
  
  &.possible-capture {
    &::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      border: 3px solid rgba(255, 0, 0, 0.5);
      border-radius: 0;
    }
  }
`;

const Piece = styled(motion.div)`
  font-size: 2.5rem;
  cursor: pointer;
  user-select: none;
  z-index: 10;
  
  @media (max-width: ${props => props.theme.colors.mobile}) {
    font-size: 2rem;
  }
  
  &:hover {
    transform: scale(1.1);
  }
`;

const Coordinates = styled.div`
  position: absolute;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => props.isLight ? props.theme.colors.dark : props.theme.colors.light};
  
  &.file {
    bottom: 2px;
    right: 4px;
  }
  
  &.rank {
    top: 2px;
    left: 4px;
  }
`;

const GameInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 400px;
  padding: 0 1rem;
`;

const PlayerInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const PlayerName = styled.div`
  font-weight: 600;
  color: ${props => props.theme.colors.dark};
`;

const PlayerRating = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.secondary};
`;

const TimeDisplay = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${props => props.isLow ? props.theme.colors.danger : props.theme.colors.dark};
  min-width: 60px;
  text-align: center;
`;

const TurnIndicator = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.secondary};
  font-weight: 600;
`;

const PIECE_SYMBOLS = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function ChessBoard() {
  const { game, gameState, makeMove, isMyTurn, timeLeft, lastMove } = useGame();
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [boardOrientation, setBoardOrientation] = useState('white');

  // Update board orientation based on player color
  useEffect(() => {
    if (gameState) {
      const isWhite = gameState.whitePlayerId === gameState.currentPlayerId;
      setBoardOrientation(isWhite ? 'white' : 'black');
    }
  }, [gameState]);

  // Get possible moves for selected piece
  const getPossibleMoves = useCallback((square) => {
    if (!game || !isMyTurn) return [];
    
    const moves = game.moves({ square, verbose: true });
    return moves.map(move => move.to);
  }, [game, isMyTurn]);

  // Handle square click
  const handleSquareClick = (square) => {
    if (!game || !isMyTurn || game.isGameOver()) return;

    const [file, rank] = square.split('');
    const piece = game.get(square);

    // If no piece is selected and clicked square has a piece of current player
    if (!selectedSquare && piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      setPossibleMoves(getPossibleMoves(square));
      return;
    }

    // If a piece is selected
    if (selectedSquare) {
      // If clicking on the same square, deselect
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      // If clicking on own piece, select that piece instead
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        setPossibleMoves(getPossibleMoves(square));
        return;
      }

      // Try to make the move
      const move = game.move({
        from: selectedSquare,
        to: square,
        promotion: 'q' // Default promotion to queen
      });

      if (move) {
        makeMove(move.san);
        setSelectedSquare(null);
        setPossibleMoves([]);
      } else {
        // Invalid move, deselect
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    }
  };

  // Format time display
  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Render the board
  const renderBoard = () => {
    const squares = [];
    const board = game?.board() || [];
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const squareIndex = boardOrientation === 'white' 
          ? (7 - rank) * 8 + file 
          : rank * 8 + (7 - file);
        
        const square = FILES[file] + RANKS[rank];
        const piece = board[rank][file];
        const isLight = (rank + file) % 2 === 0;
        
        // Determine square classes
        const classes = [];
        if (selectedSquare === square) classes.push('selected');
        if (possibleMoves.includes(square)) {
          classes.push(piece ? 'possible-capture' : 'possible-move');
        }
        if (lastMove && (lastMove.from === square || lastMove.to === square)) {
          classes.push('last-move');
        }
        if (game?.inCheck() && piece?.type === 'k' && piece.color === game.turn()) {
          classes.push('check');
        }

        squares.push(
          <Square
            key={square}
            isLight={isLight}
            clickable={isMyTurn && !game?.isGameOver()}
            className={classes.join(' ')}
            onClick={() => handleSquareClick(square)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {piece && (
              <Piece
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {PIECE_SYMBOLS[piece.type]}
              </Piece>
            )}
            
            {/* Coordinates */}
            {file === 0 && (
              <Coordinates className="rank" isLight={isLight}>
                {RANKS[rank]}
              </Coordinates>
            )}
            {rank === 7 && (
              <Coordinates className="file" isLight={isLight}>
                {FILES[file]}
              </Coordinates>
            )}
          </Square>
        );
      }
    }
    
    return squares;
  };

  if (!gameState) {
    return (
      <BoardContainer>
        <div>Loading game...</div>
      </BoardContainer>
    );
  }

  return (
    <BoardContainer>
      <GameInfo>
        <PlayerInfo>
          <PlayerName>Black</PlayerName>
          <PlayerRating>Rating: {gameState.blackRating || 1200}</PlayerRating>
          <TimeDisplay isLow={timeLeft.black < 30000}>
            {formatTime(timeLeft.black)}
          </TimeDisplay>
        </PlayerInfo>
        
        <TurnIndicator>
          {game?.turn() === 'w' ? 'White to move' : 'Black to move'}
        </TurnIndicator>
        
        <PlayerInfo>
          <PlayerName>White</PlayerName>
          <PlayerRating>Rating: {gameState.whiteRating || 1200}</PlayerRating>
          <TimeDisplay isLow={timeLeft.white < 30000}>
            {formatTime(timeLeft.white)}
          </TimeDisplay>
        </PlayerInfo>
      </GameInfo>

      <Board>
        {renderBoard()}
      </Board>
    </BoardContainer>
  );
}

export default ChessBoard;
