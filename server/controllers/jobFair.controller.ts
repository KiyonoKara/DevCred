import express, { Response } from 'express';
import {
  FakeSOSocket,
  CreateJobFairRequest,
  JobFairIdRequest,
  JoinJobFairRequest,
  AddJobFairMessageRequest,
} from '../types/types';
import {
  createJobFair,
  getJobFairs,
  getJobFairById,
  updateJobFairStatus,
  joinJobFair,
  leaveJobFair,
  addJobFairMessage,
  deleteJobFair,
} from '../services/jobFair.service';

/**
 * Express controller for handling job fair-related requests.
 * @param socket The socket instance used for emitting job fair updates.
 * @returns An Express router with endpoints for job fair actions.
 */
const jobFairController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Creates a new job fair.
   * @param req The request object containing job fair data.
   * @param res The response object to send the result.
   */
  const createJobFairRoute = async (req: CreateJobFairRequest, res: Response) => {
    try {
      const {
        title,
        description,
        visibility,
        startTime,
        endTime,
        invitedUsers,
        codingTournamentEnabled,
      } = req.body;
      // Get host username from user context
      const hostUsername = req.body.hostUsername || (req.headers.username as string);
      if (!hostUsername) {
        return res.status(400).json({ error: 'Host username is required' });
      }

      const jobFairData = {
        title,
        description,
        hostUsername,
        visibility,
        status: 'upcoming' as const,
        startTime: startTime,
        endTime: endTime,
        codingTournamentEnabled: codingTournamentEnabled ?? true,
        participants: [],
        invitedUsers: invitedUsers || [],
        chatMessages: [],
        codingSubmissions: [],
        documents: [],
      };

      const result = await createJobFair(jobFairData);

      if ('error' in result) {
        throw new Error(result.error);
      }

      // Convert ObjectId to string for response
      const responseData = JSON.parse(JSON.stringify(result));
      responseData._id = result._id.toString();

      // Emit socket event
      socket.emit('jobFairUpdate', {
        jobFair: responseData,
        type: 'created',
      });

      res.status(201).json(responseData);
    } catch (error) {
      res.status(500).send(`Error creating job fair: ${(error as Error).message}`);
    }
  };

  /**
   * Gets all accessible job fairs for the user.
   * @param req The request object.
   * @param res The response object to send the result.
   */
  const getJobFairsRoute = async (req: express.Request, res: Response) => {
    try {
      const { status, visibility } = req.query;
      const username = req.headers.username as string;

      const jobFairs = await getJobFairs(
        status as 'upcoming' | 'live' | 'ended',
        visibility as 'public' | 'invite-only',
        username,
      );

      if ('error' in jobFairs) {
        throw new Error(jobFairs.error);
      }

      // Convert ObjectIds to strings for response
      const responseData = jobFairs.map(jobFair => ({
        ...JSON.parse(JSON.stringify(jobFair)),
        _id: jobFair._id.toString(),
      }));

      res.status(200).json(responseData);
    } catch (error) {
      res.status(500).send(`Error retrieving job fairs: ${(error as Error).message}`);
    }
  };

  /**
   * Retrieves a job fair by its ID.
   * @param req The request object containing the job fair ID.
   * @param res The response object to send the result.
   */
  const getJobFairByIdRoute = async (req: JobFairIdRequest, res: Response) => {
    try {
      const { jobFairId } = req.params;
      const username = req.headers.username as string;

      const jobFair = await getJobFairById(jobFairId, username);

      if ('error' in jobFair) {
        if (jobFair.error.includes('not found')) {
          return res.status(404).json({ error: jobFair.error });
        }
        if (jobFair.error.includes('Access denied')) {
          return res.status(403).json({ error: jobFair.error });
        }
        throw new Error(jobFair.error);
      }

      // Convert ObjectId to string for response
      const responseData = {
        ...JSON.parse(JSON.stringify(jobFair)),
        _id: jobFair._id.toString(),
      };

      res.status(200).json(responseData);
    } catch (error) {
      res.status(500).send(`Error retrieving job fair: ${(error as Error).message}`);
    }
  };

  /**
   * Updates a job fair's status (host only).
   * @param req The request object containing the job fair ID and new status.
   * @param res The response object to send the result.
   */
  const updateJobFairStatusRoute = async (
    req: JobFairIdRequest & {
      body: { status: 'upcoming' | 'live' | 'ended'; hostUsername?: string };
    },
    res: Response,
  ) => {
    try {
      const { jobFairId } = req.params;
      const { status, hostUsername } = req.body;

      if (!hostUsername) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await updateJobFairStatus(jobFairId, hostUsername, status);

      if ('error' in result) {
        if (result.error.includes('not found')) {
          return res.status(404).json({ error: result.error });
        }
        if (result.error.includes('Only the host')) {
          return res.status(403).json({ error: result.error });
        }
        throw new Error(result.error);
      }

      // Convert ObjectId to string for response
      const responseData = {
        ...JSON.parse(JSON.stringify(result)),
        _id: result._id.toString(),
      };

      // Emit socket event
      socket.emit('jobFairUpdate', {
        jobFair: responseData,
        type: 'statusChanged',
      });

      res.status(200).json(responseData);
    } catch (error) {
      res.status(500).send(`Error updating job fair status: ${(error as Error).message}`);
    }
  };

  /**
   * Adds a participant to a job fair.
   * @param req The request object containing the job fair ID and participant data.
   * @param res The response object to send the result.
   */
  const joinJobFairRoute = async (req: JoinJobFairRequest, res: Response) => {
    try {
      const { jobFairId } = req.params;
      const { username } = req.body;

      const result = await joinJobFair(jobFairId, username);

      if ('error' in result) {
        if (result.error.includes('not found')) {
          return res.status(404).json({ error: result.error });
        }
        if (result.error.includes('Access denied')) {
          return res.status(403).json({ error: result.error });
        }
        if (result.error.includes('already a participant')) {
          return res.status(400).json({ error: result.error });
        }
        throw new Error(result.error);
      }

      // Convert ObjectId to string for response
      const responseData = {
        ...JSON.parse(JSON.stringify(result)),
        _id: result._id.toString(),
      };

      // Emit socket event for real-time updates
      socket.to(`jobFair_${jobFairId}`).emit('jobFairUpdate', {
        jobFair: responseData,
        type: 'participantJoined',
      });

      res.status(200).json(responseData);
    } catch (error) {
      res.status(500).send(`Error joining job fair: ${(error as Error).message}`);
    }
  };

  /**
   * Removes a participant from a job fair.
   * @param req The request object containing the job fair ID.
   * @param res The response object to send the result.
   */
  const leaveJobFairRoute = async (
    req: JobFairIdRequest & { body: { username: string } },
    res: Response,
  ) => {
    try {
      const { jobFairId } = req.params;
      const { username } = req.body;

      if (!username) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await leaveJobFair(jobFairId, username);

      if ('error' in result) {
        if (result.error.includes('not found')) {
          return res.status(404).json({ error: result.error });
        }
        if (result.error.includes('not a participant')) {
          return res.status(400).json({ error: result.error });
        }
        throw new Error(result.error);
      }

      // Convert ObjectId to string for response
      const responseData = {
        ...JSON.parse(JSON.stringify(result)),
        _id: result._id.toString(),
      };

      // Emit socket event for real-time updates
      socket.to(`jobFair_${jobFairId}`).emit('jobFairUpdate', {
        jobFair: responseData,
        type: 'participantLeft',
      });

      res.status(200).json(responseData);
    } catch (error) {
      res.status(500).send(`Error leaving job fair: ${(error as Error).message}`);
    }
  };

  /**
   * Adds a message to a job fair chat.
   * @param req The request object containing the message data.
   * @param res The response object to send the result.
   */
  const addJobFairMessageRoute = async (req: AddJobFairMessageRequest, res: Response) => {
    try {
      const { jobFairId } = req.params;
      const { msg, msgFrom, msgDateTime } = req.body;

      const result = await addJobFairMessage(jobFairId, {
        msg,
        msgFrom,
        msgDateTime: new Date(msgDateTime),
      });

      if ('error' in result) {
        if (result.error.includes('not found')) {
          return res.status(404).json({ error: result.error });
        }
        if (result.error.includes('Only participants')) {
          return res.status(403).json({ error: result.error });
        }
        throw new Error(result.error);
      }

      // Convert ObjectId to string for response
      const responseData = {
        ...JSON.parse(JSON.stringify(result)),
        _id: result._id.toString(),
      };

      // Emit socket event for real-time chat updates to all users in the room
      // (clients will filter out their own messages to prevent duplicates)
      socket.to(`jobFair_${jobFairId}`).emit('jobFairChatMessage', {
        jobFairId,
        message: {
          msg,
          msgFrom,
          msgDateTime: new Date(msgDateTime),
        },
      });

      res.status(200).json(responseData);
    } catch (error) {
      res.status(500).send(`Error adding job fair message: ${(error as Error).message}`);
    }
  };

  /**
   * Deletes a job fair (host only).
   * @param req The request object containing the job fair ID.
   * @param res The response object to send the result.
   */
  const deleteJobFairRoute = async (req: JobFairIdRequest, res: Response) => {
    try {
      const { jobFairId } = req.params;
      const hostUsername = req.headers.username as string;

      if (!hostUsername) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const result = await deleteJobFair(jobFairId, hostUsername);

      if ('error' in result) {
        if (result.error.includes('not found')) {
          return res.status(404).json({ error: result.error });
        }
        if (result.error.includes('Only the host')) {
          return res.status(403).json({ error: result.error });
        }
        throw new Error(result.error);
      }

      // Emit socket event
      const responseData = {
        ...JSON.parse(JSON.stringify(result)),
        _id: result._id.toString(),
      };

      socket.emit('jobFairUpdate', {
        jobFair: responseData,
        type: 'deleted',
      });

      res.status(200).json(responseData);
    } catch (error) {
      res.status(500).send(`Error deleting job fair: ${(error as Error).message}`);
    }
  };

  // Socket event handlers for job fair-based events
  socket.on('connection', connection => {
    // When user joins job fair room
    connection.on('joinJobFair', (jobFairId: string) => {
      connection.join(`jobFair_${jobFairId}`);
    });

    // When user leaves job fair room
    connection.on('leaveJobFair', (jobFairId: string) => {
      connection.leave(`jobFair_${jobFairId}`);
    });
  });

  /**
   * Submits a coding challenge solution to a job fair tournament.
   * @param req The request object containing the coding submission.
   * @param res The response object to send the result.
   */
  const submitCodingChallengeRoute = async (
    req: JobFairIdRequest & {
      body: { code: string; language: string; submittedAt: string; submittedBy: string };
    },
    res: Response,
  ) => {
    try {
      const { jobFairId } = req.params;
      const { code, language, submittedAt, submittedBy } = req.body;

      if (!submittedBy) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Persist coding submission as a special message so it loads with chat history.
      // We prefix the payload to recover language and separate it from plain chat messages.
      const payloadMsg = `__CODE_SUBMISSION__${language}__\n${code}`;
      const result = await addJobFairMessage(jobFairId, {
        msg: payloadMsg,
        msgFrom: submittedBy,
        msgDateTime: new Date(submittedAt),
      });

      if ('error' in result) {
        if (result.error.includes('not found')) {
          return res.status(404).json({ error: result.error });
        }
        if (result.error.includes('Only participants')) {
          return res.status(403).json({ error: result.error });
        }
        throw new Error(result.error);
      }

      // Convert ObjectId to string for response
      const responseData = {
        ...JSON.parse(JSON.stringify(result)),
        _id: result._id.toString(),
      };

      // Emit socket event for real-time updates to all users in the job fair room
      socket.to(`jobFair_${jobFairId}`).emit('codingSubmission', {
        jobFairId,
        submission: {
          code,
          language,
          submittedAt: new Date(submittedAt),
          submittedBy,
        },
      });

      res.status(200).json(responseData);
    } catch (error) {
      res.status(500).send(`Error submitting coding challenge: ${(error as Error).message}`);
    }
  };

  // Register the routes
  router.post('/create', createJobFairRoute);
  router.get('/list', getJobFairsRoute);
  router.get('/:jobFairId', getJobFairByIdRoute);
  router.patch('/:jobFairId/status', updateJobFairStatusRoute);
  router.post('/:jobFairId/join', joinJobFairRoute);
  router.post('/:jobFairId/leave', leaveJobFairRoute);
  router.post('/:jobFairId/message', addJobFairMessageRoute);
  router.post('/:jobFairId/submission', submitCodingChallengeRoute);
  router.delete('/:jobFairId', deleteJobFairRoute);

  return router;
};

export default jobFairController;
