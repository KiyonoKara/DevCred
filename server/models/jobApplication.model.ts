import mongoose, { Model } from 'mongoose';
import { DatabaseJobApplication } from '../types/types';
import jobApplicationSchema from './schema/jobApplication.schema';

/**
 * Mongoose model for the Job Application collection.
 */
const JobApplicationModel: Model<DatabaseJobApplication> = mongoose.model<DatabaseJobApplication>(
  'JobApplication',
  jobApplicationSchema,
);

export default JobApplicationModel;
