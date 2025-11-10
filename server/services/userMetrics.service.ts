import {
  DatabaseUserMetrics,
  PopulatedUserMetrics,
  UserMetrics,
} from '@fake-stack-overflow/shared/types/userMetrics';
import UserMetricsModel from '../models/userMetrics.model';
import { FilterQuery } from 'mongoose';
import { ObjectId } from 'mongodb';
import { FakeSOSocket } from '../types/types';

/**
 * Service for managing user metrics.
 * Contains business logic for creating, updating, and retrieving user metrics.
 */
export const userMetricsService = {
  /**
   * Initialize metrics for a new user.
   * @param username The username to create metrics for.
   * @returns The created metrics document.
   */
  async initializeMetrics(username: string): Promise<DatabaseUserMetrics> {
    const metrics: UserMetrics = {
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

    const doc = await UserMetricsModel.create(metrics);
    return doc?.toObject<DatabaseUserMetrics>() ?? null;
  },

  /**
   * Get metrics for a specific user.
   * @param username The username to get metrics for.
   * @param populate Whether to populate questions.
   * @returns The user's metrics.
   */
  async getMetrics(
    username: string,
    populate = false,
  ): Promise<DatabaseUserMetrics | PopulatedUserMetrics | null> {
    const query = UserMetricsModel.findOne({ username });

    if (populate) {
      query.populate('questionsAnswered').populate('questionsAsked');
      const doc = await query.exec();
      return doc?.toObject<PopulatedUserMetrics>() ?? null;
    }

    const doc = await query.exec();
    return doc?.toObject<DatabaseUserMetrics>() ?? null;
  },

  /**
   * Update metrics for a user.
   * @param username The username to update metrics for.
   * @param updates The metrics updates to apply.
   * @param socket Socket instance for real-time updates.
   * @returns The updated metrics.
   */
  async updateMetrics(
    username: string,
    updates: Partial<UserMetrics>,
    socket: FakeSOSocket,
  ): Promise<DatabaseUserMetrics> {
    const doc = await UserMetricsModel.findOneAndUpdate(
      { username },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true, upsert: true },
    );

    if (!doc) {
      throw new Error(`Failed to update metrics for user: ${username}`);
    }

    const metrics = doc.toObject<DatabaseUserMetrics>();

    // Emit metrics update event
    socket.emit('userMetrics:update', {
      username,
      metrics,
    });

    return metrics;
  },

  /**
   * Record a question being asked.
   * @param username Username of the asker.
   * @param questionId ID of the question.
   * @param socket Socket instance.
   */
  async recordQuestionAsked(
    username: string,
    questionId: ObjectId,
    socket: FakeSOSocket,
  ): Promise<void> {
    const updates = {
      $inc: { totalQuestions: 1 },
      $push: { questionsAsked: questionId },
    } as unknown as Partial<UserMetrics>;
    await this.updateMetrics(username, updates, socket);
  },

  /**
   * Record an answer being given.
   * @param username Username of the answerer.
   * @param questionId ID of the question.
   * @param socket Socket instance.
   */
  async recordAnswerGiven(
    username: string,
    questionId: ObjectId,
    socket: FakeSOSocket,
  ): Promise<void> {
    const updates = {
      $inc: { totalAnswers: 1 },
      $push: { questionsAnswered: questionId },
    } as unknown as Partial<UserMetrics>;
    await this.updateMetrics(username, updates, socket);
  },

  /**
   * Record a comment being made.
   * @param username Username of the commenter.
   * @param socket Socket instance.
   */
  async recordCommentMade(username: string, socket: FakeSOSocket): Promise<void> {
    const updates = {
      $inc: { totalComments: 1 },
    } as unknown as Partial<UserMetrics>;
    await this.updateMetrics(username, updates, socket);
  },

  /**
   * Record a reputation change from votes.
   * @param username Username whose reputation changed.
   * @param points Points to add (positive) or subtract (negative).
   * @param socket Socket instance.
   */
  async recordReputationChange(
    username: string,
    points: number,
    socket: FakeSOSocket,
  ): Promise<void> {
    const updates = {
      $inc: { reputationPoints: points },
    } as unknown as Partial<UserMetrics>;
    await this.updateMetrics(username, updates, socket);
  },

  /**
   * Record a new view on a user's question.
   * @param username Username whose question was viewed.
   * @param socket Socket instance.
   */
  async recordQuestionView(username: string, socket: FakeSOSocket): Promise<void> {
    const updates = {
      $inc: { viewsReceived: 1 },
    } as unknown as Partial<UserMetrics>;
    await this.updateMetrics(username, updates, socket);
  },

  /**
   * List users by metrics (for leaderboards etc).
   * @param filter Filter criteria.
   * @param limit Max number of users to return.
   * @param sort Sort criteria.
   * @returns Array of metrics documents.
   */
  async listUsersByMetrics(
    filter: FilterQuery<DatabaseUserMetrics> = {},
    limit = 10,
    sort: Partial<Record<keyof UserMetrics, 1 | -1>> = { reputationPoints: -1 },
  ): Promise<DatabaseUserMetrics[]> {
    const docs = await UserMetricsModel.find(filter).sort(sort).limit(limit).exec();
    return docs.map(doc => doc.toObject<DatabaseUserMetrics>());
  },
};

export default userMetricsService;
