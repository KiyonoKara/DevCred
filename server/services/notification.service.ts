import NotificationModel from '../models/notification.model';
import {
  Notification,
  NotificationResponse,
  NotificationListResponse,
  DatabaseNotification,
} from '../types/types';

/**
 * Creates a new notification.
 * @param notificationData - The notification data to create.
 * @returns {Promise<NotificationResponse>} - The created notification.
 */
export const createNotification = async (
  notificationData: Notification,
): Promise<NotificationResponse> => {
  try {
    const newNotification = await NotificationModel.create(notificationData);
    // Convert to plain object and handle null relatedId
    const notificationObj = newNotification.toObject ? newNotification.toObject() : newNotification;
    return {
      ...notificationObj,
      relatedId: notificationObj.relatedId || undefined,
    } as DatabaseNotification;
  } catch (error) {
    return { error: `Error creating notification: ${error}` };
  }
};

/**
 * Gets all notifications for a user.
 * @param username - The username of the recipient.
 * @param unreadOnly - If true, only return unread notifications.
 * @returns {Promise<NotificationListResponse>} - List of notifications.
 */
export const getUserNotifications = async (
  username: string,
  unreadOnly: boolean = false,
): Promise<NotificationListResponse> => {
  try {
    const filter: { recipient: string; read?: boolean } = { recipient: username };
    if (unreadOnly) {
      filter.read = false;
    }

    const notifications = await NotificationModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(); // Limit to most recent 100 notifications

    // Convert to plain objects and handle null relatedId
    return notifications.map(notif => ({
      ...notif,
      relatedId: notif.relatedId || undefined,
    })) as DatabaseNotification[];
  } catch (error) {
    return { error: `Error retrieving notifications: ${error}` };
  }
};

/**
 * Marks a notification as read.
 * @param notificationId - The ID of the notification to mark as read.
 * @param username - The username of the recipient (for authorization).
 * @returns {Promise<NotificationResponse>} - The updated notification.
 */
export const markNotificationAsRead = async (
  notificationId: string,
  username: string,
): Promise<NotificationResponse> => {
  try {
    const notification = await NotificationModel.findById(notificationId);

    if (!notification) {
      return { error: 'Notification not found' };
    }

    if (notification.recipient !== username) {
      return { error: 'Unauthorized to mark this notification as read' };
    }

    notification.read = true;
    await notification.save();

    // Convert to plain object and handle null relatedId
    const notificationObj = notification.toObject ? notification.toObject() : notification;
    return {
      ...notificationObj,
      relatedId: notificationObj.relatedId || undefined,
    } as DatabaseNotification;
  } catch (error) {
    return { error: `Error marking notification as read: ${error}` };
  }
};

/**
 * Marks all notifications as read for a user.
 * @param username - The username of the recipient.
 * @returns {Promise<{ success: boolean } | { error: string }>} - Success or error.
 */
export const markAllNotificationsAsRead = async (
  username: string,
): Promise<{ success: boolean } | { error: string }> => {
  try {
    await NotificationModel.updateMany({ recipient: username, read: false }, { read: true });
    return { success: true };
  } catch (error) {
    return { error: `Error marking all notifications as read: ${error}` };
  }
};

/**
 * Deletes all notifications for a user.
 * @param username - The username of the recipient.
 * @returns {Promise<{ success: boolean } | { error: string }>} - Success or error.
 */
export const clearAllNotifications = async (
  username: string,
): Promise<{ success: boolean } | { error: string }> => {
  try {
    await NotificationModel.deleteMany({ recipient: username });
    return { success: true };
  } catch (error) {
    return { error: `Error clearing notifications: ${error}` };
  }
};

/**
 * Gets unread notification count for a user.
 * @param username - The username of the recipient.
 * @returns {Promise<number>} - The count of unread notifications.
 */
export const getUnreadNotificationCount = async (username: string): Promise<number> => {
  try {
    const count = await NotificationModel.countDocuments({ recipient: username, read: false });
    return count;
  } catch (error) {
    return 0;
  }
};
