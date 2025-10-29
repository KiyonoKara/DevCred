import mongoose, { Model } from 'mongoose';
import resumeSchema from './schema/resume.schema';
import { DatabaseResume } from '../types/types';

const ResumeModel: Model<DatabaseResume> = mongoose.model<DatabaseResume>('Resume', resumeSchema);

export default ResumeModel;