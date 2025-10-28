import { Schema } from 'mongoose';

/**
 * Mongoose schema for the User collection.
 *
 * This schema defines the structure for storing users in the database.
 * Each User includes the following fields:
 * - `username`: The username of the user.
 * - `password`: The encrypted password securing the user's account.
 * - `dateJoined`: The date the user joined the platform.
 * - `biography`: An optional biography or description provided by the user.
 * - `profileVisibility`: Controls what parts of the user's profile are visible to others.
 * - `dmEnabled`: Whether the user accepts direct messages, user is opted-in by default.
 */
const userSchema: Schema = new Schema(
  {
    username: {
      type: String,
      unique: true,
      immutable: true,
    },
    password: {
      type: String,
    },
    dateJoined: {
      type: Date,
    },
    biography: {
      type: String,
      default: '',
    },
    activityHistory: {
      type: [String],
      default: [],
    },
    activeResumeId: {
      type: String,
      Ref: 'Resume',
    },
    profileVisibility: {
      type: String,
      enum: ['private', 'public-metrics-only', 'public-full'],
      default: 'public-full',
    },
    dmEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { collection: 'User' },
);

export default userSchema;
