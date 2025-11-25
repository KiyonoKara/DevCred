import supertest from 'supertest';
import { app } from '../../app';
import { userMetricsService } from '../../services/userMetrics.service';
import { DatabaseUserMetrics } from '@fake-stack-overflow/shared/types/userMetrics';
import { ObjectId } from 'mongodb';

const mockMetricsId = new ObjectId();
const mockQuestionId1 = new ObjectId();
const mockQuestionId2 = new ObjectId();
const mockCreatedAt = new Date('2024-01-01T00:00:00.000Z');
const mockUpdatedAt = new Date('2024-01-02T00:00:00.000Z');

const mockMetrics: DatabaseUserMetrics = {
  _id: mockMetricsId,
  username: 'testuser',
  totalQuestions: 5,
  totalAnswers: 10,
  totalComments: 3,
  reputationPoints: 100,
  questionsAnswered: [mockQuestionId1],
  questionsAsked: [mockQuestionId2],
  viewsReceived: 50,
  createdAt: mockCreatedAt,
  updatedAt: mockUpdatedAt,
};

// Serialized version for JSON responses
const mockMetricsSerialized = {
  ...mockMetrics,
  _id: mockMetricsId.toString(),
  questionsAnswered: [mockQuestionId1.toString()],
  questionsAsked: [mockQuestionId2.toString()],
  createdAt: mockCreatedAt.toISOString(),
  updatedAt: mockUpdatedAt.toISOString(),
};

let getMetricsSpy: jest.SpyInstance;
let updateMetricsSpy: jest.SpyInstance;
let listUsersByMetricsSpy: jest.SpyInstance;

