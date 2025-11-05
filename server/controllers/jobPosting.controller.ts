import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import JobPostingModel from '../models/jobPosting.model';
import TagModel from '../models/tags.model';
import {
  createJobPosting,
  deleteJobPosting,
  getJobPostingById,
  getJobPostings,
  toggleJobPostingActive,
} from '../services/jobPosting.service';
import { processTags } from '../services/tag.service';
import {
  DatabaseTag,
  FakeSOSocket,
  FindJobPostingsRequest,
  // do something about these?
  // JobPostingResponse,
  // JobPostingListResponse,
  JobPosting,
} from '../types/types';

/**
 * Express controller for handling job posting-related requests.
 * @param socket The socket instance used for emitting job posting updates.
 * @returns An Express router with endpoints for job posting actions.
 */
const jobPostingController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Retrieves a list of job postings filtered by location, job type, and search terms.
   * If there is an error, the HTTP response's status is updated.
   *
   * @param req The FindJobPostingsRequest object containing query parameters.
   * @param res The HTTP response object used to send back the filtered list of job postings.
   *
   * @returns A Promise that resolves to void.
   */
  const getJobPostingsRoute = async (req: FindJobPostingsRequest, res: Response): Promise<void> => {
    const { location, jobType, search, username } = req.query;

    if (!username) {
      res.status(401).send('Authentication required');
      return;
    }

    try {
      const jobs = await getJobPostings(username, location, jobType, search);

      if ('error' in jobs) {
        throw new Error(jobs.error);
      }

      res.json(jobs);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when fetching job postings: ${err.message}`);
      } else {
        res.status(500).send('Error when fetching job postings');
      }
    }
  };

  /**
   * Retrieves a job posting by its unique ID.
   * If there is an error, the HTTP response's status is updated.
   *
   * @param req The request object containing the job posting ID as a parameter.
   * @param res The HTTP response object used to send back the job posting details.
   *
   * @returns A Promise that resolves to void.
   */
  const getJobPostingByIdRoute = async (req: Request, res: Response): Promise<void> => {
    const { jobId } = req.params as { jobId: string };

    if (!ObjectId.isValid(jobId)) {
      res.status(400).send('Invalid ID format');
      return;
    }

    try {
      const job = await getJobPostingById(jobId);

      if ('error' in job) {
        if (job.error.includes('not found')) {
          res.status(404).send(job.error);
          return;
        }
        throw new Error(job.error);
      }

      res.json(job);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when fetching job posting by id: ${err.message}`);
      } else {
        res.status(500).send('Error when fetching job posting by id');
      }
    }
  };

  /**
   * Creates a new job posting. The job posting is first validated and then saved.
   * If validation or saving fails, the HTTP response status is updated.
   *
   * @param req The request object containing the job posting data.
   * @param res The HTTP response object used to send back the result of the operation.
   *
   * @returns A Promise that resolves to void.
   */
  const createJobPostingRoute = async (req: Request, res: Response): Promise<void> => {
    const job = req.body as JobPosting;
    const { username } = req.query;

    if (!username) {
      res.status(401).send('Authentication required');
      return;
    }

    try {
      // Process tags similar to questions
      const jobWithTags = {
        ...job,
        tags: await processTags(job.tags),
      };

      if (jobWithTags.tags.length === 0 && job.tags.length > 0) {
        throw new Error('Invalid tags');
      }

      const result = await createJobPosting(jobWithTags);

      if ('error' in result) {
        throw new Error(result.error);
      }

      // Populate tags for the response
      const populatedJob = await JobPostingModel.findById(result._id).populate<{
        tags: DatabaseTag[];
      }>({
        path: 'tags',
        model: TagModel,
      });

      if (!populatedJob) {
        throw new Error('Failed to fetch created job posting');
      }

      socket.emit('jobPostingUpdate', populatedJob);
      res.json(populatedJob);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when saving job posting: ${err.message}`);
      } else {
        res.status(500).send('Error when saving job posting');
      }
    }
  };

  /**
   * Deletes a job posting (recruiter only).
   *
   * @param req The request object containing the job posting ID.
   * @param res The HTTP response object used to send back the result.
   *
   * @returns A Promise that resolves to void.
   */
  const deleteJobPostingRoute = async (req: Request, res: Response): Promise<void> => {
    const { jobId } = req.params as { jobId: string };
    const username = (req.headers as { username?: string }).username as string;

    if (!username) {
      res.status(401).send('Authentication required');
      return;
    }

    if (!ObjectId.isValid(jobId)) {
      res.status(400).send('Invalid ID format');
      return;
    }

    try {
      const result = await deleteJobPosting(jobId, username);

      if ('error' in result) {
        if (result.error.includes('not found')) {
          res.status(404).send(result.error);
          return;
        }
        throw new Error(result.error);
      }

      socket.emit('jobPostingUpdate', { type: 'deleted', jobId });
      res.json(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when deleting job posting: ${err.message}`);
      } else {
        res.status(500).send('Error when deleting job posting');
      }
    }
  };

  /**
   * Toggles a job posting's active status (recruiter only).
   *
   * @param req The request object containing the job posting ID.
   * @param res The HTTP response object used to send back the result.
   *
   * @returns A Promise that resolves to void.
   */
  const toggleJobPostingActiveRoute = async (req: Request, res: Response): Promise<void> => {
    const { jobId } = req.params as { jobId: string };
    const { username } = req.query as { username?: string };

    if (!username) {
      res.status(401).send('Authentication required');
      return;
    }

    if (!ObjectId.isValid(jobId)) {
      res.status(400).send('Invalid ID format');
      return;
    }

    try {
      const result = await toggleJobPostingActive(jobId, username);

      if ('error' in result) {
        if (result.error.includes('not found')) {
          res.status(404).send(result.error);
          return;
        }
        throw new Error(result.error);
      }

      socket.emit('jobPostingUpdate', result);
      res.json(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when toggling job posting status: ${err.message}`);
      } else {
        res.status(500).send('Error when toggling job posting status');
      }
    }
  };

  // Register routes
  router.get('/list', getJobPostingsRoute);
  router.get('/:jobId', getJobPostingByIdRoute);
  router.post('/create', createJobPostingRoute);
  router.delete('/:jobId', deleteJobPostingRoute);
  router.patch('/:jobId/toggle', toggleJobPostingActiveRoute);

  return router;
};

export default jobPostingController;
