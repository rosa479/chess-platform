import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const AnalysisContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: ${props => props.theme.colors.white};
  padding: 1rem 2rem;
  border-radius: 1rem;
  box-shadow: ${props => props.theme.shadows.medium};
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.primary};
  font-size: 1.5rem;
  font-weight: 700;
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(motion.div)`
  background: ${props => props.theme.colors.white};
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: ${props => props.theme.shadows.medium};
`;

const CardTitle = styled.h2`
  color: ${props => props.theme.colors.primary};
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
  font-weight: 600;
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
  margin: 0 auto 2rem;
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    width: 300px;
    height: 300px;
  }
`;

const Square = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.isLight ? props.theme.colors.boardLight : props.theme.colors.boardDark};
  cursor: pointer;
  position: relative;
  
  &.highlighted {
    background-color: rgba(255, 255, 0, 0.4) !important;
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
`;

const Piece = styled.div`
  font-size: 2.5rem;
  cursor: pointer;
  user-select: none;
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 2rem;
  }
`;

const AnalysisInfo = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const Evaluation = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  margin-bottom: 1rem;
`;

const BestMove = styled.div`
  font-size: 1.125rem;
  color: ${props => props.theme.colors.dark};
  margin-bottom: 1rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: ${props => props.theme.colors.dark};
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid ${props => props.theme.colors.light};
  border-radius: 0.5rem;
  font-size: 1rem;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.secondary};
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 2px solid ${props => props.theme.colors.light};
  border-radius: 0.5rem;
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.secondary};
  }
`;

const Button = styled(motion.button)`
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
  
  &:disabled {
    background: ${props => props.theme.colors.light};
    cursor: not-allowed;
  }
`;

const AnalysisResults = styled.div`
  margin-top: 2rem;
`;

const MoveList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
`;

const MoveItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: ${props => props.theme.colors.light};
  border-radius: 0.25rem;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: ${props => props.theme.colors.white};
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const PIECE_SYMBOLS = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

function AnalysisBoard() {
  const { user } = useAuth();
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [pgn, setPgn] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);

  const analyzePosition = async () => {
    if (!fen.trim()) {
      toast.error('Please enter a valid FEN');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3011/analyze/position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fen: fen.trim(),
          depth: 15,
          multipv: 3
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
        toast.success('Analysis completed');
      } else {
        toast.error('Failed to analyze position');
      }
    } catch (error) {
      console.error('Error analyzing position:', error);
      toast.error('Failed to analyze position');
    } finally {
      setLoading(false);
    }
  };

  const analyzeGame = async () => {
    if (!pgn.trim()) {
      toast.error('Please enter a valid PGN');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3011/analyze/game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          pgn: pgn.trim(),
          depth: 15
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
        toast.success('Game analysis completed');
      } else {
        toast.error('Failed to analyze game');
      }
    } catch (error) {
      console.error('Error analyzing game:', error);
      toast.error('Failed to analyze game');
    } finally {
      setLoading(false);
    }
  };

  const importFEN = async () => {
    if (!fen.trim()) {
      toast.error('Please enter a valid FEN');
      return;
    }

    try {
      const response = await fetch('http://localhost:3011/import/fen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fen: fen.trim(),
          userId: user.userId
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('FEN imported successfully');
        setAnalysis(null);
      } else {
        toast.error('Failed to import FEN');
      }
    } catch (error) {
      console.error('Error importing FEN:', error);
      toast.error('Failed to import FEN');
    }
  };

  const importPGN = async () => {
    if (!pgn.trim()) {
      toast.error('Please enter a valid PGN');
      return;
    }

    try {
      const response = await fetch('http://localhost:3011/import/pgn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          pgn: pgn.trim(),
          userId: user.userId
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('PGN imported successfully');
        setAnalysis(null);
      } else {
        toast.error('Failed to import PGN');
      }
    } catch (error) {
      console.error('Error importing PGN:', error);
      toast.error('Failed to import PGN');
    }
  };

  const renderBoard = () => {
    const chess = new (require('chess.js'))();
    chess.load(fen);
    const board = chess.board();
    
    const squares = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const squareIndex = (7 - rank) * 8 + file;
        const square = String.fromCharCode(97 + file) + (rank + 1);
        const piece = board[rank][file];
        const isLight = (rank + file) % 2 === 0;
        
        squares.push(
          <Square
            key={square}
            isLight={isLight}
            onClick={() => setSelectedSquare(square)}
          >
            {piece && (
              <Piece>
                {PIECE_SYMBOLS[piece.type]}
              </Piece>
            )}
          </Square>
        );
      }
    }
    
    return squares;
  };

  const formatEvaluation = (evaluation) => {
    if (evaluation > 1000) return 'M' + Math.floor((10000 - evaluation) / 2);
    if (evaluation < -1000) return 'M' + Math.floor((10000 + evaluation) / 2);
    return (evaluation > 0 ? '+' : '') + evaluation.toFixed(2);
  };

  return (
    <AnalysisContainer>
      <Header>
        <Title>Analysis Board</Title>
      </Header>

      <MainContent>
        <Card
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <CardTitle>Chess Position</CardTitle>
          
          <Board>
            {renderBoard()}
          </Board>
          
          <AnalysisInfo>
            {analysis && (
              <>
                <Evaluation>
                  Evaluation: {formatEvaluation(analysis.evaluation)}
                </Evaluation>
                {analysis.bestMove && (
                  <BestMove>
                    Best Move: {analysis.bestMove.san}
                  </BestMove>
                )}
              </>
            )}
          </AnalysisInfo>
        </Card>

        <Card
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <CardTitle>Import & Analyze</CardTitle>
          
          <Form>
            <InputGroup>
              <Label htmlFor="fen">FEN Position</Label>
              <Input
                type="text"
                id="fen"
                value={fen}
                onChange={(e) => setFen(e.target.value)}
                placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              />
            </InputGroup>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button
                onClick={importFEN}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Import FEN
              </Button>
              <Button
                onClick={analyzePosition}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? <LoadingSpinner /> : 'Analyze Position'}
              </Button>
            </div>
            
            <InputGroup>
              <Label htmlFor="pgn">PGN Game</Label>
              <TextArea
                id="pgn"
                value={pgn}
                onChange={(e) => setPgn(e.target.value)}
                placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7"
              />
            </InputGroup>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button
                onClick={importPGN}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Import PGN
              </Button>
              <Button
                onClick={analyzeGame}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? <LoadingSpinner /> : 'Analyze Game'}
              </Button>
            </div>
          </Form>
        </Card>
      </MainContent>

      {analysis && analysis.moveAnalysis && (
        <Card
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ marginTop: '2rem' }}
        >
          <CardTitle>Game Analysis</CardTitle>
          
          <AnalysisResults>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>Accuracy: {analysis.gameAnalysis.accuracy.toFixed(1)}%</div>
              <div>Mistakes: {analysis.gameAnalysis.mistakes}</div>
              <div>Blunders: {analysis.gameAnalysis.blunders}</div>
              <div>Best Moves: {analysis.gameAnalysis.bestMoves}</div>
            </div>
            
            <MoveList>
              {analysis.moveAnalysis.map((move, index) => (
                <MoveItem key={index}>
                  <span>{move.moveNumber}. {move.move}</span>
                  <span>Eval: {formatEvaluation(move.evaluation)}</span>
                  <span>{move.isBestMove ? '✓' : '✗'}</span>
                </MoveItem>
              ))}
            </MoveList>
          </AnalysisResults>
        </Card>
      )}
    </AnalysisContainer>
  );
}

export default AnalysisBoard;
