import { Schema } from 'mongoose';

/**
 * Mongoose schema for the Chat collection.
 *
 * - `participants`: an array of usernames in the chat.
 * - `messages`: an array of ObjectIds referencing the Message collection.
 * - `deletedBy`: an array of objects tracking which users deleted and when.
 *   Format: [{ username: string, deletedAt: Date }, ...]
 *   When a user re-engages, messages before deletedAt are hidden from them.
 *   When both participants have deleted, the chat should be removed from database.
 * - Timestamps store `createdAt` & `updatedAt`.
 */
const chatSchema = new Schema(
  {
    participants: [
      {
        type: String,
        required: true,
      },
    ],
    messages: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
    deletedBy: [
      {
        username: {
          type: String,
        },
        deletedAt: {
          type: Date,
        },
      },
    ],
  },
  {
    collection: 'Chat',
    timestamps: true,
  },
);

export default chatSchema;
