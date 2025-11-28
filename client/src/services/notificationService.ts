import api from './config';
import { DatabaseNotification } from '@fake-stack-overflow/shared';

const NOTIFICATION_API_URL = '/api/notification';

/**
 * Gets all notifications for the current user.
 * @param unreadOnly - If true, only return unread notifications.
 * @returns List of notifications.
 */
export const getNotifications = async (
  unreadOnly: boolean = false,
): Promise<DatabaseNotification[]> => {
  const res = await api.get(NOTIFICATION_API_URL, {
    params: { unreadOnly },
  });

  if (res.status !== 200) {
    throw new Error('Error retrieving notifications.');
  }

  return res.data;
};

/**
 * Gets the unread notification count for the current user.
 * @returns The count of unread notifications.
 */
export const getUnreadNotificationCount = async (): Promise<number> => {
  const res = await api.get(`${NOTIFICATION_API_URL}/count`);

  if (res.status !== 200) {
    throw new Error('Error retrieving unread count.');
  }

  return res.data.count;
};

/**
 * Marks a notification as read.
 * @param notificationId - The ID of the notification to mark as read.
 * @returns The updated notification.
 */
export const markNotificationAsRead = async (
  notificationId: string,
): Promise<DatabaseNotification> => {
  const res = await api.patch(`${NOTIFICATION_API_URL}/${notificationId}/read`);

  if (res.status !== 200) {
    throw new Error('Error marking notification as read.');
  }

  return res.data;
};

/**
 * Marks all notifications as read for the current user.
 * @returns Success status.
 */
export const markAllNotificationsAsRead = async (): Promise<{ success: boolean }> => {
  const res = await api.patch(`${NOTIFICATION_API_URL}/read-all`);

  if (res.status !== 200) {
    throw new Error('Error marking all notifications as read.');
  }

  return res.data;
};

/**
 * Clears all notifications for the current user.
 * @returns Success status.
 */
export const clearAllNotifications = async (): Promise<{ success: boolean }> => {
  const res = await api.delete(`${NOTIFICATION_API_URL}/clear-all`);

  if (res.status !== 200) {
    throw new Error('Error clearing notifications.');
  }

  return res.data;
};

/**
 * Gets detailed breakdown for a summary notification.
 * @param notificationId - The ID of the summary notification.
 * @returns Detailed breakdown with messages by chat, questions by community, and job fairs.
 */
export interface SummaryBreakdown {
  dmMessages: {
    [chatId: string]: {
      otherUser: string;
      count: number;
      chatId: string;
      isDeleted?: boolean;
    };
  };
  communityQuestions: {
    [communityId: string]: {
      communityName: string;
      count: number;
      questions: Array<{
        _id: string;
        title: string;
        askedBy: string;
        askDateTime: string;
      }>;
    };
  };
  jobFairs: Array<{
    _id: string;
    title: string;
    status: string;
    startTime?: string;
    endTime?: string;
  }>;
}

export const getSummaryBreakdown = async (notificationId: string): Promise<SummaryBreakdown> => {
  const res = await api.get(`${NOTIFICATION_API_URL}/${notificationId}/summary-breakdown`);

  if (res.status !== 200) {
    throw new Error('Error retrieving summary breakdown.');
  }

  return res.data;
};
