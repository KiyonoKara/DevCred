import mongoose, { Model } from 'mongoose';
import { DatabaseJobPosting } from '../types/types';
import jobPostingSchema from './schema/jobPosting.schema';

/**
 * Mongoose model for the Job Posting collection.
 */
const JobPostingModel: Model<DatabaseJobPosting> = mongoose.model<DatabaseJobPosting>(
  'JobPosting',
  jobPostingSchema,
);

export default JobPostingModel;
