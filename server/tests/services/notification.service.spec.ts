import mongoose from 'mongoose';
import NotificationModel from '../../models/notification.model';
import {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  getUnreadNotificationCount,
} from '../../services/notification.service';

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const notificationData = {
        recipient: 'testuser',
        type: 'dm' as const,
        title: 'Test Notification',
        message: 'This is a test',
        read: false,
      };

      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        ...notificationData,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: jest.fn().mockReturnValue(notificationData),
      };

      jest.spyOn(NotificationModel, 'create').mockResolvedValue(mockNotification as any);

      const result = await createNotification(notificationData);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.recipient).toBe('testuser');
        expect(result.title).toBe('Test Notification');
      }
    });

    it('should handle notification with null relatedId', async () => {
      const notificationData = {
        recipient: 'testuser',
        type: 'dm' as const,
        title: 'Test Notification',
        message: 'This is a test',
        read: false,
      };

      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        ...notificationData,
        relatedId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: jest.fn().mockReturnValue({ ...notificationData, relatedId: null }),
      };

      jest.spyOn(NotificationModel, 'create').mockResolvedValue(mockNotification as any);

      const result = await createNotification(notificationData);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.relatedId).toBeUndefined();
      }
    });

    it('should handle notification without toObject method', async () => {
      const notificationData = {
        recipient: 'testuser',
        type: 'dm' as const,
        title: 'Test Notification',
        message: 'This is a test',
        read: false,
      };

      const mockNotification = {
        _id: new mongoose.Types.ObjectId(),
        ...notificationData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(NotificationModel, 'create').mockResolvedValue(mockNotification as any);

      const result = await createNotification(notificationData);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.recipient).toBe('testuser');
      }
    });

    it('should handle error when creating notification', async () => {
      const notificationData = {
        recipient: 'testuser',
        type: 'dm' as const,
        title: 'Test Notification',
        message: 'This is a test',
        read: false,
      };

      jest
        .spyOn(NotificationModel, 'create')
        .mockRejectedValue(new Error('Database connection error'));

      const result = await createNotification(notificationData);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error creating notification');
      }
    });
  });

  describe('getUserNotifications', () => {
    it('should get all notifications for a user', async () => {
      const username = 'testuser';
      const mockNotifications = [
        {
          _id: new mongoose.Types.ObjectId(),
          recipient: username,
          type: 'dm' as const,
          title: 'Notification 1',
          message: 'Message 1',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          recipient: username,
          type: 'dm' as const,
          title: 'Notification 2',
          message: 'Message 2',
          read: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockNotifications),
      };

      jest.spyOn(NotificationModel, 'find').mockReturnValue(mockQuery as any);

      const result = await getUserNotifications(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(2);
        expect(result[0].title).toBe('Notification 1');
      }
    });

    it('should get only unread notifications when unreadOnly is true', async () => {
      const username = 'testuser';
      const mockNotifications = [
        {
          _id: new mongoose.Types.ObjectId(),
          recipient: username,
          type: 'dm' as const,
          title: 'Unread Notification',
          message: 'Message',
          read: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockNotifications),
      };

      jest.spyOn(NotificationModel, 'find').mockReturnValue(mockQuery as any);

      const result = await getUserNotifications(username, true);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(1);
        expect(result[0].read).toBe(false);
      }
    });

    it('should handle notifications with null relatedId', async () => {
      const username = 'testuser';
      const mockNotifications = [
        {
          _id: new mongoose.Types.ObjectId(),
          recipient: username,
          type: 'dm' as const,
          title: 'Notification',
          message: 'Message',
          read: false,
          relatedId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockNotifications),
      };

      jest.spyOn(NotificationModel, 'find').mockReturnValue(mockQuery as any);

      const result = await getUserNotifications(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(Array.isArray(result)).toBe(true);
        expect(result[0].relatedId).toBeUndefined();
      }
    });

    it('should handle error when retrieving notifications', async () => {
      const username = 'testuser';

      jest.spyOn(NotificationModel, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockRejectedValue(new Error('Database error')),
      } as any);

      const result = await getUserNotifications(username);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error retrieving notifications');
      }
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read successfully', async () => {
      const notificationId = new mongoose.Types.ObjectId().toString();
      const username = 'testuser';

      const mockNotification = {
        _id: notificationId,
        recipient: username,
        type: 'dm' as const,
        title: 'Test Notification',
        message: 'This is a test',
        read: false,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: notificationId,
          recipient: username,
          type: 'dm' as const,
          title: 'Test Notification',
          message: 'This is a test',
          read: true,
        }),
      };

      jest.spyOn(NotificationModel, 'findById').mockResolvedValue(mockNotification as any);

      const result = await markNotificationAsRead(notificationId, username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.read).toBe(true);
        expect(mockNotification.save).toHaveBeenCalled();
      }
    });

    it('should return error if notification not found', async () => {
      const notificationId = new mongoose.Types.ObjectId().toString();
      const username = 'testuser';

      jest.spyOn(NotificationModel, 'findById').mockResolvedValue(null);

      const result = await markNotificationAsRead(notificationId, username);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Notification not found');
      }
    });

    it('should return error if user is not authorized', async () => {
      const notificationId = new mongoose.Types.ObjectId().toString();
      const username = 'testuser';
      const otherUser = 'otheruser';

      const mockNotification = {
        _id: notificationId,
        recipient: otherUser,
        type: 'dm' as const,
        title: 'Test Notification',
        message: 'This is a test',
        read: false,
      };

      jest.spyOn(NotificationModel, 'findById').mockResolvedValue(mockNotification as any);

      const result = await markNotificationAsRead(notificationId, username);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('Unauthorized to mark this notification as read');
      }
    });

    it('should handle notification without toObject method', async () => {
      const notificationId = new mongoose.Types.ObjectId().toString();
      const username = 'testuser';

      const mockNotification = {
        _id: notificationId,
        recipient: username,
        type: 'dm' as const,
        title: 'Test Notification',
        message: 'This is a test',
        read: false,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(NotificationModel, 'findById').mockResolvedValue(mockNotification as any);

      const result = await markNotificationAsRead(notificationId, username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.read).toBe(true);
      }
    });

    it('should handle notification with null relatedId', async () => {
      const notificationId = new mongoose.Types.ObjectId().toString();
      const username = 'testuser';

      const mockNotification = {
        _id: notificationId,
        recipient: username,
        type: 'dm' as const,
        title: 'Test Notification',
        message: 'This is a test',
        read: false,
        relatedId: null,
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: notificationId,
          recipient: username,
          type: 'dm' as const,
          title: 'Test Notification',
          message: 'This is a test',
          read: true,
          relatedId: null,
        }),
      };

      jest.spyOn(NotificationModel, 'findById').mockResolvedValue(mockNotification as any);

      const result = await markNotificationAsRead(notificationId, username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.relatedId).toBeUndefined();
      }
    });

    it('should handle error when marking notification as read', async () => {
      const notificationId = new mongoose.Types.ObjectId().toString();
      const username = 'testuser';

      jest
        .spyOn(NotificationModel, 'findById')
        .mockRejectedValue(new Error('Database connection error'));

      const result = await markNotificationAsRead(notificationId, username);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error marking notification as read');
      }
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      const username = 'testuser';

      jest.spyOn(NotificationModel, 'updateMany').mockResolvedValue({
        matchedCount: 5,
        modifiedCount: 5,
      } as any);

      const result = await markAllNotificationsAsRead(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.success).toBe(true);
      }
      expect(NotificationModel.updateMany).toHaveBeenCalledWith(
        { recipient: username, read: false },
        { read: true },
      );
    });

    it('should handle error when marking all notifications as read', async () => {
      const username = 'testuser';

      jest
        .spyOn(NotificationModel, 'updateMany')
        .mockRejectedValue(new Error('Database connection error'));

      const result = await markAllNotificationsAsRead(username);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error marking all notifications as read');
      }
    });
  });

  describe('clearAllNotifications', () => {
    it('should clear all notifications successfully', async () => {
      const username = 'testuser';

      jest.spyOn(NotificationModel, 'deleteMany').mockResolvedValue({
        deletedCount: 10,
      } as any);

      const result = await clearAllNotifications(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.success).toBe(true);
      }
      expect(NotificationModel.deleteMany).toHaveBeenCalledWith({ recipient: username });
    });

    it('should handle error when clearing notifications', async () => {
      const username = 'testuser';

      jest
        .spyOn(NotificationModel, 'deleteMany')
        .mockRejectedValue(new Error('Database connection error'));

      const result = await clearAllNotifications(username);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error clearing notifications');
      }
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should get unread notification count successfully', async () => {
      const username = 'testuser';
      const expectedCount = 5;

      jest.spyOn(NotificationModel, 'countDocuments').mockResolvedValue(expectedCount);

      const result = await getUnreadNotificationCount(username);

      expect(result).toBe(expectedCount);
      expect(NotificationModel.countDocuments).toHaveBeenCalledWith({
        recipient: username,
        read: false,
      });
    });

    it('should return 0 when error occurs', async () => {
      const username = 'testuser';

      jest
        .spyOn(NotificationModel, 'countDocuments')
        .mockRejectedValue(new Error('Database connection error'));

      const result = await getUnreadNotificationCount(username);

      expect(result).toBe(0);
    });

    it('should return 0 when no unread notifications', async () => {
      const username = 'testuser';

      jest.spyOn(NotificationModel, 'countDocuments').mockResolvedValue(0);

      const result = await getUnreadNotificationCount(username);

      expect(result).toBe(0);
    });
  });
});
