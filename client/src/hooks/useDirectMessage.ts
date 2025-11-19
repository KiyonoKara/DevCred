import { ObjectId } from 'mongodb';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChatUpdatePayload,
  Message,
  PopulatedDatabaseChat,
  SafeDatabaseUser,
  DMDeletedPayload,
} from '../types/types';
import useUserContext from './useUserContext';
import { createChat, getChatsByUser, sendMessage, deleteDMForUser } from '../services/chatService';
import { getUserByUsername } from '../services/userService';

/**
 * useDirectMessage is a custom hook that provides state and functions for direct messaging between users.
 * It includes DM management, visibility controls, and real-time socket updates.
 * Users can locally delete DMs; if both delete, chat is completely removed.
 * Users can manage DM preferences (dmEnabled setting).
 */

const useDirectMessage = () => {
  const { user, socket } = useUserContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreatePanel, setShowCreatePanel] = useState<boolean>(false);
  const [chatToCreate, setChatToCreate] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<PopulatedDatabaseChat | null>(null);
  const [chats, setChats] = useState<PopulatedDatabaseChat[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [targetUserDMEnabled, setTargetUserDMEnabled] = useState<boolean | null>(null);

  const handleJoinChat = useCallback(
    (chatID: ObjectId) => {
      socket.emit('joinChat', String(chatID));
    },
    [socket],
  );

  /**
   * Checks if a user can receive direct messages.
   * Validates that the target user has DMs enabled.
   * @param username - The username to check DM capability for.
   * @returns true if user accepts DMs, false otherwise.
   */
  const canSendDMToUser = async (username: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const targetUser = await getUserByUsername(username);
      const canReceive = targetUser.dmEnabled !== false; // Default to true if not set
      setTargetUserDMEnabled(canReceive);
      setError(null);
      return canReceive;
    } catch (err) {
      setError(`Cannot check DM settings for user: ${(err as Error).message}`);
      setTargetUserDMEnabled(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refreshes the list of chats from the server.
   * Useful after DM deletion or when syncing state.
   */
  const refreshChats = async () => {
    try {
      setIsLoading(true);
      const userChats = await getChatsByUser(user.username);
      setChats(userChats);
      setError(null);
    } catch (err) {
      setError(`Error refreshing chats: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedChat?._id) {
      try {
        const message: Omit<Message, 'type'> = {
          msg: newMessage,
          msgFrom: user.username,
          msgDateTime: new Date(),
        };

        const chat = await sendMessage(message, selectedChat._id);

        setSelectedChat(chat);
        setError(null);
        setNewMessage('');
      } catch (err) {
        setError(`Error sending message: ${(err as Error).message}`);
      }
    } else {
      setError('Message cannot be empty');
    }
  };

  const handleChatSelect = useCallback(
    (chatID: ObjectId) => {
      const chat = chats.find(c => c._id === chatID);
      if (chat) {
        setSelectedChat(chat);
        handleJoinChat(chatID);
      }
    },
    [chats, handleJoinChat],
  );

  const handleUserSelect = (selectedUser: SafeDatabaseUser) => {
    setChatToCreate(selectedUser.username);
  };

  const handleCreateChat = async () => {
    if (!chatToCreate) {
      setError('Please select a user to chat with');
      return;
    }

    // Check if target user has DMs enabled (story 2.3)
    const canSendDM = await canSendDMToUser(chatToCreate);
    if (!canSendDM) {
      setError(`${chatToCreate} has disabled direct messages`);
      return;
    }

    try {
      const chat = await createChat([user.username, chatToCreate]);
      setSelectedChat(chat);
      handleJoinChat(chat._id);
      setShowCreatePanel(false);
      setChatToCreate('');
      setError(null);
    } catch (err) {
      setError(`Error creating chat: ${(err as Error).message}`);
    }
  };

  /**
   * Deletes a DM for the current user.
   * If both users have deleted, the chat is completely removed from database.
   * @param chatID - The ID of the chat to delete.
   */
  const handleDeleteDM = async (chatID: ObjectId) => {
    try {
      const result = await deleteDMForUser(chatID, user.username);

      if (result.success) {
        setError(null);
        // Clear selected chat if it was the one deleted
        if (selectedChat?._id === chatID) {
          setSelectedChat(null);
        }
        // Remove from chats list
        setChats(prevChats => prevChats.filter(c => c._id !== chatID));
      }
    } catch (err) {
      setError(`Error deleting DM: ${(err as Error).message}`);
    }
  };

  // Handle URL parameter to pre-select user for DM
  useEffect(() => {
    const targetUser = searchParams.get('user');
    const targetChatId = searchParams.get('chat');

    if (targetChatId) {
      // Directly open an existing chat by ID
      handleChatSelect(targetChatId as unknown as ObjectId);
      // Clear the URL parameter
      setSearchParams({});
    } else if (targetUser && targetUser !== user.username) {
      // Open create panel with user pre-selected
      setChatToCreate(targetUser);
      setShowCreatePanel(true);
      // Clear the URL parameter
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, user.username, handleChatSelect]);

  useEffect(() => {
    const fetchChats = async () => {
      const userChats = await getChatsByUser(user.username);
      setChats(userChats);
    };

    const handleChatUpdate = (chatUpdate: ChatUpdatePayload) => {
      const { chat, type } = chatUpdate;

      switch (type) {
        case 'created': {
          if (chat.participants.includes(user.username)) {
            setChats(prevChats => [chat, ...prevChats]);
          }
          return;
        }
        case 'newMessage': {
          // update the chat in the chats list
          setChats(prevChats => {
            const existingChatIndex = prevChats.findIndex(c => String(c._id) === String(chat._id));
            if (existingChatIndex !== -1) {
              // update existing chat and move to top
              const updatedChats = [...prevChats];
              updatedChats[existingChatIndex] = chat;
              // move to the top
              return [chat, ...updatedChats.filter((_, i) => i !== existingChatIndex)];
            }
            // add new chat to the top
            return [chat, ...prevChats];
          });

          // only update selected chat if it's the one that received the message
          if (selectedChat && String(selectedChat._id) === String(chat._id)) {
            setSelectedChat(chat);
          }
          return;
        }
        case 'newParticipant': {
          if (chat.participants.includes(user.username)) {
            setChats(prevChats => {
              if (prevChats.some(c => chat._id === c._id)) {
                return prevChats.map(c => (c._id === chat._id ? chat : c));
              }
              return [chat, ...prevChats];
            });
          }
          return;
        }
        default: {
          setError('Invalid chat update type');
        }
      }
    };

    /**
     * Handles DM deletion events from socket
     * If deletedCompletely is true, removes chat from list.
     * If deletedCompletely is false, just shows that user deleted it.
     */
    const handleDMDeleted = (payload: DMDeletedPayload) => {
      const { chatId, deletedCompletely } = payload;

      if (deletedCompletely) {
        // Completely remove from database if both users delete it
        setChats(prevChats => prevChats.filter(c => String(c._id) !== chatId));
        if (selectedChat && String(selectedChat._id) === chatId) {
          setSelectedChat(null);
        }
      } else {
        // Keep in list but show it's been deleted by one user
        setChats(prevChats => prevChats.map(c => c));
      }
    };

    fetchChats();

    socket.on('chatUpdate', handleChatUpdate);
    socket.on('dmDeleted', handleDMDeleted);

    return () => {
      socket.off('chatUpdate', handleChatUpdate);
      socket.off('dmDeleted', handleDMDeleted);
      if (selectedChat) {
        socket.emit('leaveChat', String(selectedChat._id));
      }
    };
  }, [selectedChat, user.username, socket]);

  return {
    selectedChat,
    chatToCreate,
    chats,
    newMessage,
    setNewMessage,
    showCreatePanel,
    setShowCreatePanel,
    handleSendMessage,
    handleChatSelect,
    handleUserSelect,
    handleCreateChat,
    handleDeleteDM,
    error,
    isLoading,
    targetUserDMEnabled,
    canSendDMToUser,
    refreshChats,
  };
};

export default useDirectMessage;
