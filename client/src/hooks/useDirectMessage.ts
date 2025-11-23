import { ObjectId } from 'mongodb';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createChat,
  deleteDMForUser,
  getChatById,
  getChatsByUser,
  sendMessage,
} from '../services/chatService';
import { uploadResume } from '../services/resumeService';
import { getUserByUsername } from '../services/userService';
import {
  ChatUpdatePayload,
  DMDeletedPayload,
  Message,
  PopulatedDatabaseChat,
  SafeDatabaseUser,
} from '../types/types';
import useResumeManager from './useResumeManager';
import useUserContext from './useUserContext';

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
  const [showUploadPDFDropdown, setShowUploadPDFDropdown] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [targetUserDMEnabled, setTargetUserDMEnabled] = useState<boolean | null>(null);
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null);

  const handleJoinChat = useCallback(
    (chatID: ObjectId) => {
      socket.emit('joinChat', String(chatID));
    },
    [socket],
  );

  const { downloadResume } = useResumeManager(user.username);

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
        const message: Message = {
          msg: newMessage,
          msgFrom: user.username,
          msgDateTime: new Date(),
          type: 'direct',
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

  const handleDownloadPDF = async (message: Message) => {
    try {
      const messageParts = message.msg.split(':')[1].split(',');
      const pdfId = messageParts[1].trim();
      const pdfName = messageParts[0].trim();

      const result = await downloadResume(pdfId, pdfName);
      if (!result.success) {
        alert('Issue downloading resume. Please reach out to applicant.');
      }
    } catch (error) {
      alert('Error downloading PDF, please reach out to sender.');
    }
  };

  const handleChatSelect = useCallback(
    async (chatID: ObjectId | undefined) => {
      if (!chatID) {
        setError('Invalid chat ID');
        return;
      }
      const chat = await getChatById(chatID);
      setSelectedChat(chat);
      handleJoinChat(chatID);
    },
    [handleJoinChat],
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
    const urlChatId = searchParams.get('chatId');

    if (targetChatId) {
      // Directly open an existing chat by ID
      handleChatSelect(targetChatId as unknown as ObjectId);
      // Update URL to use chatId instead of chat
      setSearchParams({ chatId: targetChatId });
    } else if (urlChatId) {
      // Chat ID is in URL, select it
      const chat = chats.find(c => String(c._id) === urlChatId);
      if (chat && (!selectedChat || String(selectedChat._id) !== urlChatId)) {
        setSelectedChat(chat);
        handleJoinChat(chat._id);
      } else if (!chat && chats.length > 0) {
        // Chat not found in list, try to fetch it or select first chat
        // For now, just ensure we join if we have a selectedChat
        if (selectedChat && String(selectedChat._id) === urlChatId) {
          handleJoinChat(selectedChat._id);
        }
      }
    } else if (targetUser && targetUser !== user.username) {
      // Open create panel with user pre-selected
      setChatToCreate(targetUser);
      setShowCreatePanel(true);
      // Clear the URL parameter
      setSearchParams({});
    }
  }, [
    searchParams,
    setSearchParams,
    user.username,
    handleChatSelect,
    chats,
    selectedChat,
    handleJoinChat,
  ]);

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
            setChats(prevChats => {
              // Check if chat already exists
              const exists = prevChats.some(c => String(c._id) === String(chat._id));
              if (exists) {
                return prevChats;
              }
              return [chat, ...prevChats];
            });
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

          // Update selected chat if it's the one that received the message
          // Use functional update to avoid stale closure
          setSelectedChat(prevSelected => {
            if (prevSelected && String(prevSelected._id) === String(chat._id)) {
              return chat;
            }
            return prevSelected;
          });
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
        // Use functional update to avoid stale closure
        setSelectedChat(prevSelected => {
          if (prevSelected && String(prevSelected._id) === chatId) {
            return null;
          }
          return prevSelected;
        });
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
    };
  }, [user.username, socket]);

  // Separate effect to handle joining/leaving chat rooms
  useEffect(() => {
    if (selectedChat) {
      // Join the chat room when a chat is selected
      handleJoinChat(selectedChat._id);

      return () => {
        // Leave the chat room when chat is deselected or component unmounts
        socket.emit('leaveChat', String(selectedChat._id));
      };
    }
  }, [selectedChat, handleJoinChat, socket]);

  const onPDFChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedPDF(file);
  };

  const onPDFUploadClick = async () => {
    if (!selectedPDF || !selectedChat?._id) {
      return;
    }

    const uploadedResume = await uploadResume(user.username, selectedPDF, {
      isActive: false,
      isDMFile: true,
    });

    if (!uploadedResume) {
      setError('Error uploading PDF, please try later or different file.');
    } else {
      setError('');
      try {
        const message: Message = {
          msg: `${uploadedResume.fileName}: ${uploadedResume.fileName}, ${uploadedResume._id}`,
          msgFrom: user.username,
          msgDateTime: new Date(),
          type: 'resume',
        };

        const chat = await sendMessage(message, selectedChat._id);

        setSelectedChat(chat);
        setError(null);
        setNewMessage('');
      } catch (err) {
        setError(`Error sending message: ${(err as Error).message}`);
      }
    }
  };

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
    handleDownloadPDF,
    error,
    isLoading,
    targetUserDMEnabled,
    canSendDMToUser,
    refreshChats,
    showUploadPDFDropdown,
    setShowUploadPDFDropdown,
    selectedPDF,
    onPDFChange,
    onPDFUploadClick,
  };
};

export default useDirectMessage;
