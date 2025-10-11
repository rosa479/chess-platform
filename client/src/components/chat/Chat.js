import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';

const ChatContainer = styled.div`
  background: ${props => props.theme.colors.white};
  border-radius: 1rem;
  box-shadow: ${props => props.theme.shadows.medium};
  overflow: hidden;
  height: 300px;
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

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Message = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  
  &.own-message {
    align-items: flex-end;
  }
  
  &.system-message {
    align-items: center;
  }
`;

const MessageBubble = styled.div`
  max-width: 80%;
  padding: 0.5rem 0.75rem;
  border-radius: 1rem;
  word-wrap: break-word;
  
  &.own-message {
    background: ${props => props.theme.colors.secondary};
    color: ${props => props.theme.colors.white};
    border-bottom-right-radius: 0.25rem;
  }
  
  &.other-message {
    background: ${props => props.theme.colors.light};
    color: ${props => props.theme.colors.dark};
    border-bottom-left-radius: 0.25rem;
  }
  
  &.system-message {
    background: ${props => props.theme.colors.warning};
    color: ${props => props.theme.colors.white};
    font-style: italic;
    text-align: center;
  }
`;

const MessageText = styled.div`
  font-size: 0.875rem;
  line-height: 1.4;
`;

const MessageInfo = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.dark};
  opacity: 0.7;
`;

const InputContainer = styled.div`
  display: flex;
  padding: 1rem;
  border-top: 1px solid ${props => props.theme.colors.light};
  gap: 0.5rem;
`;

const MessageInput = styled.input`
  flex: 1;
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.light};
  border-radius: 0.5rem;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.secondary};
  }
`;

const SendButton = styled(motion.button)`
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
  
  &:disabled {
    background: ${props => props.theme.colors.light};
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${props => props.theme.colors.dark};
  font-style: italic;
`;

function Chat() {
  const { user } = useAuth();
  const { sendMessage, isConnected } = useGame();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add welcome message
  useEffect(() => {
    if (isConnected) {
      setMessages([{
        id: Date.now(),
        type: 'system',
        text: 'Welcome to the game chat!',
        timestamp: new Date(),
        sender: 'System'
      }]);
    }
  }, [isConnected]);

  // Handle sending messages
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !isConnected) return;

    const message = {
      id: Date.now(),
      type: 'chat',
      text: newMessage.trim(),
      timestamp: new Date(),
      sender: user.username,
      senderId: user.userId
    };

    // Add message to local state immediately
    setMessages(prev => [...prev, message]);
    
    // Send message via WebSocket
    sendMessage('chat', {
      message: newMessage.trim(),
      timestamp: Date.now()
    });

    setNewMessage('');
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <ChatContainer>
      <Header>Game Chat</Header>
      
      <MessagesContainer>
        {messages.length === 0 ? (
          <EmptyState>No messages yet</EmptyState>
        ) : (
          messages.map((message) => (
            <Message
              key={message.id}
              className={
                message.type === 'system' 
                  ? 'system-message' 
                  : message.senderId === user.userId 
                    ? 'own-message' 
                    : 'other-message'
              }
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MessageBubble
                className={
                  message.type === 'system'
                    ? 'system-message'
                    : message.senderId === user.userId
                      ? 'own-message'
                      : 'other-message'
                }
              >
                <MessageText>{message.text}</MessageText>
              </MessageBubble>
              
              {message.type !== 'system' && (
                <MessageInfo>
                  {message.sender} • {formatTime(message.timestamp)}
                </MessageInfo>
              )}
            </Message>
          ))
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      
      <InputContainer>
        <MessageInput
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isConnected ? "Type a message..." : "Not connected"}
          disabled={!isConnected}
          maxLength={500}
        />
        <SendButton
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || !isConnected}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Send
        </SendButton>
      </InputContainer>
    </ChatContainer>
  );
}

export default Chat;
