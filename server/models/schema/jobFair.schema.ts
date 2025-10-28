import { Schema } from 'mongoose';

/**
 * Mongoose schema for the JobFair collection.
 *
 * This schema defines the structure for storing job fairs in the database.
 * Each JobFair includes the following fields:
 * - `title`: The title or name of the job fair.
 * - `description`: A description of what the job fair is about.
 * - `hostUsername`: The username of the recruiter hosting the fair.
 * - `visibility`: Whether the job fair is 'public' or 'invite-only'.
 * - `status`: Current status of the job fair ('upcoming', 'live', 'ended').
 * - `scheduledDate`: When the job fair is scheduled to start.
 * - `participants`: List of users' usernames who have joined the fair.
 * - `invitedUsers`: List of users' usernames who are invited (for invite-only fairs).
 * - `chatMessages`: Array of message IDs for the job fair chat.
 * - `codingSubmissions`: Array of coding submission IDs.
 * - `documents`: Array of document/file references shared during the fair.
 */
const jobFairSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    hostUsername: {
      type: String,
      required: true,
    },
    visibility: {
      type: String,
      enum: ['public', 'invite-only'],
      default: 'public',
      required: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'live', 'ended'],
      default: 'upcoming',
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    participants: [
      {
        type: String,
      },
    ],
    invitedUsers: [
      {
        type: String,
      },
    ],
    chatMessages: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
    codingSubmissions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'CodingSubmission',
      },
    ],
    documents: [
      {
        filename: String,
        originalName: String,
        path: String,
        uploadedBy: String,
        uploadedAt: Date,
      },
    ],
  },
  {
    collection: 'JobFair',
    timestamps: true,
  },
);

export default jobFairSchema;
