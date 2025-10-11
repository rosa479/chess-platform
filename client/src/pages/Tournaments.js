import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const TournamentsContainer = styled.div`
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

const CreateButton = styled(motion.button)`
  background: ${props => props.theme.colors.success};
  color: ${props => props.theme.colors.white};
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.theme.colors.primary};
  }
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

const TournamentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TournamentItem = styled(motion.div)`
  padding: 1rem;
  border: 2px solid ${props => props.theme.colors.light};
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.theme.colors.secondary};
    transform: translateY(-2px);
  }
  
  &.joined {
    border-color: ${props => props.theme.colors.success};
    background: rgba(39, 174, 96, 0.1);
  }
`;

const TournamentName = styled.h3`
  color: ${props => props.theme.colors.dark};
  margin-bottom: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
`;

const TournamentInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const TournamentDetails = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.dark};
  opacity: 0.8;
`;

const TournamentStatus = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  
  &.registration {
    background: ${props => props.theme.colors.warning};
    color: ${props => props.theme.colors.white};
  }
  
  &.in_progress {
    background: ${props => props.theme.colors.success};
    color: ${props => props.theme.colors.white};
  }
  
  &.completed {
    background: ${props => props.theme.colors.light};
    color: ${props => props.theme.colors.dark};
  }
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

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid ${props => props.theme.colors.light};
  border-radius: 0.5rem;
  font-size: 1rem;
  
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

function Tournaments() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'swiss',
    timeControl: 'blitz',
    maxParticipants: 32,
    rounds: 5
  });

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3005/tournaments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTournaments(data);
      } else {
        toast.error('Failed to fetch tournaments');
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast.error('Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch('http://localhost:3005/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          createdBy: user.userId
        })
      });

      if (response.ok) {
        const tournament = await response.json();
        setTournaments([tournament, ...tournaments]);
        setShowCreateForm(false);
        setFormData({
          name: '',
          type: 'swiss',
          timeControl: 'blitz',
          maxParticipants: 32,
          rounds: 5
        });
        toast.success('Tournament created successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create tournament');
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast.error('Failed to create tournament');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinTournament = async (tournamentId) => {
    try {
      const response = await fetch(`http://localhost:3005/tournaments/${tournamentId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user.userId,
          username: user.username,
          rating: user.rating
        })
      });

      if (response.ok) {
        toast.success('Joined tournament successfully');
        fetchTournaments();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to join tournament');
      }
    } catch (error) {
      console.error('Error joining tournament:', error);
      toast.error('Failed to join tournament');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'registration': return 'registration';
      case 'in_progress': return 'in_progress';
      case 'completed': return 'completed';
      default: return '';
    }
  };

  const isUserJoined = (tournament) => {
    return tournament.participants?.some(p => p.userId === user.userId);
  };

  return (
    <TournamentsContainer>
      <Header>
        <Title>Tournaments</Title>
        <CreateButton
          onClick={() => setShowCreateForm(!showCreateForm)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Create Tournament
        </CreateButton>
      </Header>

      <MainContent>
        <Card
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <CardTitle>Active Tournaments</CardTitle>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <LoadingSpinner />
            </div>
          ) : (
            <TournamentList>
              {tournaments.map((tournament) => (
                <TournamentItem
                  key={tournament.tournamentId}
                  className={isUserJoined(tournament) ? 'joined' : ''}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <TournamentName>{tournament.name}</TournamentName>
                  <TournamentInfo>
                    <TournamentDetails>
                      {tournament.type.toUpperCase()} • {tournament.timeControl} • {tournament.participants?.length || 0}/{tournament.maxParticipants}
                    </TournamentDetails>
                    <TournamentStatus className={getStatusClass(tournament.status)}>
                      {tournament.status.replace('_', ' ').toUpperCase()}
                    </TournamentStatus>
                  </TournamentInfo>
                  
                  {tournament.status === 'registration' && !isUserJoined(tournament) && (
                    <Button
                      onClick={() => handleJoinTournament(tournament.tournamentId)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Join Tournament
                    </Button>
                  )}
                  
                  {isUserJoined(tournament) && (
                    <div style={{ color: '#27ae60', fontWeight: 600 }}>
                      ✓ Joined
                    </div>
                  )}
                </TournamentItem>
              ))}
            </TournamentList>
          )}
        </Card>

        {showCreateForm && (
          <Card
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <CardTitle>Create Tournament</CardTitle>
            
            <Form onSubmit={handleCreateTournament}>
              <InputGroup>
                <Label htmlFor="name">Tournament Name</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </InputGroup>
              
              <InputGroup>
                <Label htmlFor="type">Tournament Type</Label>
                <Select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                >
                  <option value="swiss">Swiss System</option>
                  <option value="arena">Arena</option>
                </Select>
              </InputGroup>
              
              <InputGroup>
                <Label htmlFor="timeControl">Time Control</Label>
                <Select
                  id="timeControl"
                  name="timeControl"
                  value={formData.timeControl}
                  onChange={handleChange}
                  required
                >
                  <option value="bullet">Bullet (1+0)</option>
                  <option value="blitz">Blitz (5+0)</option>
                  <option value="rapid">Rapid (10+0)</option>
                  <option value="classical">Classical (30+0)</option>
                </Select>
              </InputGroup>
              
              <InputGroup>
                <Label htmlFor="maxParticipants">Max Participants</Label>
                <Input
                  type="number"
                  id="maxParticipants"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleChange}
                  min="2"
                  max="100"
                  required
                />
              </InputGroup>
              
              {formData.type === 'swiss' && (
                <InputGroup>
                  <Label htmlFor="rounds">Number of Rounds</Label>
                  <Input
                    type="number"
                    id="rounds"
                    name="rounds"
                    value={formData.rounds}
                    onChange={handleChange}
                    min="1"
                    max="10"
                    required
                  />
                </InputGroup>
              )}
              
              <Button
                type="submit"
                disabled={creating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {creating ? <LoadingSpinner /> : 'Create Tournament'}
              </Button>
            </Form>
          </Card>
        )}
      </MainContent>
    </TournamentsContainer>
  );
}

export default Tournaments;
