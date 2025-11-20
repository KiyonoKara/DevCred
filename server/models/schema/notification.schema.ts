import { Schema } from 'mongoose';

/**
 * Mongoose schema for the Notification collection.
 *
 * This schema defines the structure for storing notifications in the database.
 * Each Notification includes the following fields:
 * - `recipient`: The username of the user who should receive the notification.
 * - `type`: The type of notification ('dm', 'jobFair', 'community').
 * - `title`: The title of the notification.
 * - `message`: The message content of the notification.
 * - `read`: Whether the notification has been read.
 * - `relatedId`: Optional ID of the related entity (chat ID, job fair ID, question ID, etc.).
 * - `createdAt`: Timestamp when the notification was created.
 */
const notificationSchema = new Schema(
  {
    recipient: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['dm', 'jobFair', 'community'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    relatedId: {
      type: String,
      required: false,
    },
  },
  {
    collection: 'Notification',
    timestamps: true,
  },
);

export default notificationSchema;