describe('UserMetrics Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Initialize spies in beforeEach like other controller tests
    getMetricsSpy = jest.spyOn(userMetricsService, 'getMetrics');
    updateMetricsSpy = jest.spyOn(userMetricsService, 'updateMetrics');
    listUsersByMetricsSpy = jest.spyOn(userMetricsService, 'listUsersByMetrics');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/metrics/:username', () => {
    it('should return metrics for a user', async () => {
      // Return a plain object that Express can serialize
      getMetricsSpy.mockResolvedValueOnce(mockMetricsSerialized);

      const response = await supertest(app).get('/api/metrics/testuser').query({ populate: false });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMetricsSerialized);
      expect(getMetricsSpy).toHaveBeenCalledWith('testuser', false);
    });

    it('should return metrics with populated questions when populate=true', async () => {
      // Create plain serializable objects matching the structure that would come from the service
      const populatedQuestion1 = {
        _id: mockQuestionId1.toString(),
        title: 'Test Question',
        text: 'Test question text',
        askedBy: 'testuser',
        askDateTime: new Date('2024-01-01T00:00:00.000Z').toISOString(),
        views: [],
        upVotes: [],
        downVotes: [],
        tags: [],
        answers: [],
        comments: [],
        community: null,
      };
      const populatedQuestion2 = {
        _id: mockQuestionId2.toString(),
        title: 'Another Question',
        text: 'Another question text',
        askedBy: 'testuser',
        askDateTime: new Date('2024-01-01T00:00:00.000Z').toISOString(),
        views: [],
        upVotes: [],
        downVotes: [],
        tags: [],
        answers: [],
        comments: [],
        community: null,
      };
      // Create metrics object matching mockMetricsSerialized but with populated questions
      // Ensure all values are plain serializable objects
      const populatedMetrics = {
        _id: mockMetricsId.toString(),
        username: 'testuser',
        totalQuestions: 5,
        totalAnswers: 10,
        totalComments: 3,
        reputationPoints: 100,
        questionsAnswered: [populatedQuestion1],
        questionsAsked: [populatedQuestion2],
        viewsReceived: 50,
        createdAt: mockCreatedAt.toISOString(),
        updatedAt: mockUpdatedAt.toISOString(),
      };

      // Mock the service to return the populated metrics - use mockResolvedValueOnce like other tests
      getMetricsSpy.mockResolvedValueOnce(populatedMetrics);

      const response = await supertest(app).get('/api/metrics/testuser').query({ populate: true });

      expect(response.status).toBe(200);
      expect(getMetricsSpy).toHaveBeenCalledWith('testuser', true);
      // Check key fields instead of full equality to avoid serialization issues
      expect(response.body._id).toBe(mockMetricsId.toString());
      expect(response.body.username).toBe('testuser');
      expect(response.body.questionsAnswered).toHaveLength(1);
      expect(response.body.questionsAsked).toHaveLength(1);
      expect(response.body.questionsAnswered[0].title).toBe('Test Question');
      expect(response.body.questionsAsked[0].title).toBe('Another Question');
    });

    it('should return 404 if metrics not found', async () => {
      getMetricsSpy.mockResolvedValueOnce(null);

      const response = await supertest(app).get('/api/metrics/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'User metrics not found' });
    });

    it('should return 500 on service error', async () => {
      getMetricsSpy.mockRejectedValueOnce(new Error('Database error'));

      const response = await supertest(app).get('/api/metrics/testuser');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Error fetching user metrics' });
    });
  });

  describe('POST /api/metrics/update', () => {
    it('should update metrics for a user', async () => {
      const updates = {
        totalQuestions: 10,
        reputationPoints: 50,
      };

      const updatedMetrics = {
        ...mockMetricsSerialized,
        ...updates,
      };

      updateMetricsSpy.mockResolvedValueOnce(updatedMetrics);

      const response = await supertest(app).post('/api/metrics/update').send({
        username: 'testuser',
        metrics: updates,
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedMetrics);
      expect(updateMetricsSpy).toHaveBeenCalledWith('testuser', updates, expect.any(Object));
    });

    it('should return 500 on service error', async () => {
      updateMetricsSpy.mockRejectedValueOnce(new Error('Update failed'));

      const response = await supertest(app)
        .post('/api/metrics/update')
        .send({
          username: 'testuser',
          metrics: { totalQuestions: 10 },
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Error updating user metrics' });
    });
  });

  describe('GET /api/metrics/top/:metric', () => {
    it('should return top users by reputationPoints', async () => {
      const topUsers = [
        {
          ...mockMetricsSerialized,
          username: 'user1',
          reputationPoints: 200,
        },
        {
          ...mockMetricsSerialized,
          username: 'user2',
          reputationPoints: 150,
        },
      ];

      listUsersByMetricsSpy.mockResolvedValueOnce(topUsers as any);

      const response = await supertest(app)
        .get('/api/metrics/top/reputationPoints')
        .query({ limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].username).toBe('user1');
      expect(response.body[0].reputationPoints).toBe(200);
      expect(response.body[1].username).toBe('user2');
      expect(response.body[1].reputationPoints).toBe(150);
      expect(listUsersByMetricsSpy).toHaveBeenCalledWith({}, 10, { reputationPoints: -1 });
    });

    it('should return top users by totalAnswers', async () => {
      const topUsers = [
        {
          ...mockMetricsSerialized,
          username: 'user1',
          totalAnswers: 50,
        },
      ];

      listUsersByMetricsSpy.mockResolvedValueOnce(topUsers as any);

      const response = await supertest(app)
        .get('/api/metrics/top/totalAnswers')
        .query({ limit: '5' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].username).toBe('user1');
      expect(response.body[0].totalAnswers).toBe(50);
      expect(listUsersByMetricsSpy).toHaveBeenCalledWith({}, 5, { totalAnswers: -1 });
    });

    it('should return top users by totalQuestions', async () => {
      const topUsers = [
        {
          ...mockMetricsSerialized,
          username: 'user1',
          totalQuestions: 30,
        },
      ];

      listUsersByMetricsSpy.mockResolvedValueOnce(topUsers as any);

      const response = await supertest(app)
        .get('/api/metrics/top/totalQuestions')
        .query({ limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].username).toBe('user1');
      expect(response.body[0].totalQuestions).toBe(30);
      expect(listUsersByMetricsSpy).toHaveBeenCalledWith({}, 10, { totalQuestions: -1 });
    });

    it('should return top users by viewsReceived', async () => {
      const topUsers = [
        {
          ...mockMetricsSerialized,
          username: 'user1',
          viewsReceived: 1000,
        },
      ];

      listUsersByMetricsSpy.mockResolvedValueOnce(topUsers as any);

      const response = await supertest(app)
        .get('/api/metrics/top/viewsReceived')
        .query({ limit: '10' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].username).toBe('user1');
      expect(response.body[0].viewsReceived).toBe(1000);
      expect(listUsersByMetricsSpy).toHaveBeenCalledWith({}, 10, { viewsReceived: -1 });
    });

    it('should return 400 for invalid metric', async () => {
      const response = await supertest(app).get('/api/metrics/top/invalidMetric');

      expect(response.status).toBe(400);
      // OpenAPI validation happens before controller code, so format is different
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0]).toHaveProperty('message');
      expect(response.body.errors[0].message).toContain(
        'must be equal to one of the allowed values',
      );
    });

    it('should use default limit of 10 when not provided', async () => {
      const topUsers: DatabaseUserMetrics[] = [];

      listUsersByMetricsSpy.mockResolvedValueOnce(topUsers);

      const response = await supertest(app).get('/api/metrics/top/reputationPoints');

      expect(response.status).toBe(200);
      expect(listUsersByMetricsSpy).toHaveBeenCalledWith({}, 10, { reputationPoints: -1 });
    });

    it('should return 500 on service error', async () => {
      listUsersByMetricsSpy.mockRejectedValueOnce(new Error('Database error'));

      const response = await supertest(app).get('/api/metrics/top/reputationPoints');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Error fetching top users' });
    });
  });
});
