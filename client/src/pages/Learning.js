import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const LearningContainer = styled.div`
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

const TopicList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TopicItem = styled(motion.div)`
  padding: 1rem;
  border: 2px solid ${props => props.theme.colors.light};
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${props => props.theme.colors.secondary};
    transform: translateY(-2px);
  }
  
  &.selected {
    border-color: ${props => props.theme.colors.secondary};
    background: rgba(52, 152, 219, 0.1);
  }
`;

const TopicName = styled.h3`
  color: ${props => props.theme.colors.dark};
  margin-bottom: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
`;

const TopicDescription = styled.p`
  color: ${props => props.theme.colors.dark};
  opacity: 0.8;
  margin-bottom: 0.5rem;
`;

const TopicDifficulty = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  
  &.beginner {
    background: ${props => props.theme.colors.success};
    color: ${props => props.theme.colors.white};
  }
  
  &.intermediate {
    background: ${props => props.theme.colors.warning};
    color: ${props => props.theme.colors.white};
  }
  
  &.advanced {
    background: ${props => props.theme.colors.danger};
    color: ${props => props.theme.colors.white};
  }
`;

const LessonBoard = styled.div`
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

const LessonInfo = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const LessonTitle = styled.h3`
  color: ${props => props.theme.colors.dark};
  margin-bottom: 1rem;
  font-size: 1.25rem;
  font-weight: 600;
`;

const LessonDescription = styled.p`
  color: ${props => props.theme.colors.dark};
  margin-bottom: 1rem;
  opacity: 0.8;
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

const VideoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const VideoItem = styled(motion.div)`
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

const VideoTitle = styled.h4`
  color: ${props => props.theme.colors.dark};
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
`;

const VideoDescription = styled.p`
  color: ${props => props.theme.colors.dark};
  opacity: 0.8;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
`;

const VideoMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: ${props => props.theme.colors.secondary};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: ${props => props.theme.colors.light};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: ${props => props.theme.colors.success};
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
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

function Learning() {
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [videos, setVideos] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [solving, setSolving] = useState(false);

  useEffect(() => {
    fetchTopics();
    fetchVideos();
    fetchProgress();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3008/topics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTopics(data);
      } else {
        toast.error('Failed to fetch topics');
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error('Failed to fetch topics');
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async () => {
    try {
      const response = await fetch('http://localhost:3008/videos', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVideos(data);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await fetch(`http://localhost:3008/progress/${user.userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProgress(data);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const selectTopic = async (topic) => {
    setSelectedTopic(topic);
    
    try {
      const response = await fetch(`http://localhost:3008/topics/${topic.id}/lessons`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const lessons = await response.json();
        if (lessons.length > 0) {
          setCurrentLesson(lessons[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }
  };

  const solveLesson = async (move) => {
    if (!currentLesson || solving) return;

    setSolving(true);
    const startTime = Date.now();

    try {
      const response = await fetch(`http://localhost:3008/lessons/${currentLesson.id}/solve`, {
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
          toast.success('Correct! Well done!');
          setProgress(result.progress);
          
          // Move to next lesson
          if (selectedTopic) {
            const response = await fetch(`http://localhost:3008/topics/${selectedTopic.id}/lessons`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });

            if (response.ok) {
              const lessons = await response.json();
              const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);
              if (currentIndex < lessons.length - 1) {
                setCurrentLesson(lessons[currentIndex + 1]);
              } else {
                toast.success('Topic completed!');
              }
            }
          }
        } else {
          toast.error('Incorrect move. Try again!');
        }
      } else {
        toast.error('Failed to submit solution');
      }
    } catch (error) {
      console.error('Error solving lesson:', error);
      toast.error('Failed to submit solution');
    } finally {
      setSolving(false);
    }
  };

  const renderBoard = () => {
    if (!currentLesson) return null;

    const chess = new (require('chess.js'))();
    chess.load(currentLesson.fen);
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
            onClick={() => solveLesson(square)}
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

  const getDifficultyClass = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'beginner';
      case 'intermediate': return 'intermediate';
      case 'advanced': return 'advanced';
      default: return '';
    }
  };

  const getTopicProgress = (topicId) => {
    if (!progress || !progress.topicProgress[topicId]) return 0;
    const topicProgress = progress.topicProgress[topicId];
    return (topicProgress.completed / topicProgress.total) * 100;
  };

  return (
    <LearningContainer>
      <Header>
        <Title>Learn Chess</Title>
      </Header>

      <MainContent>
        <Card
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <CardTitle>Practice Topics</CardTitle>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <LoadingSpinner />
            </div>
          ) : (
            <TopicList>
              {topics.map((topic) => (
                <TopicItem
                  key={topic.id}
                  className={selectedTopic?.id === topic.id ? 'selected' : ''}
                  onClick={() => selectTopic(topic)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <TopicName>{topic.name}</TopicName>
                  <TopicDescription>{topic.description}</TopicDescription>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TopicDifficulty className={getDifficultyClass(topic.difficulty)}>
                      {topic.difficulty}
                    </TopicDifficulty>
                    <div style={{ fontSize: '0.75rem', color: '#27ae60' }}>
                      {Math.round(getTopicProgress(topic.id))}% complete
                    </div>
                  </div>
                  <ProgressBar>
                    <ProgressFill progress={getTopicProgress(topic.id)} />
                  </ProgressBar>
                </TopicItem>
              ))}
            </TopicList>
          )}
        </Card>

        <Card
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <CardTitle>
            {currentLesson ? currentLesson.title : 'Select a Topic'}
          </CardTitle>
          
          {currentLesson ? (
            <>
              <LessonBoard>
                {renderBoard()}
              </LessonBoard>
              
              <LessonInfo>
                <LessonTitle>{currentLesson.title}</LessonTitle>
                <LessonDescription>{currentLesson.description}</LessonDescription>
                
                <div>
                  <Button
                    onClick={() => setCurrentLesson(null)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Back to Topics
                  </Button>
                </div>
              </LessonInfo>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              Select a topic from the left to start learning
            </div>
          )}
        </Card>
      </MainContent>

      <Card
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{ marginTop: '2rem' }}
      >
        <CardTitle>Video Lessons</CardTitle>
        
        <VideoList>
          {videos.map((video) => (
            <VideoItem
              key={video.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <VideoTitle>{video.title}</VideoTitle>
              <VideoDescription>{video.description}</VideoDescription>
              <VideoMeta>
                <span>{video.duration}</span>
                <span>{video.difficulty}</span>
              </VideoMeta>
            </VideoItem>
          ))}
        </VideoList>
      </Card>
    </LearningContainer>
  );
}

export default Learning;
