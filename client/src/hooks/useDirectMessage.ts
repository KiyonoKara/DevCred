import { ObjectId } from 'mongodb';
import { useEffect, useState } from 'react';
import {
  ChatUpdatePayload,
  Message,
  PopulatedDatabaseChat,
  SafeDatabaseUser,
  DMDeletedPayload,
} from '../types/types';
import useUserContext from './useUserContext';
import {
  createChat,
  getChatById,
  getChatsByUser,
  sendMessage,
  deleteDMForUser,
} from '../services/chatService';
import { getUserByUsername } from '../services/userService';

/**
 * useDirectMessage is a custom hook that provides state and functions for direct messaging between users.
 * It includes DM management, visibility controls, and real-time socket updates.
 * Users can locally delete DMs; if both delete, chat is completely removed.
 * Users can manage DM preferences (dmEnabled setting).
 */

const useDirectMessage = () => {
  const { user, socket } = useUserContext();
  const [showCreatePanel, setShowCreatePanel] = useState<boolean>(false);
  const [chatToCreate, setChatToCreate] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<PopulatedDatabaseChat | null>(null);
  const [chats, setChats] = useState<PopulatedDatabaseChat[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [targetUserDMEnabled, setTargetUserDMEnabled] = useState<boolean | null>(null);

  const handleJoinChat = (chatID: ObjectId) => {
    socket.emit('joinChat', String(chatID));
  };

  /**
   * Checks if a user can receive direct messages (story 2.3).
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

  const handleChatSelect = async (chatID: ObjectId | undefined) => {
    if (!chatID) {
      setError('Invalid chat ID');
      return;
    }

    const chat = await getChatById(chatID);
    setSelectedChat(chat);
    handleJoinChat(chatID);
  };

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
   * Deletes a DM for the current user (story 2.7 - local deletion).
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
          setSelectedChat(chat);
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
     * Handles DM deletion events from socket (story 2.7).
     * If deletedCompletely is true, removes chat from list.
     * If deletedCompletely is false, just shows that user deleted it.
     */
    const handleDMDeleted = (payload: DMDeletedPayload) => {
      const { chatId, deletedCompletely } = payload;

      if (deletedCompletely) {
        // Both users deleted - completely remove from database
        setChats(prevChats => prevChats.filter(c => String(c._id) !== chatId));
        if (selectedChat && String(selectedChat._id) === chatId) {
          setSelectedChat(null);
        }
      } else {
        // One user deleted - keep in list but show it's been deleted by them
        // In a real UI, you might show a "deleted" indicator
        setChats(prevChats => prevChats.map(c => c));
      }
    };

    fetchChats();

    socket.on('chatUpdate', handleChatUpdate);
    socket.on('dmDeleted', handleDMDeleted);

    return () => {
      socket.off('chatUpdate', handleChatUpdate);
      socket.off('dmDeleted', handleDMDeleted);
      socket.emit('leaveChat', String(selectedChat?._id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.username, socket]);

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
