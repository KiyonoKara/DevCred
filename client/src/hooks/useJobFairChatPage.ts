import { useEffect, useState, useCallback, useRef } from 'react';
import { Message, JobFairChatMessagePayload } from '@fake-stack-overflow/shared';
import jobFairService from '../services/jobFairService';
import useUserContext from './useUserContext';

/**
 * Custom hook for managing job fair chat functionality.
 * Handles sending/receiving messages in real-time via WebSocket,
 * managing message history, and participant list updates.
 */
const useJobFairChatPage = (jobFairId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user: currentUser, socket } = useUserContext();

  // Auto-scrolls to the latest message
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Sends message to job fair chat
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) {
      setError('Message cannot be empty');
      return;
    }

    try {
      setError(null);
      const now = new Date();

      // Adds message to UI
      const messageToAdd: Message = {
        msg: inputMessage,
        msgFrom: currentUser.username,
        msgDateTime: now,
        type: 'direct',
      };

      setMessages(prev => [...prev, messageToAdd]);
      setInputMessage('');

      // Send message to server
      await jobFairService.addJobFairMessage(jobFairId, inputMessage, currentUser.username, now);

      // Auto-scroll after message is sent
      setTimeout(() => scrollToBottom(), 0);
    } catch (err) {
      setError((err as Error).message || 'Failed to send message');
      // Remove optimistic message on error
      setMessages(prev => prev.slice(0, -1));
      // Restore input on error
      setInputMessage(inputMessage);
    }
  }, [inputMessage, jobFairId, currentUser.username, scrollToBottom]);

  // Handles incoming messages
  const handleIncomingMessage = useCallback(
    (data: JobFairChatMessagePayload) => {
      if (data.jobFairId === jobFairId) {
        // don't add message again if sent by the current user
        if (data.message.msgFrom === currentUser.username) {
          return;
        }

        const message: Message = {
          msg: data.message.msg,
          msgFrom: data.message.msgFrom,
          msgDateTime: data.message.msgDateTime,
          type: 'direct',
        };
        setMessages(prev => [...prev, message]);
        setTimeout(() => scrollToBottom(), 0);
      }
    },
    [jobFairId, scrollToBottom, currentUser.username],
  );

  // WebSocket setup for messages
  useEffect(() => {
    // Listen for incoming chat messages
    socket.on('jobFairChatMessage', handleIncomingMessage);

    return () => {
      socket.off('jobFairChatMessage', handleIncomingMessage);
    };
  }, [socket, handleIncomingMessage]);

  /**
   * Auto-scroll when messages change.
   */
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return {
    messages,
    inputMessage,
    setInputMessage,
    error,
    handleSendMessage,
    messagesEndRef,
  };
};

export default useJobFairChatPage;
