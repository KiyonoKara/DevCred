import { ObjectId, Request } from 'mongodb';

/**
 * Represents user metrics and statistics.
 * - `username`: The username of user with the metrics.
 * - `totalQuestions`: Total number of questions asked by the user.
 * - `totalAnswers`: Total number of answers provided by the user.
 * - `totalComments`: Total number of comments made by the user.
 * - `reputationPoints`: Reputation points earned from upvotes/downvotes.
 * - `questionsAnswered`: IDs of questions user has answered.
 * - `questionsAsked`: IDs of questions user has asked.
 * - `viewsReceived`: Total views across all user's questions.
 */
export interface UserMetrics {
  username: string;
  totalQuestions: number;
  totalAnswers: number;
  totalComments: number;
  reputationPoints: number;
  questionsAnswered: ObjectId[];
  questionsAsked: ObjectId[];
  viewsReceived: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a user metrics document in the database.
 * - `_id`: Unique identifier for the metrics document.
 */
export interface DatabaseUserMetrics extends UserMetrics {
  _id: ObjectId;
}

/**
 * Interface for populating questions in metrics.
 */
export interface PopulatedUserMetrics
  extends Omit<DatabaseUserMetrics, 'questionsAnswered' | 'questionsAsked'> {
  questionsAnswered: DatabaseQuestion[];
  questionsAsked: DatabaseQuestion[];
}

/**
 * Interface for the request when updating user metrics.
 * - `username`: The username of the user.
 * - `metrics`: The metrics to update.
 */
export interface UpdateUserMetricsRequest extends Request {
  body: {
    username: string;
    metrics: Partial<UserMetrics>;
  };
}

/**
 * Interface for getting a user's metrics.
 * - `username`: The username to get metrics for.
 * - `populate`: Whether to populate questions.
 */
export interface GetUserMetricsRequest extends Request {
  params: {
    username: string;
  };
  query: {
    populate?: boolean;
  };
}
