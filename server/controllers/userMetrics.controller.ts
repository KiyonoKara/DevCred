import { Request, Response, Router } from 'express';
import {
  GetUserMetricsRequest,
  UpdateUserMetricsRequest,
} from '@fake-stack-overflow/shared/types/userMetrics';
import { userMetricsService } from '../services/userMetrics.service';
import { FakeSOSocket } from '../types/types';

/**
 * Creates an Express router for handling user metrics operations.
 * @param socket Socket.IO instance for real-time updates.
 * @returns Express Router.
 */
const userMetricsController = (socket: FakeSOSocket): Router => {
  const router = Router();

  /**
   * Get metrics for a specific user.
   * GET /api/metrics/:username
   */
  router.get('/:username', async (req: GetUserMetricsRequest, res: Response) => {
    try {
      const { username } = req.params;
      const { populate } = req.query;

      const metrics = await userMetricsService.getMetrics(username, populate);
      if (!metrics) {
        res.status(404).json({ error: 'User metrics not found' });
        return;
      }

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching user metrics' });
    }
  });

  /**
   * Update metrics for a user.
   * POST /api/metrics/update
   */
  router.post('/update', async (req: UpdateUserMetricsRequest, res: Response) => {
    try {
      const { username, metrics: updates } = req.body;
      const updatedMetrics = await userMetricsService.updateMetrics(username, updates, socket);
      res.json(updatedMetrics);
    } catch (error) {
      res.status(500).json({ error: 'Error updating user metrics' });
    }
  });

  /**
   * Get top users by a metric.
   * GET /api/metrics/top/:metric?limit=10
   */
  router.get('/top/:metric', async (req: Request, res: Response) => {
    try {
      const { metric } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const validMetrics = ['reputationPoints', 'totalAnswers', 'totalQuestions', 'viewsReceived'];
      if (!validMetrics.includes(metric)) {
        res.status(400).json({ error: 'Invalid metric' });
        return;
      }

      const sort = { [metric]: -1 };
      const users = await userMetricsService.listUsersByMetrics({}, limit, sort);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching top users' });
    }
  });

  return router;
};

export default userMetricsController;
