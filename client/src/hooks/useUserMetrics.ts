import { useCallback, useEffect, useState } from 'react';
import { DatabaseUserMetrics } from '@fake-stack-overflow/shared/types/userMetrics';
import api from '../services/config';
import useUserContext from './useUserContext';

// TODO: check if this custom hook works on sprint 2
const METRICS_API_URL = '/api/metrics';

/**
 * Custom hook for managing user metrics.
 *
 * @param targetUsername Username of user to get metrics, default is user from the context
 * @param populate Whether to populate question references or not
 * @returns An Object containing metrics and utility functions
 */
const useUserMetrics = (targetUsername?: string, populate = false) => {
  const [metrics, setMetrics] = useState<DatabaseUserMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, socket } = useUserContext();

  // Username to fetch metrics for - either provided or current user
  const username = targetUsername || user.username;

  /**
   * Get metrics for the user.
   */
  const getMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`${METRICS_API_URL}/${username}?populate=${populate}`);
      setMetrics(res.data);
      setError(null);
    } catch (err) {
      setError('Error fetching user metrics');
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [username, populate]);

  useEffect(() => {
    getMetrics();
  }, [getMetrics]);

  /**
   * Set up socket.io listener for metrics updates.
   */
  useEffect(() => {
    if (!socket) {
      return;
    }
    socket.on('metricsUpdate', update => {
      if (update.username === username) {
        setMetrics(update.metrics);
      }
    });

    return () => {
      socket.off('metricsUpdate');
    };
  }, [socket, username]);

  // return metrics and refreshed metrics
  return {
    metrics,
    loading,
    error,
    refreshMetrics: getMetrics,
  };
};

export default useUserMetrics;
