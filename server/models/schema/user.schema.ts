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
 * - `userType`: The type of the user signing up (recruiter/talent)
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
    activityHistory: {
      type: [String],
      default: [],
    },
    activeResumeId: {
      type: String,
      ref: 'Resume',
    },
    biography: {
      type: String,
      default: '',
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
    userType: {
      type: String,
      enum: ['recruiter', 'talent'],
      default: 'talent',
    },
  },
  { collection: 'User' },
);

export default userSchema;
