import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const SpectateContainer = styled.div`
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

const GameList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const GameItem = styled(motion.div)`
  padding: 1rem;
  border: 2px solid ${props => props.theme.colors.light};
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.theme.colors.secondary};
    transform: translateY(-2px);
  }
`;

const GameInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const Players = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Player = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PlayerName = styled.span`
  font-weight: 600;
  color: ${props => props.theme.colors.dark};
`;

const PlayerRating = styled.span`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.secondary};
`;

const GameDetails = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: ${props => props.theme.colors.dark};
  opacity: 0.8;
`;

const SpectatorsCount = styled.span`
  background: ${props => props.theme.colors.warning};
  color: ${props => props.theme.colors.white};
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
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

const FilterContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const FilterButton = styled(motion.button)`
  background: ${props => props.active ? props.theme.colors.secondary : props.theme.colors.light};
  color: ${props => props.active ? props.theme.colors.white : props.theme.colors.dark};
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.theme.colors.secondary};
    color: ${props => props.theme.colors.white};
  }
`;

function Spectate() {
  const { user } = useAuth();
  const [ongoingGames, setOngoingGames] = useState([]);
  const [popularGames, setPopularGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOngoingGames();
    fetchPopularGames();
  }, [filter]);

  const fetchOngoingGames = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('timeControl', filter);
      }
      
      const response = await fetch(`http://localhost:3009/games/ongoing?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOngoingGames(data);
      } else {
        toast.error('Failed to fetch ongoing games');
      }
    } catch (error) {
      console.error('Error fetching ongoing games:', error);
      toast.error('Failed to fetch ongoing games');
    } finally {
      setLoading(false);
    }
  };

  const fetchPopularGames = async () => {
    try {
      const response = await fetch('http://localhost:3009/games/popular?limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPopularGames(data);
      }
    } catch (error) {
      console.error('Error fetching popular games:', error);
    }
  };

  const joinSpectating = async (gameId) => {
    try {
      const response = await fetch(`http://localhost:3009/games/${gameId}/spectate/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user.userId
        })
      });

      if (response.ok) {
        toast.success('Joined spectating');
        // Navigate to game room for spectating
        window.open(`/game/${gameId}?spectate=true`, '_blank');
      } else {
        toast.error('Failed to join spectating');
      }
    } catch (error) {
      console.error('Error joining spectating:', error);
      toast.error('Failed to join spectating');
    }
  };

  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimeControlName = (timeControl) => {
    const names = {
      'bullet': 'Bullet',
      'blitz': 'Blitz',
      'rapid': 'Rapid',
      'classical': 'Classical'
    };
    return names[timeControl] || timeControl;
  };

  return (
    <SpectateContainer>
      <Header>
        <Title>Spectate Games</Title>
        <Button
          onClick={() => {
            fetchOngoingGames();
            fetchPopularGames();
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Refresh
        </Button>
      </Header>

      <FilterContainer>
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          All Games
        </FilterButton>
        <FilterButton
          active={filter === 'bullet'}
          onClick={() => setFilter('bullet')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Bullet
        </FilterButton>
        <FilterButton
          active={filter === 'blitz'}
          onClick={() => setFilter('blitz')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Blitz
        </FilterButton>
        <FilterButton
          active={filter === 'rapid'}
          onClick={() => setFilter('rapid')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Rapid
        </FilterButton>
        <FilterButton
          active={filter === 'classical'}
          onClick={() => setFilter('classical')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Classical
        </FilterButton>
      </FilterContainer>

      <MainContent>
        <Card
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <CardTitle>Ongoing Games</CardTitle>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <LoadingSpinner />
            </div>
          ) : (
            <GameList>
              {ongoingGames.map((game) => (
                <GameItem
                  key={game.gameId}
                  onClick={() => joinSpectating(game.gameId)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <GameInfo>
                    <Players>
                      <Player>
                        <PlayerName>{game.whitePlayer.username}</PlayerName>
                        <PlayerRating>({game.whitePlayer.rating})</PlayerRating>
                      </Player>
                      <span>vs</span>
                      <Player>
                        <PlayerName>{game.blackPlayer.username}</PlayerName>
                        <PlayerRating>({game.blackPlayer.rating})</PlayerRating>
                      </Player>
                    </Players>
                    <SpectatorsCount>{game.spectators} 👁️</SpectatorsCount>
                  </GameInfo>
                  
                  <GameDetails>
                    <span>{getTimeControlName(game.timeControl)}</span>
                    <span>Move {game.moveCount}</span>
                    <span>{game.currentTurn === 'white' ? 'White to move' : 'Black to move'}</span>
                  </GameDetails>
                </GameItem>
              ))}
            </GameList>
          )}
        </Card>

        <Card
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <CardTitle>Popular Games</CardTitle>
          
          <GameList>
            {popularGames.map((game) => (
              <GameItem
                key={game.gameId}
                onClick={() => joinSpectating(game.gameId)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <GameInfo>
                  <Players>
                    <Player>
                      <PlayerName>Player 1</PlayerName>
                      <PlayerRating>(1200)</PlayerRating>
                    </Player>
                    <span>vs</span>
                    <Player>
                      <PlayerName>Player 2</PlayerName>
                      <PlayerRating>(1200)</PlayerRating>
                    </Player>
                  </Players>
                  <SpectatorsCount>{game.spectators} 👁️</SpectatorsCount>
                </GameInfo>
                
                <GameDetails>
                  <span>{getTimeControlName(game.timeControl)}</span>
                  <span>Move {game.moveCount}</span>
                </GameDetails>
              </GameItem>
            ))}
          </GameList>
        </Card>
      </MainContent>
    </SpectateContainer>
  );
}

export default Spectate;
