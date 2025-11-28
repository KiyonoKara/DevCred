import mongoose, { Query } from 'mongoose';
import generateSummaryNotification, {
  getSummaryBreakdown,
  checkPendingSummaryContents,
} from '../../services/notificationSummary.service';
import UserModel from '../../models/users.model';
import ChatModel from '../../models/chat.model';
import MessageModel from '../../models/messages.model';
import JobFairModel from '../../models/jobFair.model';
import CommunityModel from '../../models/community.model';
import QuestionModel from '../../models/questions.model';
import * as notificationService from '../../services/notification.service';
import { DatabaseNotification, DatabaseUser } from '../../types/types';

describe('Notification Summary Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(notificationService, 'createNotification').mockClear();
  });

  describe('generateSummaryNotification', () => {
    const username = 'testuser';
    const mockUser = {
      username,
      notificationPreferences: {
        enabled: true,
        summarized: true,
        dmEnabled: true,
        jobFairEnabled: true,
        communityEnabled: true,
        summaryTime: '09:00',
      },
    };

    it('should return error if user does not exist', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('does not have summarized notifications enabled');
      }
    });

    it('should return error if user does not have summarized notifications enabled', async () => {
      const userWithoutSummary = {
        ...mockUser,
        notificationPreferences: {
          ...mockUser.notificationPreferences,
          summarized: false,
        },
      };

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(userWithoutSummary),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('does not have summarized notifications enabled');
      }
    });

    it('should return error if user does not have notifications enabled', async () => {
      const userWithoutNotifications = {
        ...mockUser,
        notificationPreferences: {
          ...mockUser.notificationPreferences,
          enabled: false,
        },
      };

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(userWithoutNotifications),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('does not have summarized notifications enabled');
      }
    });

    it('should return error if no new notifications to summarize', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      // Mock all models to return empty arrays
      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });
      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });
      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('No new notifications to summarize');
      }
    });

    it('should generate summary with DM notifications', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messageId1 = new mongoose.Types.ObjectId();
      const messageId2 = new mongoose.Types.ObjectId();
      const messageId3 = new mongoose.Types.ObjectId();
      const otherUser = 'otheruser';

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const now = new Date();
      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      yesterdayAt9AM.setMinutes(0, 0);
      yesterdayAt9AM.setSeconds(0, 0);
      yesterdayAt9AM.setMilliseconds(0);

      const mockChat = {
        _id: chatId,
        participants: [username, otherUser],
        messages: [messageId1, messageId2, messageId3],
      };

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockChat]));
        return query;
      });

      const mockMessages = [
        {
          _id: messageId1,
          msgFrom: otherUser,
          type: 'direct',
          msgDateTime: new Date(yesterdayAt9AM.getTime() + 2 * 60 * 60 * 1000),
        },
        {
          _id: messageId2,
          msgFrom: otherUser,
          type: 'direct',
          msgDateTime: new Date(yesterdayAt9AM.getTime() + 8 * 60 * 60 * 1000),
        },
        {
          _id: messageId3,
          msgFrom: otherUser,
          type: 'direct',
          msgDateTime: new Date(yesterdayAt9AM.getTime() + 12 * 60 * 60 * 1000),
        },
      ];

      jest.spyOn(MessageModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve(mockMessages)),
        });
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 3 new DM messages',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.title).toBe('Daily Notification Summary');
        expect(result.message).toContain('3 new DM message');
      }
    }, 30000);

    it('should generate summary with job fair notifications', async () => {
      const jobFairId = new mongoose.Types.ObjectId();
      const now = new Date();

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      yesterdayAt9AM.setMinutes(0, 0);
      yesterdayAt9AM.setSeconds(0, 0);
      yesterdayAt9AM.setMilliseconds(0);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      const mockJobFair1 = {
        _id: jobFairId,
        participants: [username],
        status: 'live',
        createdAt: new Date(yesterdayAt9AM.getTime() + 2 * 60 * 60 * 1000),
        updatedAt: new Date(yesterdayAt9AM.getTime() + 3 * 60 * 60 * 1000),
        startTime: new Date(yesterdayAt9AM.getTime() + 2 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      };
      const mockJobFair2 = {
        _id: new mongoose.Types.ObjectId(),
        participants: [username],
        status: 'live',
        createdAt: new Date(yesterdayAt9AM.getTime() + 4 * 60 * 60 * 1000),
        updatedAt: new Date(yesterdayAt9AM.getTime() + 5 * 60 * 60 * 1000),
        startTime: new Date(yesterdayAt9AM.getTime() + 4 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 14 * 60 * 60 * 1000),
      };

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockJobFair1, mockJobFair2]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 2 job fair updates',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('job fair update');
      }
    }, 30000);

    it('should generate summary with community question notifications', async () => {
      const communityId = new mongoose.Types.ObjectId();
      const questionId = new mongoose.Types.ObjectId();

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const now = new Date();
      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      yesterdayAt9AM.setMinutes(0, 0);
      yesterdayAt9AM.setSeconds(0, 0);
      yesterdayAt9AM.setMilliseconds(0);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      const mockCommunity = {
        _id: communityId,
        name: 'Test Community',
        participants: [username],
      };

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([mockCommunity])),
        });
        return query;
      });

      const mockQuestion = {
        _id: questionId,
        community: communityId,
        askedBy: 'otheruser',
        askDateTime: new Date(yesterdayAt9AM.getTime() + 6 * 60 * 60 * 1000),
        title: 'Test Question',
      };

      jest.spyOn(QuestionModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve([mockQuestion])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 1 new question in followed communities (Test Community: 1)',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('new question');
        expect(result.message).toContain('communities');
        expect(result.message).toContain('Test Community');
      }
    }, 30000);

    it('should use getSinceTime to calculate time window correctly', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messageId = new mongoose.Types.ObjectId();
      const otherUser = 'otheruser';

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const now = new Date();
      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      yesterdayAt9AM.setMinutes(0, 0);
      yesterdayAt9AM.setSeconds(0, 0);
      yesterdayAt9AM.setMilliseconds(0);

      const mockChat = {
        _id: chatId,
        participants: [username, otherUser],
        messages: [messageId],
      };

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockChat]));
        return query;
      });

      const messageTime = new Date(yesterdayAt9AM.getTime() + 2 * 60 * 60 * 1000);
      const mockMessage = {
        _id: messageId,
        msgFrom: otherUser,
        type: 'direct',
        msgDateTime: messageTime,
      };

      jest.spyOn(MessageModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve([mockMessage])),
        });
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 1 new DM message',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('1 new DM message');
      }
    }, 30000);

    it('should use lastLogin when gap exceeds 24 hours', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messageId = new mongoose.Types.ObjectId();
      const otherUser = 'otheruser';

      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      const userWithLastLogin = {
        ...mockUser,
        lastLogin: twoDaysAgo,
      };

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(userWithLastLogin),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const mockChat = {
        _id: chatId,
        participants: [username, otherUser],
        messages: [messageId],
      };

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockChat]));
        return query;
      });

      // Message should be after lastLogin (2 days ago) but before now
      const messageTime = new Date(twoDaysAgo.getTime() + 12 * 60 * 60 * 1000); // 12 hours after lastLogin
      const mockMessage = {
        _id: messageId,
        msgFrom: otherUser,
        type: 'direct',
        msgDateTime: messageTime,
      };

      jest.spyOn(MessageModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve([mockMessage])),
        });
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 1 new DM message',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('1 new DM message');
      }
      // Verify that MessageModel.find was called with sinceTime >= lastLogin
      expect(MessageModel.find).toHaveBeenCalled();
    }, 30000);

    it('should use getSinceTime when lastLogin gap is less than 24 hours', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messageId = new mongoose.Types.ObjectId();
      const otherUser = 'otheruser';

      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago

      const userWithLastLogin = {
        ...mockUser,
        lastLogin: twelveHoursAgo,
      };

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(userWithLastLogin),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const mockChat = {
        _id: chatId,
        participants: [username, otherUser],
        messages: [messageId],
      };

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockChat]));
        return query;
      });

      // Message should be after yesterday at 9 AM (getSinceTime result)
      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      const messageTime = new Date(yesterdayAt9AM.getTime() + 2 * 60 * 60 * 1000);
      const mockMessage = {
        _id: messageId,
        msgFrom: otherUser,
        type: 'direct',
        msgDateTime: messageTime,
      };

      jest.spyOn(MessageModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve([mockMessage])),
        });
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 1 new DM message',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('1 new DM message');
      }
    }, 30000);

    it('should handle invalid summaryTime format in getSinceTime (wrong format)', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messageId = new mongoose.Types.ObjectId();
      const otherUser = 'otheruser';

      const userWithInvalidTime = {
        ...mockUser,
        notificationPreferences: {
          ...mockUser.notificationPreferences,
          summaryTime: 'invalid-time',
        },
      };

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(userWithInvalidTime),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const mockChat = {
        _id: chatId,
        participants: [username, otherUser],
        messages: [messageId],
      };

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockChat]));
        return query;
      });

      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const messageTime = new Date(twentyFourHoursAgo.getTime() + 2 * 60 * 60 * 1000);
      const mockMessage = {
        _id: messageId,
        msgFrom: otherUser,
        type: 'direct',
        msgDateTime: messageTime,
      };

      jest.spyOn(MessageModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve([mockMessage])),
        });
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 1 new DM message',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('1 new DM message');
      }
    }, 30000);

    it('should handle invalid summaryTime format in getSinceTime (NaN values)', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messageId = new mongoose.Types.ObjectId();
      const otherUser = 'otheruser';

      const userWithNaNTime = {
        ...mockUser,
        notificationPreferences: {
          ...mockUser.notificationPreferences,
          summaryTime: 'abc:def', // Will result in NaN when parsed
        },
      };

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(userWithNaNTime),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const mockChat = {
        _id: chatId,
        participants: [username, otherUser],
        messages: [messageId],
      };

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockChat]));
        return query;
      });

      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const messageTime = new Date(twentyFourHoursAgo.getTime() + 2 * 60 * 60 * 1000);
      const mockMessage = {
        _id: messageId,
        msgFrom: otherUser,
        type: 'direct',
        msgDateTime: messageTime,
      };

      jest.spyOn(MessageModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve([mockMessage])),
        });
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 1 new DM message',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('1 new DM message');
      }
    }, 30000);

    it('should generate summary with upcoming job fair notifications', async () => {
      const jobFairId = new mongoose.Types.ObjectId();
      const now = new Date();

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      yesterdayAt9AM.setMinutes(0, 0);
      yesterdayAt9AM.setSeconds(0, 0);
      yesterdayAt9AM.setMilliseconds(0);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      // Job fair starting in 12 hours (within 24 hours)
      const startTime = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      const mockJobFair = {
        _id: jobFairId,
        participants: [username],
        status: 'upcoming',
        createdAt: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        startTime: startTime,
        endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      };

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockJobFair]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 1 job fair starting soon',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('job fair starting soon');
      }
    }, 30000);

    it('should generate summary with ended job fair notifications', async () => {
      const jobFairId = new mongoose.Types.ObjectId();
      const now = new Date();

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      yesterdayAt9AM.setMinutes(0, 0);
      yesterdayAt9AM.setSeconds(0, 0);
      yesterdayAt9AM.setMilliseconds(0);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      // Job fair that ended 2 hours ago (after sinceTime)
      const endTime = new Date(yesterdayAt9AM.getTime() + 12 * 60 * 60 * 1000);
      const mockJobFair = {
        _id: jobFairId,
        participants: [username],
        status: 'ended',
        createdAt: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        startTime: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        endTime: endTime,
      };

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockJobFair]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 1 job fair just ended',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('job fair just ended');
      }
    }, 30000);

    it('should handle plural forms correctly in summary messages', async () => {
      const jobFairId1 = new mongoose.Types.ObjectId();
      const jobFairId2 = new mongoose.Types.ObjectId();
      const now = new Date();

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      yesterdayAt9AM.setMinutes(0, 0);
      yesterdayAt9AM.setSeconds(0, 0);
      yesterdayAt9AM.setMilliseconds(0);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      const startTime1 = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      const startTime2 = new Date(now.getTime() + 18 * 60 * 60 * 1000);
      const mockJobFair1 = {
        _id: jobFairId1,
        participants: [username],
        status: 'upcoming',
        createdAt: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        startTime: startTime1,
        endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      };
      const mockJobFair2 = {
        _id: jobFairId2,
        participants: [username],
        status: 'upcoming',
        createdAt: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        startTime: startTime2,
        endTime: new Date(now.getTime() + 30 * 60 * 60 * 1000),
      };

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockJobFair1, mockJobFair2]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 2 job fairs starting soon',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('2 job fairs starting soon');
      }
    }, 30000);

    it('should generate summary with combined notification types', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messageId = new mongoose.Types.ObjectId();
      const jobFairId = new mongoose.Types.ObjectId();
      const communityId = new mongoose.Types.ObjectId();
      const questionId = new mongoose.Types.ObjectId();
      const otherUser = 'otheruser';

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const now = new Date();
      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      yesterdayAt9AM.setMinutes(0, 0);
      yesterdayAt9AM.setSeconds(0, 0);
      yesterdayAt9AM.setMilliseconds(0);

      const mockChat = {
        _id: chatId,
        participants: [username, otherUser],
        messages: [messageId],
      };

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockChat]));
        return query;
      });

      const mockMessage = {
        _id: messageId,
        msgFrom: otherUser,
        type: 'direct',
        msgDateTime: new Date(yesterdayAt9AM.getTime() + 2 * 60 * 60 * 1000),
      };

      jest.spyOn(MessageModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve([mockMessage])),
        });
        return query;
      });

      const mockJobFair = {
        _id: jobFairId,
        participants: [username],
        status: 'live',
        createdAt: new Date(yesterdayAt9AM.getTime() + 2 * 60 * 60 * 1000),
        updatedAt: new Date(yesterdayAt9AM.getTime() + 3 * 60 * 60 * 1000),
        startTime: new Date(yesterdayAt9AM.getTime() + 2 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      };

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockJobFair]));
        return query;
      });

      const mockCommunity = {
        _id: communityId,
        name: 'Test Community',
        participants: [username],
      };

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([mockCommunity])),
        });
        return query;
      });

      const mockQuestion = {
        _id: questionId,
        community: communityId,
        askedBy: 'otheruser',
        askDateTime: new Date(yesterdayAt9AM.getTime() + 6 * 60 * 60 * 1000),
        title: 'Test Question',
      };

      jest.spyOn(QuestionModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve([mockQuestion])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message:
          'Summary: 1 new DM message; 1 job fair update; 1 new question in followed communities (Test Community: 1)',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('1 new DM message');
        expect(result.message).toContain('1 job fair update');
        expect(result.message).toContain('1 new question');
        expect(result.message).toContain('Test Community');
      }
    }, 30000);

    it('should handle createNotification error', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messageId = new mongoose.Types.ObjectId();
      const otherUser = 'otheruser';

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const now = new Date();
      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      yesterdayAt9AM.setMinutes(0, 0);
      yesterdayAt9AM.setSeconds(0, 0);
      yesterdayAt9AM.setMilliseconds(0);

      const mockChat = {
        _id: chatId,
        participants: [username, otherUser],
        messages: [messageId],
      };

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockChat]));
        return query;
      });

      const mockMessage = {
        _id: messageId,
        msgFrom: otherUser,
        type: 'direct',
        msgDateTime: new Date(yesterdayAt9AM.getTime() + 2 * 60 * 60 * 1000),
      };

      jest.spyOn(MessageModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve([mockMessage])),
        });
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      (notificationService.createNotification as jest.Mock).mockResolvedValue({
        error: 'Error creating notification: Database error',
      });

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error creating notification');
      }
    }, 30000);

    it('should handle errors in catch block', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error('Database connection error')),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error generating summary notification');
      }
    }, 30000);

    it('should handle community without name (uses ID)', async () => {
      const communityId = new mongoose.Types.ObjectId();
      const questionId = new mongoose.Types.ObjectId();

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const now = new Date();
      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      yesterdayAt9AM.setMinutes(0, 0);
      yesterdayAt9AM.setSeconds(0, 0);
      yesterdayAt9AM.setMilliseconds(0);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      const mockCommunity = {
        _id: communityId,
        name: undefined, // No name
        participants: [username],
      };

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([mockCommunity])),
        });
        return query;
      });

      const mockQuestion = {
        _id: questionId,
        community: communityId,
        askedBy: 'otheruser',
        askDateTime: new Date(yesterdayAt9AM.getTime() + 6 * 60 * 60 * 1000),
        title: 'Test Question',
      };

      jest.spyOn(QuestionModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve([mockQuestion])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: `Summary: 1 new question in followed communities (Community ${communityId}: 1)`,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain(`Community ${communityId}`);
      }
    }, 30000);

    it('should use default summaryTime when not provided', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messageId = new mongoose.Types.ObjectId();
      const otherUser = 'otheruser';

      const userWithoutSummaryTime = {
        ...mockUser,
        notificationPreferences: {
          ...mockUser.notificationPreferences,
          summaryTime: undefined,
        },
      };

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(userWithoutSummaryTime),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const mockChat = {
        _id: chatId,
        participants: [username, otherUser],
        messages: [messageId],
      };

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockChat]));
        return query;
      });

      const now = new Date();
      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      const messageTime = new Date(yesterdayAt9AM.getTime() + 2 * 60 * 60 * 1000);
      const mockMessage = {
        _id: messageId,
        msgFrom: otherUser,
        type: 'direct',
        msgDateTime: messageTime,
      };

      jest.spyOn(MessageModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve([mockMessage])),
        });
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 1 new DM message',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('1 new DM message');
      }
    }, 30000);

    it('should generate summary with ended job fair status', async () => {
      const jobFairId = new mongoose.Types.ObjectId();
      const now = new Date();

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      yesterdayAt9AM.setMinutes(0, 0);
      yesterdayAt9AM.setSeconds(0, 0);
      yesterdayAt9AM.setMilliseconds(0);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      const mockJobFair = {
        _id: jobFairId,
        participants: [username],
        status: 'ended',
        createdAt: new Date(yesterdayAt9AM.getTime() + 2 * 60 * 60 * 1000),
        updatedAt: new Date(yesterdayAt9AM.getTime() + 3 * 60 * 60 * 1000),
        startTime: new Date(yesterdayAt9AM.getTime() + 2 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      };

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockJobFair]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 1 job fair update',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('job fair update');
      }
    }, 30000);

    it('should handle plural forms for ended job fairs', async () => {
      const jobFairId1 = new mongoose.Types.ObjectId();
      const jobFairId2 = new mongoose.Types.ObjectId();
      const now = new Date();

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      yesterdayAt9AM.setMinutes(0, 0);
      yesterdayAt9AM.setSeconds(0, 0);
      yesterdayAt9AM.setMilliseconds(0);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      const endTime1 = new Date(yesterdayAt9AM.getTime() + 6 * 60 * 60 * 1000);
      const endTime2 = new Date(yesterdayAt9AM.getTime() + 8 * 60 * 60 * 1000);
      const mockJobFair1 = {
        _id: jobFairId1,
        participants: [username],
        status: 'ended',
        createdAt: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        startTime: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        endTime: endTime1,
      };
      const mockJobFair2 = {
        _id: jobFairId2,
        participants: [username],
        status: 'ended',
        createdAt: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        startTime: new Date(yesterdayAt9AM.getTime() - 2 * 60 * 60 * 1000),
        endTime: endTime2,
      };

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockJobFair1, mockJobFair2]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 2 job fairs just ended',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('2 job fairs just ended');
      }
    }, 30000);

    it('should handle plural forms for community questions', async () => {
      const communityId = new mongoose.Types.ObjectId();
      const questionId1 = new mongoose.Types.ObjectId();
      const questionId2 = new mongoose.Types.ObjectId();

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const now = new Date();
      const yesterdayAt9AM = new Date(now);
      yesterdayAt9AM.setDate(yesterdayAt9AM.getDate() - 1);
      yesterdayAt9AM.setHours(9, 0, 0, 0);
      yesterdayAt9AM.setMinutes(0, 0);
      yesterdayAt9AM.setSeconds(0, 0);
      yesterdayAt9AM.setMilliseconds(0);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      const mockCommunity = {
        _id: communityId,
        name: 'Test Community',
        participants: [username],
      };

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([mockCommunity])),
        });
        return query;
      });

      const mockQuestions = [
        {
          _id: questionId1,
          community: communityId,
          askedBy: 'otheruser1',
          askDateTime: new Date(yesterdayAt9AM.getTime() + 6 * 60 * 60 * 1000),
          title: 'Test Question 1',
        },
        {
          _id: questionId2,
          community: communityId,
          askedBy: 'otheruser2',
          askDateTime: new Date(yesterdayAt9AM.getTime() + 8 * 60 * 60 * 1000),
          title: 'Test Question 2',
        },
      ];

      jest.spyOn(QuestionModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve(mockQuestions)),
        });
        return query;
      });

      const mockSummaryNotification: DatabaseNotification = {
        _id: new mongoose.Types.ObjectId(),
        recipient: username,
        type: 'dm',
        title: 'Daily Notification Summary',
        message: 'Summary: 2 new questions in followed communities (Test Community: 2)',
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockSummaryNotification,
      );

      const result = await generateSummaryNotification(username);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.message).toContain('2 new questions');
        expect(result.message).toContain('Test Community: 2');
      }
    }, 30000);
  });

  describe('getSummaryBreakdown', () => {
    const username = 'testuser';
    const mockUser = {
      username,
      notificationPreferences: {
        enabled: true,
        summarized: true,
        dmEnabled: true,
        jobFairEnabled: true,
        communityEnabled: true,
        summaryTime: '09:00',
      },
    };

    it('should return error if user not found', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const sinceTime = new Date();
      const result = await getSummaryBreakdown(username, sinceTime);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toBe('User not found');
      }
    });

    it('should return breakdown with DM messages', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messageId1 = new mongoose.Types.ObjectId();
      const messageId2 = new mongoose.Types.ObjectId();
      const otherUser = 'otheruser';
      const sinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const mockChat = {
        _id: chatId,
        participants: [username, otherUser],
        messages: [messageId1, messageId2],
        deletedBy: [],
      };

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockChat]));
        return query;
      });

      const mockMessages = [
        {
          _id: messageId1,
          msgFrom: otherUser,
          type: 'direct',
          msgDateTime: new Date(sinceTime.getTime() + 2 * 60 * 60 * 1000),
        },
        {
          _id: messageId2,
          msgFrom: otherUser,
          type: 'direct',
          msgDateTime: new Date(sinceTime.getTime() + 4 * 60 * 60 * 1000),
        },
      ];

      jest.spyOn(MessageModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve(mockMessages)),
        });
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      const result = await getSummaryBreakdown(username, sinceTime);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        const dmMessage = result.dmMessages[chatId.toString()];
        expect(dmMessage).toBeDefined();
        expect(dmMessage.otherUser).toBe(otherUser);
        expect(dmMessage.count).toBe(2);
        if ('isDeleted' in dmMessage) {
          expect(dmMessage.isDeleted).toBe(false);
        }
      }
    });

    it('should return breakdown with deleted chat', async () => {
      const chatId = new mongoose.Types.ObjectId();
      const messageId = new mongoose.Types.ObjectId();
      const otherUser = 'otheruser';
      const sinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const mockChat = {
        _id: chatId,
        participants: [username, otherUser],
        messages: [messageId],
        deletedBy: [{ username: username }], // Chat deleted by user
      };

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockChat]));
        return query;
      });

      const mockMessage = {
        _id: messageId,
        msgFrom: otherUser,
        type: 'direct',
        msgDateTime: new Date(sinceTime.getTime() + 2 * 60 * 60 * 1000),
      };

      jest.spyOn(MessageModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue({
          exec: jest.fn().mockReturnValue(Promise.resolve([mockMessage])),
        });
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      const result = await getSummaryBreakdown(username, sinceTime);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        const dmMessage = result.dmMessages[chatId.toString()];
        expect(dmMessage).toBeDefined();
        expect(dmMessage.otherUser).toBe(otherUser);
        expect(dmMessage.count).toBe(1);
        if ('isDeleted' in dmMessage) {
          expect(dmMessage.isDeleted).toBe(true);
        }
      }
    });

    it('should return breakdown with community questions', async () => {
      const communityId = new mongoose.Types.ObjectId();
      const questionId = new mongoose.Types.ObjectId();
      const sinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      const mockCommunity = {
        _id: communityId,
        name: 'Test Community',
        participants: [username],
      };

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([mockCommunity])),
        });
        return query;
      });

      const mockQuestion = {
        _id: questionId,
        title: 'Test Question',
        askedBy: 'otheruser',
        askDateTime: new Date(sinceTime.getTime() + 2 * 60 * 60 * 1000),
      };

      jest.spyOn(QuestionModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockReturnValue(Promise.resolve([mockQuestion])),
          }),
        });
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      const result = await getSummaryBreakdown(username, sinceTime);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.communityQuestions[communityId.toString()]).toBeDefined();
        expect(result.communityQuestions[communityId.toString()].communityName).toBe(
          'Test Community',
        );
        expect(result.communityQuestions[communityId.toString()].count).toBe(1);
        expect(result.communityQuestions[communityId.toString()].questions).toHaveLength(1);
      }
    });

    it('should return breakdown with job fair updates', async () => {
      const jobFairId = new mongoose.Types.ObjectId();
      const sinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const now = new Date();

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockJobFair = {
        _id: jobFairId,
        participants: [username],
        status: 'live',
        title: 'Test Job Fair',
        createdAt: new Date(sinceTime.getTime() + 2 * 60 * 60 * 1000),
        updatedAt: new Date(sinceTime.getTime() + 3 * 60 * 60 * 1000),
        startTime: new Date(sinceTime.getTime() + 2 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      };

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockJobFair]));
        return query;
      });

      const result = await getSummaryBreakdown(username, sinceTime);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.jobFairs).toHaveLength(1);
        expect(result.jobFairs[0]._id).toBe(jobFairId.toString());
        expect(result.jobFairs[0].title).toBe('Test Job Fair');
        expect(result.jobFairs[0].status).toBe('live');
      }
    });

    it('should handle errors in getSummaryBreakdown', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error')),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      const sinceTime = new Date();
      const result = await getSummaryBreakdown(username, sinceTime);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error getting summary breakdown');
      }
    });

    it('should handle community without name in getSummaryBreakdown', async () => {
      const communityId = new mongoose.Types.ObjectId();
      const questionId = new mongoose.Types.ObjectId();
      const sinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      const mockCommunity = {
        _id: communityId,
        name: undefined,
        participants: [username],
      };

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([mockCommunity])),
        });
        return query;
      });

      const mockQuestion = {
        _id: questionId,
        title: undefined,
        askedBy: undefined,
        askDateTime: undefined,
      };

      jest.spyOn(QuestionModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockReturnValue(Promise.resolve([mockQuestion])),
          }),
        });
        return query;
      });

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      const result = await getSummaryBreakdown(username, sinceTime);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.communityQuestions[communityId.toString()]).toBeDefined();
        expect(result.communityQuestions[communityId.toString()].communityName).toContain(
          `Community ${communityId}`,
        );
        expect(result.communityQuestions[communityId.toString()].questions[0].title).toBe('');
        expect(result.communityQuestions[communityId.toString()].questions[0].askedBy).toBe('');
      }
    });

    it('should handle job fair conditions in getSummaryBreakdown', async () => {
      const jobFairId1 = new mongoose.Types.ObjectId();
      const jobFairId2 = new mongoose.Types.ObjectId();
      const sinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const now = new Date();

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      // Job fair that was created after sinceTime
      const mockJobFair1 = {
        _id: jobFairId1,
        participants: [username],
        status: 'live',
        title: 'Job Fair 1',
        createdAt: new Date(sinceTime.getTime() + 2 * 60 * 60 * 1000),
        updatedAt: new Date(sinceTime.getTime() + 2 * 60 * 60 * 1000),
        startTime: new Date(sinceTime.getTime() + 2 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 12 * 60 * 60 * 1000),
      };

      // Upcoming job fair starting soon
      const startTime = new Date(now.getTime() + 12 * 60 * 60 * 1000);
      const mockJobFair2 = {
        _id: jobFairId2,
        participants: [username],
        status: 'upcoming',
        title: 'Job Fair 2',
        createdAt: new Date(sinceTime.getTime() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(sinceTime.getTime() - 2 * 60 * 60 * 1000),
        startTime: startTime,
        endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      };

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockJobFair1, mockJobFair2]));
        return query;
      });

      const result = await getSummaryBreakdown(username, sinceTime);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.jobFairs.length).toBeGreaterThan(0);
      }
    });

    it('should handle job fair with missing fields in getSummaryBreakdown', async () => {
      const jobFairId = new mongoose.Types.ObjectId();
      const sinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockJobFair = {
        _id: jobFairId,
        participants: [username],
        status: 'live',
        title: undefined,
        createdAt: new Date(sinceTime.getTime() + 2 * 60 * 60 * 1000),
        updatedAt: new Date(sinceTime.getTime() + 2 * 60 * 60 * 1000),
        startTime: undefined,
        endTime: undefined,
      };

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockJobFair]));
        return query;
      });

      const result = await getSummaryBreakdown(username, sinceTime);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.jobFairs.length).toBeGreaterThan(0);
        expect(result.jobFairs[0].title).toBe('');
        expect(result.jobFairs[0].status).toBe('live');
      }
    });

    it('should handle job fair with undefined status in getSummaryBreakdown', async () => {
      const jobFairId = new mongoose.Types.ObjectId();
      const sinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      jest.spyOn(ChatModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      jest.spyOn(CommunityModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.select = jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue(Promise.resolve([])),
        });
        return query;
      });

      const mockJobFair = {
        _id: jobFairId,
        participants: [username],
        status: undefined,
        title: 'Test Job Fair',
        createdAt: new Date(sinceTime.getTime() + 2 * 60 * 60 * 1000),
        updatedAt: new Date(sinceTime.getTime() + 2 * 60 * 60 * 1000),
        startTime: new Date(sinceTime.getTime() + 2 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
      };

      jest.spyOn(JobFairModel, 'find').mockImplementation(() => {
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockJobFair]));
        return query;
      });

      const result = await getSummaryBreakdown(username, sinceTime);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.jobFairs.length).toBeGreaterThan(0);
        expect(result.jobFairs[0].status).toBe('upcoming');
      }
    });
  });

  describe('checkPendingSummaryContents', () => {
    const username = 'testuser';

    it('should return early if user does not exist', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      await expect(checkPendingSummaryContents(username)).resolves.toBeUndefined();
    });

    it('should return early if user does not have notifications enabled', async () => {
      const userWithoutNotifications = {
        username,
        notificationPreferences: {
          enabled: false,
          summarized: true,
        },
      };

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(userWithoutNotifications),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      await expect(checkPendingSummaryContents(username)).resolves.toBeUndefined();
    });

    it('should return early if user does not have summarized notifications enabled', async () => {
      const userWithoutSummary = {
        username,
        notificationPreferences: {
          enabled: true,
          summarized: false,
        },
      };

      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(userWithoutSummary),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      await expect(checkPendingSummaryContents(username)).resolves.toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      jest.spyOn(UserModel, 'findOne').mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database error')),
      } as unknown as Query<DatabaseUser, typeof UserModel>);

      // Should not throw, but log error
      await expect(checkPendingSummaryContents(username)).resolves.toBeUndefined();
    });
  });
});
