import { Schema } from 'mongoose';

/**
 * Mongoose schema for the Resume collection.
 */
const resumeSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    fileName: {
      type: String,
      required: true,
    },
    fileData: {
      type: Buffer,
      required: true,
    },
    contentType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { collection: 'Resume' },
);

export default resumeSchema;