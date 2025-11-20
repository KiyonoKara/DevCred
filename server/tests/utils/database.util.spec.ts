import mongoose, { Query } from 'mongoose';
import { populateDocument } from '../../utils/database.util';
import QuestionModel from '../../models/questions.model';
import AnswerModel from '../../models/answers.model';
import ChatModel from '../../models/chat.model';
import UserModel from '../../models/users.model';
import {
  PopulatedDatabaseQuestion,
  PopulatedDatabaseAnswer,
  PopulatedDatabaseChat,
} from '../../types/types';

describe('populateDocument', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and populate a question document', async () => {
    const mockQuestion: PopulatedDatabaseQuestion = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Test Question',
      text: 'Test text',
      tags: [],
      answers: [],
      comments: [],
      askedBy: 'user1',
      askDateTime: new Date(),
      views: [],
      upVotes: [],
      downVotes: [],
      community: null,
    };

    jest.spyOn(QuestionModel, 'findOne').mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockQuestion),
    } as unknown as Query<PopulatedDatabaseQuestion, typeof QuestionModel>);

    const result = await populateDocument(mockQuestion._id.toString(), 'question');

    expect(QuestionModel.findOne).toHaveBeenCalledWith({ _id: mockQuestion._id.toString() });
    expect(result).toEqual(mockQuestion);
  });

  it('should return an error message if question document is not found', async () => {
    const questionId = new mongoose.Types.ObjectId();

    jest.spyOn(QuestionModel, 'findOne').mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    } as unknown as Query<PopulatedDatabaseQuestion, typeof QuestionModel>);

    const questionID = questionId.toString();
    const result = await populateDocument(questionID, 'question');

    expect(result).toEqual({
      error: `Error when fetching and populating a document: Failed to fetch and populate question with ID: ${
        questionID
      }`,
    });
  });

  it('should return an error message if fetching a question document throws an error', async () => {
    const questionId = new mongoose.Types.ObjectId();
    jest.spyOn(QuestionModel, 'findOne').mockImplementation(() => {
      throw new Error('Database error');
    });

    const result = await populateDocument(questionId.toString(), 'question');

    expect(result).toEqual({
      error: 'Error when fetching and populating a document: Database error',
    });
  });

  it('should fetch and populate an answer document', async () => {
    const answerId = new mongoose.Types.ObjectId();
    const mockAnswer: PopulatedDatabaseAnswer = {
      _id: answerId,
      text: 'Test answer',
      ansBy: 'user1',
      ansDateTime: new Date(),
      comments: [],
    };

    jest.spyOn(AnswerModel, 'findOne').mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockAnswer),
    } as unknown as Query<PopulatedDatabaseAnswer, typeof AnswerModel>);

    const result = await populateDocument(answerId.toString(), 'answer');

    expect(AnswerModel.findOne).toHaveBeenCalledWith({ _id: answerId.toString() });
    expect(result).toEqual(mockAnswer);
  });

  it('should return an error message if answer document is not found', async () => {
    const answerId = new mongoose.Types.ObjectId();

    jest.spyOn(AnswerModel, 'findOne').mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    } as unknown as Query<PopulatedDatabaseAnswer, typeof AnswerModel>);

    const answerID = answerId.toString();
    const result = await populateDocument(answerID, 'answer');

    expect(result).toEqual({
      error: `Error when fetching and populating a document: Failed to fetch and populate answer with ID: ${
        answerID
      }`,
    });
  });

  it('should return an error message if fetching an answer document throws an error', async () => {
    const answerId = new mongoose.Types.ObjectId();
    jest.spyOn(AnswerModel, 'findOne').mockImplementation(() => {
      throw new Error('Database error');
    });

    const result = await populateDocument(answerId.toString(), 'answer');

    expect(result).toEqual({
      error: 'Error when fetching and populating a document: Database error',
    });
  });

  it('should fetch and populate a chat document', async () => {
    const chatId = new mongoose.Types.ObjectId();
    const messageId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const msgDateTime = new Date();
    const mockChat = {
      _id: chatId,
      messages: [
        {
          _id: messageId,
          msg: 'Hello',
          msgFrom: 'user1',
          msgDateTime: msgDateTime,
          type: 'text',
        },
      ],
      deletedBy: [],
      toObject: jest.fn().mockReturnValue({
        _id: chatId,
        messages: [
          {
            _id: messageId,
            msg: 'Hello',
            msgFrom: 'user1',
            msgDateTime: msgDateTime,
            type: 'text',
          },
        ],
        deletedBy: [],
      }),
    };
    const mockUser = {
      _id: userId,
      username: 'user1',
    };

    jest.spyOn(ChatModel, 'findOne').mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockChat),
    } as unknown as Query<PopulatedDatabaseChat, typeof ChatModel>);
    jest.spyOn(UserModel, 'findOne').mockResolvedValue(mockUser as any);

    const result = await populateDocument(chatId.toString(), 'chat');

    expect(ChatModel.findOne).toHaveBeenCalledWith({ _id: chatId.toString() });
    expect(result).toEqual({
      ...mockChat.toObject(),
      messages: [
        {
          _id: messageId,
          msg: 'Hello',
          msgFrom: 'user1',
          msgDateTime: msgDateTime,
          type: 'text',
          user: {
            _id: userId,
            username: 'user1',
          },
        },
      ],
    });
  });

  it('should return an error message if chat document is not found', async () => {
    const chatId = new mongoose.Types.ObjectId();

    jest.spyOn(ChatModel, 'findOne').mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    } as unknown as Query<PopulatedDatabaseChat, typeof ChatModel>);

    const result = await populateDocument(chatId.toString(), 'chat');

    expect(result).toEqual({
      error: 'Error when fetching and populating a document: Chat not found',
    });
  });

  it('should return an error message if fetching a chat document throws an error', async () => {
    const chatId = new mongoose.Types.ObjectId();
    jest.spyOn(ChatModel, 'findOne').mockImplementation(() => {
      throw new Error('Database error');
    });

    const result = await populateDocument(chatId.toString(), 'chat');

    expect(result).toEqual({
      error: 'Error when fetching and populating a document: Database error',
    });
  });

  it('should return an error message if type is invalid', async () => {
    const someId = new mongoose.Types.ObjectId();
    const invalidType = 'invalidType' as 'question' | 'answer' | 'chat';
    const result = await populateDocument(someId.toString(), invalidType);
    expect(result).toEqual({
      error: 'Error when fetching and populating a document: Invalid type provided.',
    });
  });
});
