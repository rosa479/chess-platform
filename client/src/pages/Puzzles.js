import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const PuzzlesContainer = styled.div`
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

const PuzzleBoard = styled.div`
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

const PuzzleInfo = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const PuzzleDescription = styled.p`
  font-size: 1.125rem;
  color: ${props => props.theme.colors.dark};
  margin-bottom: 1rem;
`;

const PuzzleRating = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.secondary};
  margin-bottom: 1rem;
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

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  text-align: center;
  padding: 1rem;
  background: ${props => props.theme.colors.light};
  border-radius: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.dark};
  margin-top: 0.25rem;
`;

const RushContainer = styled.div`
  text-align: center;
`;

const RushTimer = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => props.isLow ? props.theme.colors.danger : props.theme.colors.primary};
  margin-bottom: 1rem;
`;

const RushScore = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.colors.success};
  margin-bottom: 1rem;
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

function Puzzles() {
  const { user } = useAuth();
  const [currentPuzzle, setCurrentPuzzle] = useState(null);
  const [puzzleStats, setPuzzleStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [solving, setSolving] = useState(false);
  const [rushMode, setRushMode] = useState(false);
  const [rushSession, setRushSession] = useState(null);
  const [rushTimer, setRushTimer] = useState(300);
  const [rushScore, setRushScore] = useState(0);

  useEffect(() => {
    fetchPuzzleStats();
    fetchRandomPuzzle();
  }, []);

  useEffect(() => {
    let interval;
    if (rushMode && rushTimer > 0) {
      interval = setInterval(() => {
        setRushTimer(prev => prev - 1);
      }, 1000);
    } else if (rushTimer === 0) {
      endRushMode();
    }
    return () => clearInterval(interval);
  }, [rushMode, rushTimer]);

  const fetchPuzzleStats = async () => {
    try {
      const response = await fetch(`http://localhost:3007/puzzles/stats/${user.userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const stats = await response.json();
        setPuzzleStats(stats);
      }
    } catch (error) {
      console.error('Error fetching puzzle stats:', error);
    }
  };

  const fetchRandomPuzzle = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3007/puzzles/random?userRating=${user.rating}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const puzzle = await response.json();
        setCurrentPuzzle(puzzle);
      } else {
        toast.error('Failed to fetch puzzle');
      }
    } catch (error) {
      console.error('Error fetching puzzle:', error);
      toast.error('Failed to fetch puzzle');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyPuzzle = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3007/puzzles/daily', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const puzzle = await response.json();
        setCurrentPuzzle(puzzle);
        toast.success('Daily puzzle loaded!');
      } else {
        toast.error('Failed to fetch daily puzzle');
      }
    } catch (error) {
      console.error('Error fetching daily puzzle:', error);
      toast.error('Failed to fetch daily puzzle');
    } finally {
      setLoading(false);
    }
  };

  const solvePuzzle = async (move) => {
    if (!currentPuzzle || solving) return;

    setSolving(true);
    const startTime = Date.now();

    try {
      const response = await fetch(`http://localhost:3007/puzzles/${currentPuzzle.id}/solve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user.userId,
          move,
          timeSpent: Date.now() - startTime
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.correct) {
          toast.success('Correct! Great job!');
          setPuzzleStats(result.userStats);
          
          if (rushMode) {
            setRushScore(prev => prev + result.ratingChange);
            // Continue to next puzzle in rush mode
            setTimeout(() => {
              fetchRandomPuzzle();
            }, 1000);
          } else {
            // Show next puzzle after delay
            setTimeout(() => {
              fetchRandomPuzzle();
            }, 2000);
          }
        } else {
          toast.error('Incorrect move. Try again!');
        }
      } else {
        toast.error('Failed to submit solution');
      }
    } catch (error) {
      console.error('Error solving puzzle:', error);
      toast.error('Failed to submit solution');
    } finally {
      setSolving(false);
    }
  };

  const startRushMode = async () => {
    try {
      const response = await fetch('http://localhost:3007/puzzles/rush', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user.userId,
          timeLimit: 300
        })
      });

      if (response.ok) {
        const session = await response.json();
        setRushSession(session);
        setRushMode(true);
        setRushTimer(300);
        setRushScore(0);
        setCurrentPuzzle(session.puzzle);
        toast.success('Puzzle Rush started!');
      } else {
        toast.error('Failed to start Puzzle Rush');
      }
    } catch (error) {
      console.error('Error starting Puzzle Rush:', error);
      toast.error('Failed to start Puzzle Rush');
    }
  };

  const endRushMode = () => {
    setRushMode(false);
    setRushSession(null);
    setRushTimer(300);
    toast.success(`Puzzle Rush completed! Final score: ${rushScore}`);
    fetchRandomPuzzle();
  };

  const renderBoard = () => {
    if (!currentPuzzle) return null;

    const chess = new (require('chess.js'))();
    chess.load(currentPuzzle.fen);
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
            onClick={() => solvePuzzle(square)}
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <PuzzlesContainer>
      <Header>
        <Title>Chess Puzzles</Title>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button
            onClick={fetchDailyPuzzle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Daily Puzzle
          </Button>
          <Button
            onClick={startRushMode}
            disabled={rushMode}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Puzzle Rush
          </Button>
        </div>
      </Header>

      <MainContent>
        <Card
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <CardTitle>
            {rushMode ? 'Puzzle Rush' : 'Solve Puzzle'}
          </CardTitle>
          
          {rushMode && (
            <RushContainer>
              <RushTimer isLow={rushTimer < 60}>
                {formatTime(rushTimer)}
              </RushTimer>
              <RushScore>Score: {rushScore}</RushScore>
            </RushContainer>
          )}
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <LoadingSpinner />
            </div>
          ) : currentPuzzle ? (
            <>
              <PuzzleBoard>
                {renderBoard()}
              </PuzzleBoard>
              
              <PuzzleInfo>
                <PuzzleDescription>{currentPuzzle.description}</PuzzleDescription>
                <PuzzleRating>Rating: {currentPuzzle.rating}</PuzzleRating>
                
                {!rushMode && (
                  <div>
                    <Button
                      onClick={fetchRandomPuzzle}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Next Puzzle
                    </Button>
                  </div>
                )}
              </PuzzleInfo>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              No puzzle available
            </div>
          )}
        </Card>

        <Card
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <CardTitle>Your Puzzle Stats</CardTitle>
          
          {puzzleStats ? (
            <StatsGrid>
              <StatCard>
                <StatValue>{puzzleStats.puzzleRating}</StatValue>
                <StatLabel>Puzzle Rating</StatLabel>
              </StatCard>
              
              <StatCard>
                <StatValue>{puzzleStats.puzzlesSolved}</StatValue>
                <StatLabel>Puzzles Solved</StatLabel>
              </StatCard>
              
              <StatCard>
                <StatValue>{puzzleStats.streak}</StatValue>
                <StatLabel>Current Streak</StatLabel>
              </StatCard>
              
              <StatCard>
                <StatValue>{puzzleStats.bestStreak}</StatValue>
                <StatLabel>Best Streak</StatLabel>
              </StatCard>
            </StatsGrid>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <LoadingSpinner />
            </div>
          )}
          
          <div style={{ textAlign: 'center' }}>
            <Button
              onClick={fetchPuzzleStats}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Refresh Stats
            </Button>
          </div>
        </Card>
      </MainContent>
    </PuzzlesContainer>
  );
}

export default Puzzles;
