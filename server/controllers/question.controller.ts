import express, { Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  Question,
  FindQuestionRequest,
  FindQuestionByIdRequest,
  AddQuestionRequest,
  VoteRequest,
  FakeSOSocket,
  PopulatedDatabaseQuestion,
  CommunityQuestionsRequest,
  DeleteQuestionRequest,
  UpdateQuestionRequest,
} from '../types/types';
import {
  addVoteToQuestion,
  deleteQuestionById,
  updateQuestionById,
  fetchAndIncrementQuestionViewsById,
  filterQuestionsByAskedBy,
  filterQuestionsBySearch,
  getCommunityQuestions,
  getQuestionsByOrder,
  saveQuestion,
} from '../services/question.service';
import { processTags } from '../services/tag.service';
import { populateDocument } from '../utils/database.util';
import { createNotification } from '../services/notification.service';
import { getCommunity } from '../services/community.service';
import UserModel from '../models/users.model';

const questionController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Retrieves a list of questions filtered by a search term and ordered by a specified criterion.
   * If there is an error, the HTTP response's status is updated.
   *
   * @param req The FindQuestionRequest object containing the query parameters `order` and `search`.
   * @param res The HTTP response object used to send back the filtered list of questions.
   *
   * @returns A Promise that resolves to void.
   */
  const getQuestionsByFilter = async (req: FindQuestionRequest, res: Response): Promise<void> => {
    const { order } = req.query;
    const { search } = req.query;
    const { askedBy } = req.query;

    try {
      let qlist: PopulatedDatabaseQuestion[] = await getQuestionsByOrder(order);

      // Filter by askedBy if provided
      if (askedBy) {
        qlist = filterQuestionsByAskedBy(qlist, askedBy);
      }

      // Filter by search keyword and tags
      const resqlist: PopulatedDatabaseQuestion[] = filterQuestionsBySearch(qlist, search);
      res.json(resqlist);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when fetching questions by filter: ${err.message}`);
      } else {
        res.status(500).send(`Error when fetching questions by filter`);
      }
    }
  };

  /**
   * Retrieves a question by its unique ID, and increments the view count for that question.
   * If there is an error, the HTTP response's status is updated.
   *
   * @param req The FindQuestionByIdRequest object containing the question ID as a parameter.
   * @param res The HTTP response object used to send back the question details.
   *
   * @returns A Promise that resolves to void.
   */
  const getQuestionById = async (req: FindQuestionByIdRequest, res: Response): Promise<void> => {
    const { qid } = req.params;
    const { username } = req.query;

    if (!ObjectId.isValid(qid)) {
      res.status(400).send('Invalid ID format');
      return;
    }

    try {
      const q = await fetchAndIncrementQuestionViewsById(qid, username);

      if ('error' in q) {
        throw new Error('Error while fetching question by id');
      }

      socket.emit('viewsUpdate', q);
      res.json(q);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when fetching question by id: ${err.message}`);
      } else {
        res.status(500).send(`Error when fetching question by id`);
      }
    }
  };

  /**
   * Adds a new question to the database. The question is first validated and then saved.
   * If the tags are invalid or saving the question fails, the HTTP response status is updated.
   *
   * @param req The AddQuestionRequest object containing the question data.
   * @param res The HTTP response object used to send back the result of the operation.
   *
   * @returns A Promise that resolves to void.
   */
  const addQuestion = async (req: AddQuestionRequest, res: Response): Promise<void> => {
    const questionData: Question = req.body;

    try {
      const questionswithtags = {
        ...questionData,
        tags: await processTags(questionData.tags),
      };

      if (questionswithtags.tags.length === 0) {
        throw new Error('Invalid tags');
      }

      const result = await saveQuestion(questionswithtags);

      if ('error' in result) {
        throw new Error(result.error);
      }

      // Populates the fields of the question that was added, and emits the new object
      const populatedQuestion = await populateDocument(result._id.toString(), 'question');

      if ('error' in populatedQuestion) {
        throw new Error(populatedQuestion.error);
      }

      const question = populatedQuestion as PopulatedDatabaseQuestion;
      socket.emit('questionUpdate', question);

      // Create and emit notifications for community questions
      if (question.community && question.community._id) {
        const community = await getCommunity(question.community._id.toString());
        if (!('error' in community) && community.participants) {
          // Notify all community participants except the question author
          for (const participant of community.participants) {
            if (participant !== question.askedBy) {
              const participantUser = await UserModel.findOne({ username: participant }).select(
                'notificationPreferences',
              );
              if (
                participantUser &&
                participantUser.notificationPreferences?.enabled &&
                participantUser.notificationPreferences?.communityEnabled
              ) {
                const notification = await createNotification({
                  recipient: participant,
                  type: 'community',
                  title: 'New Question in Community',
                  message: `A new question "${question.title.substring(0, 50)}${question.title.length > 50 ? '...' : ''}" was posted in ${community.name}`,
                  read: false,
                  relatedId: question._id.toString(),
                });

                if (!('error' in notification)) {
                  // Emit real-time notification
                  socket.to(`user_${participant}`).emit('notification', notification);
                }
              }
            }
          }
        }
      }

      res.json(question);
    } catch (err: unknown) {
      if (err instanceof Error) {
        res.status(500).send(`Error when saving question: ${err.message}`);
      } else {
        res.status(500).send(`Error when saving question`);
      }
    }
  };

  /**
   * Helper function to handle upvoting or downvoting a question.
   *
   * @param req The VoteRequest object containing the question ID and the username.
   * @param res The HTTP response object used to send back the result of the operation.
   * @param type The type of vote to perform (upvote or downvote).
   *
   * @returns A Promise that resolves to void.
   */
  const voteQuestion = async (
    req: VoteRequest,
    res: Response,
    type: 'upvote' | 'downvote',
  ): Promise<void> => {
    const { qid, username } = req.body;

    try {
      let status;

      if (type === 'upvote') {
        status = await addVoteToQuestion(qid, username, type);
      } else {
        status = await addVoteToQuestion(qid, username, type);
      }

      if (status && 'error' in status) {
        throw new Error(status.error);
      }

      // Emit the updated vote counts to all connected clients
      socket.emit('voteUpdate', { qid, upVotes: status.upVotes, downVotes: status.downVotes });
      res.json(status);
    } catch (err) {
      res.status(500).send(`Error when ${type}ing: ${(err as Error).message}`);
    }
  };

  /**
   * Handles upvoting a question. The request must contain the question ID (qid) and the username.
   * If the request is invalid or an error occurs, the appropriate HTTP response status and message are returned.
   *
   * @param req The VoteRequest object containing the question ID and the username.
   * @param res The HTTP response object used to send back the result of the operation.
   *
   * @returns A Promise that resolves to void.
   */
  const upvoteQuestion = async (req: VoteRequest, res: Response): Promise<void> => {
    voteQuestion(req, res, 'upvote');
  };

  /**
   * Handles downvoting a question. The request must contain the question ID (qid) and the username.
   * If the request is invalid or an error occurs, the appropriate HTTP response status and message are returned.
   *
   * @param req The VoteRequest object containing the question ID and the username.
   * @param res The HTTP response object used to send back the result of the operation.
   *
   * @returns A Promise that resolves to void.
   */
  const downvoteQuestion = async (req: VoteRequest, res: Response): Promise<void> => {
    voteQuestion(req, res, 'downvote');
  };

  /**
   * Retrieves a list of questions for a specific community. The community ID is passed as a parameter.
   * If there is an error, the HTTP response's status is updated.
   *
   * @param req The CommunityQuestionsRequest object containing the community ID as a parameter.
   * @param res The HTTP response object used to send back the list of questions.
   */
  const getCommunityQuestionsRoute = async (
    req: CommunityQuestionsRequest,
    res: Response,
  ): Promise<void> => {
    const { communityId } = req.params;

    try {
      const questions = await getCommunityQuestions(communityId);

      const populatedQuestions = await Promise.all(
        questions.map(async question => {
          const populatedQuestion = await populateDocument(question._id.toString(), 'question');

          if ('error' in populatedQuestion) {
            throw new Error(populatedQuestion.error);
          }

          return populatedQuestion;
        }),
      );

      res.json(populatedQuestions);
    } catch (err: unknown) {
      res.status(500).send(`Error when fetching community questions: ${(err as Error).message}`);
    }
  };

  /**
   * Deletes a question by its unique ID if the requesting user is the original poster.
   * @param req The DeleteQuestionRequest object containing the question ID as a parameter and the username as a query parameter.
   * @param res The HTTP response object used to send back the result of the operation.
   * @returns A Promise that resolves to void.
   */
  const deleteQuestion = async (req: DeleteQuestionRequest, res: Response): Promise<void> => {
    const { qid } = req.params;
    const { username } = req.query;

    if (!qid || !username) {
      res.status(400).send('Missing question id or username');
      return;
    }

    if (!ObjectId.isValid(qid)) {
      res.status(400).send('Invalid ID format');
      return;
    }

    try {
      const deletionResult = await deleteQuestionById(qid, username);

      if ('error' in deletionResult) {
        if (deletionResult.error.includes('Unauthorized')) {
          res.status(403).json({ error: deletionResult.error });
          return;
        }
        if (deletionResult.error.includes('not found')) {
          res.status(404).json({ error: deletionResult.error });
          return;
        }
        throw new Error(deletionResult.error);
      }

      res.json({ success: true, deletedQuestionId: qid });
    } catch (err: unknown) {
      res.status(500).send(`Error when deleting question: ${(err as Error).message}`);
    }
  };

  /**
   * Updates a question by its unique ID if the requesting user is the original poster.
   * @param req The UpdateQuestionRequest object containing the question ID as a parameter and the updated question details in the body.
   * @param res The HTTP response object used to send back the result of the operation.
   * @returns A Promise that resolves to void.
   */
  const updateQuestion = async (req: UpdateQuestionRequest, res: Response): Promise<void> => {
    const { qid } = req.params;
    const { title, text, username } = req.body;

    if (!qid || !title || !text || !username) {
      res.status(400).send('Missing required fields');
      return;
    }

    if (!ObjectId.isValid(qid)) {
      res.status(400).send('Invalid ID format');
      return;
    }

    try {
      const updateResult = await updateQuestionById(qid, title, text, username);

      if ('error' in updateResult) {
        if (updateResult.error.includes('Unauthorized')) {
          res.status(403).json({ error: updateResult.error });
          return;
        }
        if (updateResult.error.includes('not found')) {
          res.status(404).json({ error: updateResult.error });
          return;
        }
        throw new Error(updateResult.error);
      }

      res.json(updateResult);
    } catch (err: unknown) {
      res.status(500).send(`Error when updating question: ${(err as Error).message}`);
    }
  };

  // add appropriate HTTP verbs and their endpoints to the router
  router.get('/getQuestion', getQuestionsByFilter);
  router.get('/getQuestionById/:qid', getQuestionById);
  router.post('/addQuestion', addQuestion);
  router.post('/upvoteQuestion', upvoteQuestion);
  router.post('/downvoteQuestion', downvoteQuestion);
  router.get('/getCommunityQuestions/:communityId', getCommunityQuestionsRoute);
  router.delete('/delete/:qid', deleteQuestion);
  router.put('/update/:qid', updateQuestion);

  return router;
};

export default questionController;
