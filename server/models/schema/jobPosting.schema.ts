import { Schema } from 'mongoose';

/**
 * Mongoose schema for the Job Posting collection.
 *
 * This schema defines the structure for storing job postings in the database.
 * Each job posting includes the following fields:
 * - `company`: The company for which the job is being posted.
 * - `recruiter`: Username of the recruiter making the job posting.
 * - `title`: Title of the position that the posting is being made for.
 * - `payRange`: A pay range description of the position.
 * - `description`: The description for the job being posted.
 * - `location`: The location of the job.
 * - `tags`: An array of references to `Tag` documents associated with the job posting.
 * - `active`: A boolean representing if the job posting is active or not
 * - `deadline`: A date on which a job will automatically be set to inactive.
 */
const jobPostingSchema: Schema = new Schema(
  {
    company: {
      type: String,
      required: true,
    },
    recruiter: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    payRange: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    active: {
      type: Boolean,
      required: true,
      default: false,
    },
    deadline: {
      type: Date,
      required: false,
    },
  },
  { collection: 'JobPosting' },
);

export default jobPostingSchema;
