import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { FakeSOSocket } from '../types/types';
import {
  createApplication,
  deleteApplication,
  getAllApplications,
  getApplicationByJobId,
  getApplicationCount,
  hasUserApplied,
} from '../services/jobApplication.service';

/**
 * Express controller for handling job application-related requests.
 * @param socket The socket instance used for emitting application updates.
 * @returns An Express router with endpoints for job application actions.
 */
const jobApplicationController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Creates a new job application.
   * @param req The request object containing the job ID and user information.
   * @param res The response object to send the result.
   */
  const createApplicationRoute = async (req: Request, res: Response): Promise<void> => {
    const { jobId } = req.body as { jobId: string };
    const username = (req.headers as { username?: string }).username as string;

    if (!username) {
      res.status(401).send('Authentication required');
      return;
    }

    if (!jobId || !ObjectId.isValid(jobId)) {
      res.status(400).send('Invalid job ID');
      return;
    }

    try {
      const result = await createApplication(jobId, username);

      if ('error' in result) {
        if (result.error.includes('not found')) {
          res.status(404).send(result.error);
          return;
        }
        throw new Error(result.error);
      }

      // Emit socket event for real-time updates (application count)
      socket.emit('jobApplicationUpdate', {
        jobId,
        type: 'applicationCreated',
      });

      res.status(201).json(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when applying to job: ${err.message}`);
      } else {
        res.status(500).send('Error when applying to job');
      }
    }
  };

  /**
   * Deletes a job application (withdraw application).
   * @param req The request object containing the application ID.
   * @param res The response object to send the result.
   */
  const deleteApplicationRoute = async (req: Request, res: Response): Promise<void> => {
    const { applicationId } = req.params as { applicationId: string };
    const username = (req.headers as { username?: string }).username as string;

    if (!username) {
      res.status(401).send('Authentication required');
      return;
    }

    if (!ObjectId.isValid(applicationId)) {
      res.status(400).send('Invalid application ID');
      return;
    }

    try {
      const result = await deleteApplication(applicationId, username);

      if ('error' in result) {
        if (result.error.includes('not found')) {
          res.status(404).send(result.error);
          return;
        }
        if (result.error.includes('Not authorized')) {
          res.status(403).send(result.error);
          return;
        }
        throw new Error(result.error);
      }

      // Emit socket event for real-time updates (application count)
      socket.emit('jobApplicationUpdate', {
        jobId: result.jobPosting.toString(),
        type: 'applicationDeleted',
      });

      res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when deleting application: ${err.message}`);
      } else {
        res.status(500).send('Error when deleting application');
      }
    }
  };

  /**
   * Gets all job applications for the current user (talent only).
   * @param req The request object.
   * @param res The response object to send the result.
   */
  const getAllApplicationsRoute = async (req: Request, res: Response): Promise<void> => {
    const username = (req.headers as { username?: string }).username as string;

    if (!username) {
      res.status(401).send('Authentication required');
      return;
    }

    try {
      const applications = await getAllApplications(username);

      if ('error' in applications) {
        if (applications.error.includes('not authorized')) {
          res.status(403).send(applications.error);
          return;
        }
        throw new Error(applications.error);
      }

      res.status(200).json(applications);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when fetching applications: ${err.message}`);
      } else {
        res.status(500).send('Error when fetching applications');
      }
    }
  };

  /**
   * Gets all job applications for a specific job posting (recruiter only).
   * @param req The request object containing the job ID.
   * @param res The response object to send the result.
   */
  const getApplicationByJobIdRoute = async (req: Request, res: Response): Promise<void> => {
    const { jobId } = req.params as { jobId: string };
    const username = (req.headers as { username?: string }).username as string;

    if (!username) {
      res.status(401).send('Authentication required');
      return;
    }

    if (!ObjectId.isValid(jobId)) {
      res.status(400).send('Invalid job ID');
      return;
    }

    try {
      const applications = await getApplicationByJobId(username, jobId);

      if ('error' in applications) {
        if (applications.error.includes('not found')) {
          res.status(404).send(applications.error);
          return;
        }
        if (applications.error.includes('not authorized')) {
          res.status(403).send(applications.error);
          return;
        }
        throw new Error(applications.error);
      }

      res.status(200).json(applications);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when fetching applications: ${err.message}`);
      } else {
        res.status(500).send('Error when fetching applications');
      }
    }
  };

  /**
   * Gets the application count for a job posting.
   * @param req The request object containing the job ID.
   * @param res The response object to send the result.
   */
  const getApplicationCountRoute = async (req: Request, res: Response): Promise<void> => {
    const { jobId } = req.params as { jobId: string };

    if (!ObjectId.isValid(jobId)) {
      res.status(400).send('Invalid job ID');
      return;
    }

    try {
      const count = await getApplicationCount(jobId);
      res.status(200).json({ count });
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when fetching application count: ${err.message}`);
      } else {
        res.status(500).send('Error when fetching application count');
      }
    }
  };

  /**
   * Checks if a user has applied to a job posting.
   * @param req The request object containing the job ID.
   * @param res The response object to send the result.
   */
  const hasUserAppliedRoute = async (req: Request, res: Response): Promise<void> => {
    const { jobId } = req.params as { jobId: string };
    const username = (req.headers as { username?: string }).username as string;

    if (!username) {
      res.status(401).send('Authentication required');
      return;
    }

    if (!ObjectId.isValid(jobId)) {
      res.status(400).send('Invalid job ID');
      return;
    }

    try {
      const hasApplied = await hasUserApplied(jobId, username);
      res.status(200).json({ hasApplied });
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when checking application status: ${err.message}`);
      } else {
        res.status(500).send('Error when checking application status');
      }
    }
  };

  // Register routes
  router.post('/create', createApplicationRoute);
  router.delete('/:applicationId', deleteApplicationRoute);
  router.get('/user', getAllApplicationsRoute);
  router.get('/job/:jobId', getApplicationByJobIdRoute);
  router.get('/:jobId/count', getApplicationCountRoute);
  router.get('/:jobId/status', hasUserAppliedRoute);

  return router;
};

export default jobApplicationController;

