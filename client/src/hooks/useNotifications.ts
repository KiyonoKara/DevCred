import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { DatabaseNotification } from '@fake-stack-overflow/shared';
import useUserContext from './useUserContext';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
} from '../services/notificationService';

/**
 * Custom hook for managing notifications.
 * Handles fetching notifications, real-time updates, and notification actions.
 */
const useNotifications = () => {
  const { user, socket } = useUserContext();
  const location = useLocation();
  const [notifications, setNotifications] = useState<DatabaseNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState<DatabaseNotification | null>(null);
  const notificationsRef = useRef<DatabaseNotification[]>([]);

  // Track currently viewing content (not historical - only while actively viewing)
  const currentlyViewingChatRef = useRef<string | null>(null);
  const currentlyViewingQuestionRef = useRef<string | null>(null);
  const currentlyViewingJobFairRef = useRef<string | null>(null);

  // Track notifications received while viewing (to filter them out permanently)
  const notificationsReceivedWhileViewingRef = useRef<Set<string>>(new Set());

  // Keep ref in sync with state
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  // Track when user views/leaves a chat, question, or job fair
  useEffect(() => {
    const currentSearchParams = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname;
    const pathParts = pathname.split('/').filter(Boolean);

    // Track currently viewing chat
    const chatId = currentSearchParams.get('chatId');
    const previousChatId = currentlyViewingChatRef.current;

    if (chatId && chatId !== previousChatId) {
      // User entered a chat
      currentlyViewingChatRef.current = chatId;
      // Filter out existing notifications for this chat
      setNotifications(prev => {
        const filtered = prev.filter(n => {
          if (n.type === 'dm' && n.relatedId && String(n.relatedId) === chatId) {
            // Mark this notification as received while viewing
            notificationsReceivedWhileViewingRef.current.add(n._id.toString());
            return false; // Remove notifications for this chat
          }
          return true;
        });
        // Recalculate unread count
        const unreadNotifs = filtered.filter(n => !n.read);
        setUnreadCount(unreadNotifs.length);
        return filtered;
      });
    } else if (!chatId && previousChatId) {
      // User left the chat
      currentlyViewingChatRef.current = null;
    }

    // Track currently viewing question
    const questionIndex = pathParts.indexOf('question');
    const questionId =
      questionIndex !== -1 && pathParts[questionIndex + 1] ? pathParts[questionIndex + 1] : null;
    const previousQuestionId = currentlyViewingQuestionRef.current;

    if (questionId && questionId !== previousQuestionId) {
      // User entered a question page
      currentlyViewingQuestionRef.current = questionId;
      // Filter out existing notifications for this question
      setNotifications(prev => {
        const filtered = prev.filter(n => {
          if (n.type === 'community' && n.relatedId && String(n.relatedId) === questionId) {
            // Mark this notification as received while viewing
            notificationsReceivedWhileViewingRef.current.add(n._id.toString());
            return false; // Remove notifications for this question
          }
          return true;
        });
        // Recalculate unread count
        const unreadNotifs = filtered.filter(n => !n.read);
        setUnreadCount(unreadNotifs.length);
        return filtered;
      });
    } else if (!questionId && previousQuestionId) {
      // User left the question page
      currentlyViewingQuestionRef.current = null;
    }

    // Track currently viewing job fair
    const jobFairIndex = pathParts.indexOf('jobfairs');
    const jobFairId =
      jobFairIndex !== -1 && pathParts[jobFairIndex + 1] ? pathParts[jobFairIndex + 1] : null;
    const previousJobFairId = currentlyViewingJobFairRef.current;

    if (jobFairId && jobFairId !== previousJobFairId) {
      // User entered a job fair page
      currentlyViewingJobFairRef.current = jobFairId;
      // Filter out existing notifications for this job fair
      setNotifications(prev => {
        const filtered = prev.filter(n => {
          if (n.type === 'jobFair' && n.relatedId && String(n.relatedId) === jobFairId) {
            // Mark this notification as received while viewing
            notificationsReceivedWhileViewingRef.current.add(n._id.toString());
            return false; // Remove notifications for this job fair
          }
          return true;
        });
        // Recalculate unread count
        const unreadNotifs = filtered.filter(n => !n.read);
        setUnreadCount(unreadNotifs.length);
        return filtered;
      });
    } else if (!jobFairId && previousJobFairId) {
      // User left the job fair page
      currentlyViewingJobFairRef.current = null;
    }
  }, [location.pathname, location.search]);

  /**
   * Checks if a notification should be shown based on the current page context.
   * Reads URL directly to avoid stale closures.
   * Returns false if:
   * 1. User is currently viewing the content related to the notification, OR
   * 2. The notification was received while the user was viewing that content
   */
  const shouldShowNotification = useCallback((notification: DatabaseNotification): boolean => {
    // If no relatedId, always show (can't determine context)
    if (!notification.relatedId) return true;

    // Check if this notification was received while viewing (should be filtered permanently)
    if (notificationsReceivedWhileViewingRef.current.has(notification._id.toString())) {
      return false;
    }

    const relatedIdStr = String(notification.relatedId);

    // Check DM notifications - don't show if user is currently viewing this chat
    if (notification.type === 'dm') {
      const currentSearchParams = new URLSearchParams(window.location.search);
      const currentChatId = currentSearchParams.get('chatId');
      if (currentChatId && relatedIdStr === String(currentChatId)) {
        // Mark this notification as received while viewing
        notificationsReceivedWhileViewingRef.current.add(notification._id.toString());
        return false; // User is currently viewing this chat
      }
    }

    // Check job fair notifications - don't show if user is currently viewing this job fair
    if (notification.type === 'jobFair') {
      const pathname = window.location.pathname;
      const pathParts = pathname.split('/').filter(Boolean);
      const jobFairIndex = pathParts.indexOf('jobfairs');
      const currentJobFairId =
        jobFairIndex !== -1 && pathParts[jobFairIndex + 1] ? pathParts[jobFairIndex + 1] : null;

      if (currentJobFairId && relatedIdStr === String(currentJobFairId)) {
        // Mark this notification as received while viewing
        notificationsReceivedWhileViewingRef.current.add(notification._id.toString());
        return false; // User is currently viewing this job fair
      }
    }

    // Check community notifications - don't show if user is currently viewing this question
    if (notification.type === 'community') {
      const pathname = window.location.pathname;
      const pathParts = pathname.split('/').filter(Boolean);
      const questionIndex = pathParts.indexOf('question');
      const currentQuestionId =
        questionIndex !== -1 && pathParts[questionIndex + 1] ? pathParts[questionIndex + 1] : null;

      if (currentQuestionId && relatedIdStr === String(currentQuestionId)) {
        // Mark this notification as received while viewing
        notificationsReceivedWhileViewingRef.current.add(notification._id.toString());
        return false; // User is currently viewing this question
      }
    }

    return true; // Show notification if not currently viewing related content
  }, []);

  // Join user room for notifications on mount
  useEffect(() => {
    if (user && socket) {
      socket.emit('joinUserRoom', user.username);

      // Listen for real-time notifications
      const handleNotification = (notification: DatabaseNotification) => {
        // Use the shouldShowNotification function which checks both current context and viewed history
        if (!shouldShowNotification(notification)) {
          // Don't add to list, don't increment unread count, don't show banner
          // User is viewing or has viewed the related content, so they don't need the notification
          return;
        }

        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Show pop-up notification banner if user has notifications enabled
        if (user.notificationPreferences?.enabled && !user.notificationPreferences?.summarized) {
          // Check if the notification type is enabled
          const typeEnabled =
            (notification.type === 'dm' && user.notificationPreferences.dmEnabled) ||
            (notification.type === 'jobFair' && user.notificationPreferences.jobFairEnabled) ||
            (notification.type === 'community' && user.notificationPreferences.communityEnabled);

          if (typeEnabled) {
            setShowNotification(notification);
            // Auto-hide after 5 seconds
            setTimeout(() => {
              setShowNotification(null);
            }, 5000);
          }
        }
      };

      socket.on('notification', handleNotification);

      return () => {
        socket.off('notification', handleNotification);
        socket.emit('leaveUserRoom', user.username);
      };
    }
  }, [user, socket, shouldShowNotification]);

  // Fetch notifications on mount
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const notifs = await getNotifications(false);

      // Filter notifications based on current page context - don't show notifications for content user is viewing
      const filteredNotifs = notifs.filter(n => shouldShowNotification(n));
      setNotifications(filteredNotifs);

      // Calculate unread count from filtered notifications
      const unreadNotifs = filteredNotifs.filter(n => !n.read);
      setUnreadCount(unreadNotifs.length);
    } catch (err) {
      setError((err as Error).message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [user, shouldShowNotification]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Re-filter notifications when URL changes (user navigates to/from related pages)
  useEffect(() => {
    // Re-filter the current notifications list based on new page context
    setNotifications(prev => {
      const filtered = prev.filter(shouldShowNotification);
      // Recalculate unread count
      const unreadNotifs = filtered.filter(n => !n.read);
      setUnreadCount(unreadNotifs.length);
      return filtered;
    });
  }, [location.pathname, location.search, shouldShowNotification]);

  // Poll for new notifications every second if user has notifications enabled
  useEffect(() => {
    if (!user || !user.notificationPreferences?.enabled) return;

    // Don't poll if summarized notifications are enabled (they're handled by the server scheduler)
    if (user.notificationPreferences.summarized) return;

    const pollInterval = setInterval(async () => {
      try {
        const notifs = await getNotifications(true); // Only fetch unread

        // Check if there are new unread notifications using ref to avoid dependency
        const currentUnreadIds = new Set(
          notificationsRef.current.filter(n => !n.read).map(n => n._id.toString()),
        );
        const newUnread = notifs.filter(n => !currentUnreadIds.has(n._id.toString()));

        if (newUnread.length > 0) {
          // Filter out notifications that shouldn't be shown based on current context and viewed history
          const filteredNewUnread = newUnread.filter(shouldShowNotification);

          // Calculate unread count excluding notifications for current page and viewed content
          const allUnread = notifs.filter(shouldShowNotification);
          const filteredCount = allUnread.length;

          // Update notifications list - only add filtered notifications
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n._id.toString()));
            const newNotifications = filteredNewUnread.filter(
              n => !existingIds.has(n._id.toString()),
            );
            return [...newNotifications, ...prev];
          });

          // Show the first filtered new notification as a banner
          if (
            filteredNewUnread.length > 0 &&
            filteredNewUnread[0] &&
            user.notificationPreferences?.enabled
          ) {
            // Check if the notification type is enabled
            const typeEnabled =
              (filteredNewUnread[0].type === 'dm' && user.notificationPreferences.dmEnabled) ||
              (filteredNewUnread[0].type === 'jobFair' &&
                user.notificationPreferences.jobFairEnabled) ||
              (filteredNewUnread[0].type === 'community' &&
                user.notificationPreferences.communityEnabled);

            if (typeEnabled) {
              setShowNotification(filteredNewUnread[0]);
              setTimeout(() => {
                setShowNotification(null);
              }, 5000);
            }
          }

          // Update unread count with filtered count
          setUnreadCount(filteredCount);
        } else {
          // Recalculate unread count and filter notifications list based on current context and viewed history
          const allUnread = notifs.filter(shouldShowNotification);
          setUnreadCount(allUnread.length);

          // Also filter the existing notifications list to remove any that shouldn't be shown
          setNotifications(prev => prev.filter(shouldShowNotification));
        }
      } catch (err) {
        // Silently fail polling errors
        // console.error('Error polling notifications:', err);
      }
      // Poll every second
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [user, shouldShowNotification]);

  // Mark notification as read
  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markNotificationAsRead(notificationId);
        setNotifications(prev => {
          const updated = prev.map(n =>
            n._id.toString() === notificationId ? { ...n, read: true } : n,
          );
          // Recalculate unread count excluding notifications for current page
          const unreadNotifs = updated.filter(n => !n.read);
          const filteredUnread = unreadNotifs.filter(n => shouldShowNotification(n));
          setUnreadCount(filteredUnread.length);
          return updated;
        });
      } catch (err) {
        setError((err as Error).message || 'Failed to mark notification as read');
      }
    },
    [shouldShowNotification],
  );

  // Mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      // All notifications are now read, so unread count is 0
      setUnreadCount(0);
    } catch (err) {
      setError((err as Error).message || 'Failed to mark all as read');
    }
  }, []);

  // Clear all notifications
  const handleClearAll = useCallback(async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      setError((err as Error).message || 'Failed to clear notifications');
    }
  }, []);

  // Dismiss pop-up notification
  const handleDismissNotification = useCallback(() => {
    setShowNotification(null);
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    showNotification,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleClearAll,
    handleDismissNotification,
    refreshNotifications: fetchNotifications,
  };
};

export default useNotifications;
