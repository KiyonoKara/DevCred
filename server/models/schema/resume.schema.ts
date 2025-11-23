import { Schema } from 'mongoose';

/**
 * Mongoose schema for the Resume collection.
 *
 * This schema defines the structure for storing resume files.
 * Each Resume includes the following fields:
 * - `userId`: The username of the user who owns the resume.
 * - `fileName`: The original name of the uploaded file.
 * - `fileData`: The binary data of the resume file.
 * - `contentType`: The MIME type of the file.
 * - `fileSize`: The size of the file in bytes.
 * - `uploadDate`: The date when the resume was uploaded.
 * - `isDMFile`: Whether the file is a non-resume DM file.
 * - `isActive`: Whether this is the user's active resume.
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
    isDMFile: {
      type: Boolean,
      default: false,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { collection: 'Resume' },
);

export default resumeSchema;
