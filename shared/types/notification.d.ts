import { ObjectId } from 'mongodb';

/**
 * Represents a notification.
 */
export interface Notification {
  recipient: string;
  type: 'dm' | 'jobFair' | 'community';
  title: string;
  message: string;
  read: boolean;
  relatedId?: string;
}

/**
 * Represents a notification stored in the database.
 */
export interface DatabaseNotification extends Notification {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents the response for notification-related operations.
 */
export type NotificationResponse = DatabaseNotification | { error: string };

/**
 * Represents the response for multiple notification operations.
 */
export type NotificationListResponse = DatabaseNotification[] | { error: string };

/**
 * Notification preferences for a user.
 */
export interface NotificationPreferences {
  enabled: boolean;
  summarized: boolean;
  summaryTime?: string; // Time in HH:mm format (24-hour)
  dmEnabled: boolean;
  jobFairEnabled: boolean;
  communityEnabled: boolean;
}

