import { Schema } from 'mongoose';

/**
 * Mongoose schema for the Job Application collection.
 *
 * This schema defines the structure for storing job applications in the database.
 * Each job application includes the following fields:
 * - `jobPosting`: Reference to the `JobPosting` document of the job being applied to.
 * - `user`: Username of the user applying to a job.
 * - `jobStatus`: Status of a user's application.
 * - `applicationDate`: Date that the user applied to the job.
 */
const jobApplicationSchema: Schema = new Schema(
  {
    jobPosting: {
      type: Schema.Types.ObjectId,
      ref: 'JobPosting',
      required: true,
    },
    user: {
      type: String,
      required: true,
    },
    jobStatus: {
      type: String,
      enum: ['Submitted', 'Archived', 'In Review', 'Accepted', 'Rejected'],
      required: true,
    },
    applicationDate: {
      type: Date,
      required: true,
    },
  },
  { collection: 'JobApplication' },
);

export default jobApplicationSchema;
