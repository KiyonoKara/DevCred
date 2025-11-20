import express, { Response } from 'express';
import { ObjectId } from 'mongodb';
import {
  Answer,
  AddAnswerRequest,
  DeleteAnswerRequest,
  UpdateAnswerRequest,
  FakeSOSocket,
  PopulatedDatabaseAnswer,
} from '../types/types';
import {
  addAnswerToQuestion,
  deleteAnswerById,
  updateAnswerById,
  saveAnswer,
} from '../services/answer.service';
import { populateDocument } from '../utils/database.util';

const answerController = (socket: FakeSOSocket) => {
  const router = express.Router();
  /**
   * Adds a new answer to a question in the database. The answer request and answer are
   * validated and then saved. If successful, the answer is associated with the corresponding
   * question. If there is an error, the HTTP response's status is updated.
   *
   * @param req The AnswerRequest object containing the question ID and answer data.
   * @param res The HTTP response object used to send back the result of the operation.
   *
   * @returns A Promise that resolves to void.
   */
  const addAnswer = async (req: AddAnswerRequest, res: Response): Promise<void> => {
    const { qid } = req.body;
    const ansInfo: Answer = req.body.ans;

    try {
      const ansFromDb = await saveAnswer(ansInfo);

      if ('error' in ansFromDb) {
        throw new Error(ansFromDb.error as string);
      }

      const status = await addAnswerToQuestion(qid, ansFromDb);

      if (status && 'error' in status) {
        throw new Error(status.error as string);
      }

      const populatedAns = await populateDocument(ansFromDb._id.toString(), 'answer');

      if (populatedAns && 'error' in populatedAns) {
        throw new Error(populatedAns.error);
      }

      // Populates the fields of the answer that was added and emits the new object
      socket.emit('answerUpdate', {
        qid: new ObjectId(qid),
        answer: populatedAns as PopulatedDatabaseAnswer,
      });
      const responsePayload = {
        _id: ansFromDb._id.toString(),
        text: ansFromDb.text,
        ansBy: ansFromDb.ansBy,
        ansDateTime: ansFromDb.ansDateTime,
        comments: Array.isArray(ansFromDb.comments)
          ? ansFromDb.comments.map(comment => comment.toString())
          : [],
      };
      res.json(responsePayload);
    } catch (err) {
      res.status(500).send(`Error when adding answer: ${(err as Error).message}`);
    }
  };

  /**
   * Deletes an answer from the database based on its ID and the username of the requester.
   * @param req The DeleteAnswerRequest object containing the answer ID as a parameter and the username as a query parameter.
   * @param res The HTTP response object used to send back the result of the operation.
   * @returns Void Promise
   */
  const deleteAnswer = async (req: DeleteAnswerRequest, res: Response): Promise<void> => {
    const { aid } = req.params;
    const { username } = req.query;

    if (!aid || !username) {
      res.status(400).send('Missing answer id or username');
      return;
    }

    if (!ObjectId.isValid(aid)) {
      res.status(400).send('Invalid ID format');
      return;
    }

    try {
      const deletionResult = await deleteAnswerById(aid, username);

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
      res.json({ success: true, deletedAnswerId: aid });
    } catch (err: unknown) {
      res.status(500).send(`Error when deleting answer: ${(err as Error).message}`);
    }
  };

  /**
   * Updates an existing answer's text in the database.
   * @param req The UpdateAnswerRequest object containing the answer ID as a parameter and the updated text and username in the body.
   * @param res The HTTP response object used to send back the result of the operation.
   * @returns Void Promise
   */
  const updateAnswer = async (req: UpdateAnswerRequest, res: Response): Promise<void> => {
    const { aid } = req.params;
    const { text, username } = req.body;

    if (!aid || !text || !username) {
      res.status(400).send('Missing required fields');
      return;
    }

    if (!ObjectId.isValid(aid)) {
      res.status(400).send('Invalid ID format');
      return;
    }

    try {
      const updateResult = await updateAnswerById(aid, text, username);

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
      res.status(500).send(`Error when updating answer: ${(err as Error).message}`);
    }
  };

  // add appropriate HTTP verbs and their endpoints to the router.
  router.post('/addAnswer', addAnswer);
  router.delete('/delete/:aid', deleteAnswer);
  router.put('/update/:aid', updateAnswer);

  return router;
};

export default answerController;
