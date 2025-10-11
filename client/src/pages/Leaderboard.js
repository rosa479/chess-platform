import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const LeaderboardContainer = styled.div`
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

const Title = styled.h1`
  color: ${props => props.theme.colors.primary};
  font-size: 1.5rem;
  font-weight: 700;
`;

const MainContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const LeaderboardCard = styled(motion.div)`
  background: ${props => props.theme.colors.white};
  border-radius: 1rem;
  box-shadow: ${props => props.theme.shadows.medium};
  overflow: hidden;
`;

const LeaderboardHeader = styled.div`
  background: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.white};
  padding: 1.5rem;
  text-align: center;
`;

const LeaderboardTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

const LeaderboardSubtitle = styled.p`
  opacity: 0.9;
  font-size: 0.875rem;
`;

const LeaderboardList = styled.div`
  padding: 1rem;
`;

const LeaderboardItem = styled(motion.div)`
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.light};
  }
  
  &.current-user {
    background-color: ${props => props.theme.colors.secondary};
    color: ${props => props.theme.colors.white};
  }
`;

const Rank = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  min-width: 50px;
  text-align: center;
  
  &.top-3 {
    color: ${props => props.theme.colors.warning};
  }
`;

const UserInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-left: 1rem;
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.theme.colors.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.colors.white};
  font-weight: 700;
  font-size: 1.125rem;
`;

const UserDetails = styled.div`
  flex: 1;
`;

const Username = styled.div`
  font-weight: 600;
  font-size: 1rem;
`;

const UserStats = styled.div`
  font-size: 0.875rem;
  opacity: 0.8;
  margin-top: 0.25rem;
`;

const Rating = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${props => props.theme.colors.primary};
  min-width: 80px;
  text-align: right;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.5rem;
  color: ${props => props.theme.colors.dark};
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.colors.danger};
  font-size: 1.125rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${props => props.theme.colors.dark};
  font-style: italic;
`;

function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/leaderboard?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      } else {
        setError('Failed to load leaderboard');
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank;
    }
  };

  const getInitials = (username) => {
    return username.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <LeaderboardContainer>
        <Header>
          <BackButton
            onClick={() => window.history.back()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ← Back
          </BackButton>
          <Title>Leaderboard</Title>
          <div></div>
        </Header>
        
        <MainContent>
          <LeaderboardCard>
            <LoadingSpinner>Loading leaderboard...</LoadingSpinner>
          </LeaderboardCard>
        </MainContent>
      </LeaderboardContainer>
    );
  }

  if (error) {
    return (
      <LeaderboardContainer>
        <Header>
          <BackButton
            onClick={() => window.history.back()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ← Back
          </BackButton>
          <Title>Leaderboard</Title>
          <div></div>
        </Header>
        
        <MainContent>
          <LeaderboardCard>
            <ErrorMessage>{error}</ErrorMessage>
          </LeaderboardCard>
        </MainContent>
      </LeaderboardContainer>
    );
  }

  return (
    <LeaderboardContainer>
      <Header>
        <BackButton
          onClick={() => window.history.back()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          ← Back
        </BackButton>
        <Title>Leaderboard</Title>
        <div></div>
      </Header>

      <MainContent>
        <LeaderboardCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <LeaderboardHeader>
            <LeaderboardTitle>Top Players</LeaderboardTitle>
            <LeaderboardSubtitle>Ranked by rating</LeaderboardSubtitle>
          </LeaderboardHeader>
          
          <LeaderboardList>
            {leaderboard.length === 0 ? (
              <EmptyState>No players found</EmptyState>
            ) : (
              leaderboard.map((player, index) => {
                const rank = index + 1;
                const isCurrentUser = player.userId === user?.userId;
                
                return (
                  <LeaderboardItem
                    key={player.userId}
                    className={isCurrentUser ? 'current-user' : ''}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Rank className={rank <= 3 ? 'top-3' : ''}>
                      {getRankIcon(rank)}
                    </Rank>
                    
                    <UserInfo>
                      <Avatar>
                        {getInitials(player.username)}
                      </Avatar>
                      
                      <UserDetails>
                        <Username>{player.username}</Username>
                        <UserStats>
                          {player.gamesPlayed} games • {player.gamesWon} wins • 
                          {player.gamesPlayed > 0 
                            ? Math.round((player.gamesWon / player.gamesPlayed) * 100)
                            : 0}% win rate
                        </UserStats>
                      </UserDetails>
                    </UserInfo>
                    
                    <Rating>{player.rating}</Rating>
                  </LeaderboardItem>
                );
              })
            )}
          </LeaderboardList>
        </LeaderboardCard>
      </MainContent>
    </LeaderboardContainer>
  );
}

export default Leaderboard;
