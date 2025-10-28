import mongoose, { Model } from 'mongoose';
import jobFairSchema from './schema/jobFair.schema';
import { DatabaseJobFair } from '../types/types';

/**
 * Mongoose model for the JobFair collection.
 */
const JobFairModel: Model<DatabaseJobFair> = mongoose.model<DatabaseJobFair>(
  'JobFair',
  jobFairSchema,
);

export default JobFairModel;
