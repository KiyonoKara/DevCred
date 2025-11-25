import { ObjectId } from 'mongodb';
import UserMetricsModel from '../../models/userMetrics.model';
import { userMetricsService } from '../../services/userMetrics.service';
import { DatabaseUserMetrics, UserMetrics } from '@fake-stack-overflow/shared/types/userMetrics';
import { FakeSOSocket } from '../../types/types';

// Mock socket
const mockSocket: FakeSOSocket = {
  emit: jest.fn(),
} as unknown as FakeSOSocket;

describe('UserMetrics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeMetrics', () => {
    it('should create metrics for a new user with default values', async () => {
      const username = 'testuser';
      const mockMetrics: DatabaseUserMetrics = {
        _id: new ObjectId(),
        username,
        totalQuestions: 0,
        totalAnswers: 0,
        totalComments: 0,
        reputationPoints: 0,
        questionsAnswered: [],
        questionsAsked: [],
        viewsReceived: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(UserMetricsModel, 'create').mockResolvedValueOnce({
        toObject: () => mockMetrics,
      } as any);

      const result = await userMetricsService.initializeMetrics(username);

      expect(result).toEqual(mockMetrics);
      expect(UserMetricsModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username,
          totalQuestions: 0,
          totalAnswers: 0,
          totalComments: 0,
          reputationPoints: 0,
          questionsAnswered: [],
          questionsAsked: [],
          viewsReceived: 0,
        }),
      );
    });

    it('should return null if create fails', async () => {
      const username = 'testuser';
      jest.spyOn(UserMetricsModel, 'create').mockResolvedValueOnce(null as any);

      const result = await userMetricsService.initializeMetrics(username);

      expect(result).toBeNull();
    });
  });

  describe('getMetrics', () => {
    it('should return metrics for a user without populating', async () => {
      const username = 'testuser';
      const mockMetrics: DatabaseUserMetrics = {
        _id: new ObjectId(),
        username,
        totalQuestions: 5,
        totalAnswers: 10,
        totalComments: 3,
        reputationPoints: 100,
        questionsAnswered: [new ObjectId()],
        questionsAsked: [new ObjectId()],
        viewsReceived: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockQuery = {
        exec: jest.fn().mockResolvedValue({
          toObject: () => mockMetrics,
        }),
      };

      jest.spyOn(UserMetricsModel, 'findOne').mockReturnValue(mockQuery as any);

      const result = await userMetricsService.getMetrics(username, false);

      expect(result).toEqual(mockMetrics);
      expect(UserMetricsModel.findOne).toHaveBeenCalledWith({ username });
    });

    it('should return populated metrics when populate is true', async () => {
      const username = 'testuser';
      const mockPopulatedMetrics = {
        _id: new ObjectId(),
        username,
        totalQuestions: 5,
        totalAnswers: 10,
        totalComments: 3,
        reputationPoints: 100,
        questionsAnswered: [{ _id: new ObjectId(), title: 'Test Question' }],
        questionsAsked: [{ _id: new ObjectId(), title: 'Another Question' }],
        viewsReceived: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: () => ({
          _id: new ObjectId(),
          username,
          totalQuestions: 5,
          totalAnswers: 10,
          totalComments: 3,
          reputationPoints: 100,
          questionsAnswered: [{ _id: new ObjectId(), title: 'Test Question' }],
          questionsAsked: [{ _id: new ObjectId(), title: 'Another Question' }],
          viewsReceived: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPopulatedMetrics),
      };

      jest.spyOn(UserMetricsModel, 'findOne').mockReturnValue(mockQuery as any);

      const result = await userMetricsService.getMetrics(username, true);

      expect(result).toBeDefined();
      expect(mockQuery.populate).toHaveBeenCalledWith('questionsAnswered');
      expect(mockQuery.populate).toHaveBeenCalledWith('questionsAsked');
    });

    it('should return null if metrics not found', async () => {
      const username = 'nonexistent';
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(UserMetricsModel, 'findOne').mockReturnValue(mockQuery as any);

      const result = await userMetricsService.getMetrics(username);

      expect(result).toBeNull();
    });
  });

  describe('updateMetrics', () => {
    it('should update metrics and emit socket event', async () => {
      const username = 'testuser';
      const updates: Partial<UserMetrics> = {
        totalQuestions: 10,
        reputationPoints: 50,
      };

      const mockUpdatedMetrics: DatabaseUserMetrics = {
        _id: new ObjectId(),
        username,
        totalQuestions: 10,
        totalAnswers: 0,
        totalComments: 0,
        reputationPoints: 50,
        questionsAnswered: [],
        questionsAsked: [],
        viewsReceived: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDoc = {
        toObject: () => mockUpdatedMetrics,
      };

      jest.spyOn(UserMetricsModel, 'findOneAndUpdate').mockResolvedValueOnce(mockDoc as any);

      const result = await userMetricsService.updateMetrics(username, updates, mockSocket);

      expect(result).toEqual(mockUpdatedMetrics);
      expect(UserMetricsModel.findOneAndUpdate).toHaveBeenCalledWith(
        { username },
        expect.objectContaining({
          $set: expect.objectContaining({
            totalQuestions: 10,
            reputationPoints: 50,
          }),
        }),
        { new: true, upsert: true },
      );
      expect(mockSocket.emit).toHaveBeenCalledWith('userMetrics:update', {
        username,
        metrics: mockUpdatedMetrics,
      });
    });

    it('should throw error if update fails', async () => {
      const username = 'testuser';
      const updates: Partial<UserMetrics> = { totalQuestions: 10 };

      jest.spyOn(UserMetricsModel, 'findOneAndUpdate').mockResolvedValueOnce(null);

      await expect(userMetricsService.updateMetrics(username, updates, mockSocket)).rejects.toThrow(
        `Failed to update metrics for user: ${username}`,
      );
    });
  });

  describe('recordQuestionAsked', () => {
    it('should increment totalQuestions and add question to questionsAsked', async () => {
      const username = 'testuser';
      const questionId = new ObjectId();

      jest.spyOn(userMetricsService, 'updateMetrics').mockResolvedValueOnce({
        _id: new ObjectId(),
        username,
        totalQuestions: 1,
        totalAnswers: 0,
        totalComments: 0,
        reputationPoints: 0,
        questionsAnswered: [],
        questionsAsked: [questionId],
        viewsReceived: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await userMetricsService.recordQuestionAsked(username, questionId, mockSocket);

      expect(userMetricsService.updateMetrics).toHaveBeenCalledWith(
        username,
        expect.objectContaining({
          $inc: { totalQuestions: 1 },
          $push: { questionsAsked: questionId },
        }),
        mockSocket,
      );
    });
  });

  describe('recordAnswerGiven', () => {
    it('should increment totalAnswers and add question to questionsAnswered', async () => {
      const username = 'testuser';
      const questionId = new ObjectId();

      jest.spyOn(userMetricsService, 'updateMetrics').mockResolvedValueOnce({
        _id: new ObjectId(),
        username,
        totalQuestions: 0,
        totalAnswers: 1,
        totalComments: 0,
        reputationPoints: 0,
        questionsAnswered: [questionId],
        questionsAsked: [],
        viewsReceived: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await userMetricsService.recordAnswerGiven(username, questionId, mockSocket);

      expect(userMetricsService.updateMetrics).toHaveBeenCalledWith(
        username,
        expect.objectContaining({
          $inc: { totalAnswers: 1 },
          $push: { questionsAnswered: questionId },
        }),
        mockSocket,
      );
    });
  });

  describe('recordCommentMade', () => {
    it('should increment totalComments', async () => {
      const username = 'testuser';

      jest.spyOn(userMetricsService, 'updateMetrics').mockResolvedValueOnce({
        _id: new ObjectId(),
        username,
        totalQuestions: 0,
        totalAnswers: 0,
        totalComments: 1,
        reputationPoints: 0,
        questionsAnswered: [],
        questionsAsked: [],
        viewsReceived: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await userMetricsService.recordCommentMade(username, mockSocket);

      expect(userMetricsService.updateMetrics).toHaveBeenCalledWith(
        username,
        expect.objectContaining({
          $inc: { totalComments: 1 },
        }),
        mockSocket,
      );
    });
  });

  describe('recordReputationChange', () => {
    it('should increment reputationPoints by positive amount', async () => {
      const username = 'testuser';
      const points = 10;

      jest.spyOn(userMetricsService, 'updateMetrics').mockResolvedValueOnce({
        _id: new ObjectId(),
        username,
        totalQuestions: 0,
        totalAnswers: 0,
        totalComments: 0,
        reputationPoints: 10,
        questionsAnswered: [],
        questionsAsked: [],
        viewsReceived: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await userMetricsService.recordReputationChange(username, points, mockSocket);

      expect(userMetricsService.updateMetrics).toHaveBeenCalledWith(
        username,
        expect.objectContaining({
          $inc: { reputationPoints: points },
        }),
        mockSocket,
      );
    });

    it('should decrement reputationPoints by negative amount', async () => {
      const username = 'testuser';
      const points = -5;

      jest.spyOn(userMetricsService, 'updateMetrics').mockResolvedValueOnce({
        _id: new ObjectId(),
        username,
        totalQuestions: 0,
        totalAnswers: 0,
        totalComments: 0,
        reputationPoints: -5,
        questionsAnswered: [],
        questionsAsked: [],
        viewsReceived: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await userMetricsService.recordReputationChange(username, points, mockSocket);

      expect(userMetricsService.updateMetrics).toHaveBeenCalledWith(
        username,
        expect.objectContaining({
          $inc: { reputationPoints: points },
        }),
        mockSocket,
      );
    });
  });

  describe('recordQuestionView', () => {
    it('should increment viewsReceived', async () => {
      const username = 'testuser';

      jest.spyOn(userMetricsService, 'updateMetrics').mockResolvedValueOnce({
        _id: new ObjectId(),
        username,
        totalQuestions: 0,
        totalAnswers: 0,
        totalComments: 0,
        reputationPoints: 0,
        questionsAnswered: [],
        questionsAsked: [],
        viewsReceived: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await userMetricsService.recordQuestionView(username, mockSocket);

      expect(userMetricsService.updateMetrics).toHaveBeenCalledWith(
        username,
        expect.objectContaining({
          $inc: { viewsReceived: 1 },
        }),
        mockSocket,
      );
    });
  });

  describe('listUsersByMetrics', () => {
    it('should return list of users sorted by metric', async () => {
      const mockUserMetrics: DatabaseUserMetrics[] = [
        {
          _id: new ObjectId(),
          username: 'user1',
          totalQuestions: 0,
          totalAnswers: 0,
          totalComments: 0,
          reputationPoints: 100,
          questionsAnswered: [],
          questionsAsked: [],
          viewsReceived: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new ObjectId(),
          username: 'user2',
          totalQuestions: 0,
          totalAnswers: 0,
          totalComments: 0,
          reputationPoints: 50,
          questionsAnswered: [],
          questionsAsked: [],
          viewsReceived: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(
          mockUserMetrics.map(m => ({
            toObject: () => m,
          })),
        ),
      };

      jest.spyOn(UserMetricsModel, 'find').mockReturnValue(mockQuery as any);

      const result = await userMetricsService.listUsersByMetrics({}, 10, {
        reputationPoints: -1,
      });

      expect(result).toEqual(mockUserMetrics);
      expect(mockQuery.sort).toHaveBeenCalledWith({ reputationPoints: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it('should use default parameters when not provided', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      jest.spyOn(UserMetricsModel, 'find').mockReturnValue(mockQuery as any);

      await userMetricsService.listUsersByMetrics();

      expect(mockQuery.sort).toHaveBeenCalledWith({ reputationPoints: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });
  });
});
