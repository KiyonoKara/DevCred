import { model } from 'mongoose';
import userMetricsSchema from './schema/userMetrics.schema';

/**
 * Mongoose model for UserMetrics.
 * Provides access to the UserMetrics collection in the database.
 */
const UserMetricsModel = model('UserMetrics', userMetricsSchema);

export default UserMetricsModel;
