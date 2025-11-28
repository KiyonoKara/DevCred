import express, { Request, Response } from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  getUnreadNotificationCount,
} from '../services/notification.service';
import generateSummaryNotification, {
  getSummaryBreakdown,
} from '../services/notificationSummary.service';
import NotificationModel from '../models/notification.model';
import { FakeSOSocket } from '../types/types';

/**
 * Express controller for handling notification-related requests.
 * @param socket The socket instance used for emitting notifications.
 * @returns An Express router with endpoints for notification actions.
 */
const notificationController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Gets all notifications for a user.
   * @param req The request object containing the username.
   * @param res The response object to send the result.
   */
  const getNotificationsRoute = async (req: Request, res: Response) => {
    try {
      const username = req.headers.username as string;
      const { unreadOnly } = req.query;

      if (!username) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const notifications = await getUserNotifications(username, unreadOnly === 'true');

      if ('error' in notifications) {
        throw new Error(notifications.error);
      }

      res.status(200).json(notifications);
    } catch (error) {
      res.status(500).send(`Error retrieving notifications: ${(error as Error).message}`);
    }
  };

  /**
   * Gets unread notification count for a user.
   * @param req The request object containing the username.
   * @param res The response object to send the result.
   */
  const getUnreadCountRoute = async (req: Request, res: Response) => {
    try {
      const username = req.headers.username as string;

      if (!username) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const count = await getUnreadNotificationCount(username);
      res.status(200).json({ count });
    } catch (error) {
      res.status(500).send(`Error retrieving unread count: ${(error as Error).message}`);
    }
  };

  /**
   * Marks a notification as read.
   * @param req The request object containing the notification ID.
   * @param res The response object to send the result.
   */
  const markAsReadRoute = async (req: Request, res: Response) => {
    try {
      const { notificationId } = req.params;
      const username = req.headers.username as string;

      if (!username) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await markNotificationAsRead(notificationId, username);

      if ('error' in result) {
        if (result.error.includes('not found')) {
          return res.status(404).json({ error: result.error });
        }
        if (result.error.includes('Unauthorized')) {
          return res.status(403).json({ error: result.error });
        }
        throw new Error(result.error);
      }

      res.status(200).json(result);
    } catch (error) {
      res.status(500).send(`Error marking notification as read: ${(error as Error).message}`);
    }
  };

  /**
   * Marks all notifications as read for a user.
   * @param req The request object containing the username.
   * @param res The response object to send the result.
   */
  const markAllAsReadRoute = async (req: Request, res: Response) => {
    try {
      const username = req.headers.username as string;

      if (!username) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await markAllNotificationsAsRead(username);

      if ('error' in result) {
        throw new Error(result.error);
      }

      res.status(200).json(result);
    } catch (error) {
      res.status(500).send(`Error marking all notifications as read: ${(error as Error).message}`);
    }
  };

  /**
   * Clears all notifications for a user.
   * @param req The request object containing the username.
   * @param res The response object to send the result.
   */
  const clearAllRoute = async (req: Request, res: Response) => {
    try {
      const username = req.headers.username as string;

      if (!username) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await clearAllNotifications(username);

      if ('error' in result) {
        throw new Error(result.error);
      }

      res.status(200).json(result);
    } catch (error) {
      res.status(500).send(`Error clearing notifications: ${(error as Error).message}`);
    }
  };

  /**
   * Generates a summary notification for the current user.
   * @param req The request object containing the username.
   * @param res The response object to send the result.
   */
  const generateSummaryRoute = async (req: Request, res: Response) => {
    try {
      const username = req.headers.username as string;

      if (!username) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await generateSummaryNotification(username);

      if ('error' in result) {
        if (result.error.includes('does not have summarized')) {
          return res.status(400).json({ error: result.error });
        }
        if (result.error.includes('No new notifications')) {
          return res.status(200).json({ message: result.error });
        }
        throw new Error(result.error);
      }

      // Emit real-time notification
      socket.to(`user_${username}`).emit('notification', result);

      res.status(200).json(result);
    } catch (error) {
      res.status(500).send(`Error generating summary: ${(error as Error).message}`);
    }
  };

  /**
   * Gets detailed breakdown for a summary notification.
   * @param req The request object containing the notification ID.
   * @param res The response object to send the result.
   */
  const getSummaryBreakdownRoute = async (req: Request, res: Response) => {
    try {
      const { notificationId } = req.params;
      const username = req.headers.username as string;

      if (!username) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Find the summary notification
      const notification = await NotificationModel.findOne({
        _id: notificationId,
        recipient: username,
        type: 'dm',
        message: { $regex: /^Summary:/ },
      }).lean();

      if (!notification || !notification.createdAt) {
        return res.status(404).json({ error: 'Summary notification not found' });
      }

      // Get the sinceTime (yesterday at summary time)
      const user = await import('../models/users.model').then(m => m.default);
      const userDoc = await user.findOne({ username }).select('notificationPreferences').lean();
      const summaryTime = userDoc?.notificationPreferences?.summaryTime || '09:00';

      // Calculate sinceTime (yesterday at summary time)
      const now = new Date();
      const timeParts = summaryTime.split(':');
      const summaryHour = parseInt(timeParts[0], 10);
      const summaryMinute = parseInt(timeParts[1], 10);
      const sinceTime = new Date(now);
      sinceTime.setDate(sinceTime.getDate() - 1);
      sinceTime.setHours(summaryHour, summaryMinute, 0, 0);
      sinceTime.setSeconds(0, 0);

      const breakdown = await getSummaryBreakdown(username, sinceTime);

      if ('error' in breakdown) {
        return res.status(500).json({ error: breakdown.error });
      }

      res.status(200).json(breakdown);
    } catch (error) {
      res.status(500).send(`Error getting summary breakdown: ${(error as Error).message}`);
    }
  };

  // Register routes (more specific routes first to avoid conflicts)
  router.get('/count', getUnreadCountRoute);
  router.get('/:notificationId/summary-breakdown', getSummaryBreakdownRoute);
  router.get('/', getNotificationsRoute);
  router.post('/generate-summary', generateSummaryRoute);
  router.patch('/:notificationId/read', markAsReadRoute);
  router.patch('/read-all', markAllAsReadRoute);
  router.delete('/clear-all', clearAllRoute);

  return router;
};

export default notificationController;
