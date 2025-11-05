import { Schema } from 'mongoose';

/**
 * Mongoose schema for the UserMetrics collection.
 *
 * This schema defines the structure for storing user metrics in the database.
 * Each user's metrics includes:
 * - `username`: The username of the user of the metrics.
 * - `totalQuestions`: Total number of questions asked by the user.
 * - `totalAnswers`: Total number of answers provided by the user.
 * - `totalComments`: Total number of comments made by the user.
 * - `reputationPoints`: Reputation points earned from upvotes/downvotes.
 * - `questionsAnswered`: IDs of questions user has answered.
 * - `questionsAsked`: IDs of questions user has asked.
 * - `viewsReceived`: Total views across all user's questions.
 */
const userMetricsSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    totalAnswers: {
      type: Number,
      default: 0,
    },
    totalComments: {
      type: Number,
      default: 0,
    },
    reputationPoints: {
      type: Number,
      default: 0,
    },
    questionsAnswered: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    questionsAsked: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    viewsReceived: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: 'UserMetrics',
    timestamps: true,
  },
);

export default userMetricsSchema;
