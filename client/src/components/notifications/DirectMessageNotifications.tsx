import { useEffect, useContext, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UserContext from '../../contexts/UserContext';
import { useToast } from '../../hooks/useToast';
import { ChatUpdatePayload, PopulatedDatabaseChat } from '../../types/types';
import { getChatsByUser } from '../../services/chatService';

/**
 * Component that listens for incoming direct messages and shows notifications.
 * This should be mounted at the app level to work on all pages.
 * Joins all user's chat rooms to receive real-time updates.
 * Handles revived DMs by re-joining chat rooms when messages are received.
 */
const DirectMessageNotifications = () => {
  const usercontext = useContext(UserContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const joinedChatIds = useRef<Set<string>>(new Set());

  // Join all user's chat rooms on mount and periodically refresh
  useEffect(() => {
    if (!usercontext) {
      return;
    }
    const { user, socket } = usercontext;

    const joinAllChats = async () => {
      try {
        const chats = await getChatsByUser(user.username);
        if ('error' in chats) return;

        // Join each chat room
        chats.forEach((chat: PopulatedDatabaseChat) => {
          const chatId = String(chat._id);
          if (!joinedChatIds.current.has(chatId)) {
            socket.emit('joinChat', chatId);
            joinedChatIds.current.add(chatId);
          }
        });
      } catch (err) {
        // do nothing
        // user will still get notifications when on messaging page
      }
    };

    // Join immediately on mount
    joinAllChats();

    // Refresh every 30 seconds to catch revived/new chats
    const interval = setInterval(joinAllChats, 30000);

    return () => clearInterval(interval);
  }, [usercontext]);

  // Listen for chat updates
  useEffect(() => {
    if (!usercontext) {
      return;
    }
    const { user, socket } = usercontext;

    const handleChatUpdate = (chatUpdate: ChatUpdatePayload) => {
      const { chat, type } = chatUpdate;

      // Always join/re-join the chat room when receiving any update
      // This ensures revived DMs are properly tracked
      const chatId = String(chat._id);
      if (!joinedChatIds.current.has(chatId)) {
        socket.emit('joinChat', chatId);
        joinedChatIds.current.add(chatId);
      }

      // Only handle new messages for notifications
      if (type !== 'newMessage') return;

      // Check if the message is from another user
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (!lastMessage || lastMessage.msgFrom === user.username) return;

      // Don't show notification if user is already on the direct message page
      const isOnMessagingPage = location.pathname === '/messaging/direct-message';
      if (isOnMessagingPage) return;

      // Show notification
      const senderName = lastMessage.msgFrom;
      const messagePreview =
        lastMessage.msg.length > 50 ? `${lastMessage.msg.substring(0, 50)}...` : lastMessage.msg;

      showToast(`New message from ${senderName}: ${messagePreview}`, {
        type: 'info',
        duration: 5000,
        onClick: () => {
          navigate('/messaging/direct-message');
        },
      });
    };

    socket.on('chatUpdate', handleChatUpdate);

    return () => {
      socket.off('chatUpdate', handleChatUpdate);
    };
  }, [usercontext, navigate, location, showToast]);

  return null;
};

export default DirectMessageNotifications;
