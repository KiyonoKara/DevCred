import mongoose, { Model } from 'mongoose';
import resumeSchema from './schema/resume.schema';
import { DatabaseResume } from '../types/types';

/**
 * Mongoose model for the `Resume` collection.
 *
 * This model is created using the `DatabaseResume` interface and the `resumeSchema`,
 * representing the `Resume` collection in the MongoDB database, and provides an
 * interface for interacting with stored resume documents.
 *
 * @type {Model<DatabaseResume>}
 */
const ResumeModel: Model<DatabaseResume> = mongoose.model<DatabaseResume>('Resume', resumeSchema);

export default ResumeModel;
