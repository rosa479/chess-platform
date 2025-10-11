import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import toast from 'react-hot-toast';

// Icons (using emoji for simplicity)
const Icons = {
  PLAY: '♟️',
  PUZZLES: '🧩',
  LEARN: '📚',
  TOURNAMENTS: '🏆',
  SPECTATE: '👁️',
  ANALYSIS: '🔍',
  PROFILE: '👤',
  LEADERBOARD: '📊'
};

const DashboardContainer = styled.div`
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

const Logo = styled.h1`
  color: ${props => props.theme.colors.primary};
  font-size: 1.5rem;
  font-weight: 700;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const UserDetails = styled.div`
  text-align: right;
`;

const Username = styled.div`
  font-weight: 600;
  color: ${props => props.theme.colors.dark};
`;

const Rating = styled.div`
  color: ${props => props.theme.colors.secondary};
  font-size: 0.875rem;
`;

const Button = styled(motion.button)`
  background: ${props => props.theme.colors.danger};
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

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const NavigationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const NavCard = styled(motion.div)`
  background: ${props => props.theme.colors.white};
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: ${props => props.theme.shadows.medium};
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: ${props => props.theme.shadows.large};
  }
`;

const NavIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const NavTitle = styled.h3`
  color: ${props => props.theme.colors.primary};
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
`;

const NavDescription = styled.p`
  color: ${props => props.theme.colors.dark};
  opacity: 0.8;
  font-size: 0.875rem;
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

const TimeControlGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const TimeControlButton = styled(motion.button)`
  background: ${props => props.selected ? props.theme.colors.secondary : props.theme.colors.light};
  color: ${props => props.selected ? props.theme.colors.white : props.theme.colors.dark};
  border: 2px solid ${props => props.selected ? props.theme.colors.secondary : props.theme.colors.light};
  padding: 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.theme.colors.secondary};
    transform: translateY(-2px);
  }
`;

const PlayButton = styled(motion.button)`
  background: ${props => props.theme.colors.success};
  color: ${props => props.theme.colors.white};
  border: none;
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  
  &:hover {
    background: ${props => props.theme.colors.primary};
  }
  
  &:disabled {
    background: ${props => props.theme.colors.light};
    cursor: not-allowed;
  }
`;

const QueueStatus = styled.div`
  background: ${props => props.theme.colors.warning};
  color: ${props => props.theme.colors.white};
  padding: 1rem;
  border-radius: 0.5rem;
  text-align: center;
  margin-bottom: 1rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
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

const TIME_CONTROLS = [
  { id: 'bullet', name: 'Bullet', time: '1+0' },
  { id: 'blitz', name: 'Blitz', time: '5+0' },
  { id: 'rapid', name: 'Rapid', time: '10+0' },
  { id: 'classical', name: 'Classical', time: '30+0' },
  { id: 'bullet_increment', name: 'Bullet+', time: '2+1' },
  { id: 'blitz_increment', name: 'Blitz+', time: '5+2' },
  { id: 'rapid_increment', name: 'Rapid+', time: '10+5' }
];

function Dashboard() {
  const { user, logout } = useAuth();
  const { joinQueue, leaveQueue, isInQueue, queueStatus } = useGame();
  const navigate = useNavigate();
  
  const [selectedTimeControl, setSelectedTimeControl] = useState('blitz');
  const [isJoining, setIsJoining] = useState(false);

  const handlePlay = async () => {
    setIsJoining(true);
    
    if (isInQueue) {
      const result = await leaveQueue();
      if (result.success) {
        setIsJoining(false);
      }
    } else {
      const result = await joinQueue(selectedTimeControl);
      if (result.success && result.gameId) {
        navigate(`/game/${result.gameId}`);
      }
      setIsJoining(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <DashboardContainer>
      <Header>
        <Logo>Chess Platform</Logo>
        <UserInfo>
          <UserDetails>
            <Username>{user?.username}</Username>
            <Rating>Rating: {user?.rating}</Rating>
          </UserDetails>
          <Button
            onClick={handleLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Logout
          </Button>
        </UserInfo>
      </Header>

      <NavigationGrid>
        <NavCard
          onClick={() => navigate('/puzzles')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <NavIcon>{Icons.PUZZLES}</NavIcon>
          <NavTitle>Puzzles</NavTitle>
          <NavDescription>Solve tactical puzzles and improve your game</NavDescription>
        </NavCard>
        
        <NavCard
          onClick={() => navigate('/learning')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <NavIcon>{Icons.LEARN}</NavIcon>
          <NavTitle>Learn</NavTitle>
          <NavDescription>Practice and watch video lessons</NavDescription>
        </NavCard>
        
        <NavCard
          onClick={() => navigate('/tournaments')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <NavIcon>{Icons.TOURNAMENTS}</NavIcon>
          <NavTitle>Tournaments</NavTitle>
          <NavDescription>Join Swiss and Arena tournaments</NavDescription>
        </NavCard>
        
        <NavCard
          onClick={() => navigate('/spectate')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <NavIcon>{Icons.SPECTATE}</NavIcon>
          <NavTitle>Spectate</NavTitle>
          <NavDescription>Watch ongoing games</NavDescription>
        </NavCard>
        
        <NavCard
          onClick={() => navigate('/analysis')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <NavIcon>{Icons.ANALYSIS}</NavIcon>
          <NavTitle>Analysis</NavTitle>
          <NavDescription>Analyze positions with Stockfish</NavDescription>
        </NavCard>
        
        <NavCard
          onClick={() => navigate('/leaderboard')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <NavIcon>{Icons.LEADERBOARD}</NavIcon>
          <NavTitle>Leaderboard</NavTitle>
          <NavDescription>View top players and rankings</NavDescription>
        </NavCard>
      </NavigationGrid>

      <MainContent>
        <Card
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <CardTitle>Play Chess</CardTitle>
          
          {isInQueue && queueStatus && (
            <QueueStatus>
              In Queue - Position: {queueStatus.position} | 
              Wait Time: {Math.floor(queueStatus.waitTime / 1000)}s
            </QueueStatus>
          )}
          
          <TimeControlGrid>
            {TIME_CONTROLS.map((control) => (
              <TimeControlButton
                key={control.id}
                selected={selectedTimeControl === control.id}
                onClick={() => setSelectedTimeControl(control.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div>{control.name}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  {control.time}
                </div>
              </TimeControlButton>
            ))}
          </TimeControlGrid>
          
          <PlayButton
            onClick={handlePlay}
            disabled={isJoining}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isJoining ? (
              <LoadingSpinner />
            ) : (
              isInQueue ? 'Leave Queue' : 'Find Game'
            )}
          </PlayButton>
        </Card>

        <Card
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <CardTitle>Your Stats</CardTitle>
          
          <StatsGrid>
            <StatCard>
              <StatValue>{user?.rating || 1200}</StatValue>
              <StatLabel>Rating</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{user?.gamesPlayed || 0}</StatValue>
              <StatLabel>Games Played</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>
                {user?.gamesPlayed > 0 
                  ? Math.round((user?.gamesWon || 0) / user?.gamesPlayed * 100)
                  : 0}%
              </StatValue>
              <StatLabel>Win Rate</StatLabel>
            </StatCard>
          </StatsGrid>
        </Card>
      </MainContent>
    </DashboardContainer>
  );
}

export default Dashboard;
