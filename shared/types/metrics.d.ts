import { DatabaseUserMetrics } from './userMetrics';

/**
 * Payload for a user metrics update event.
 * - `username`: The username whose metrics were updated.
 * - `metrics`: The updated metrics.
 */
export interface UserMetricsUpdatePayload {
  username: string;
  metrics: DatabaseUserMetrics;
}
