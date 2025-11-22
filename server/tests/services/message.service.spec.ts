import mongoose from 'mongoose';
import MessageModel from '../../models/messages.model';
import UserModel from '../../models/users.model';
import { getMessages, saveMessage, deleteMessagesByIds } from '../../services/message.service';
import { Message } from '../../types/types';

const message1: Message = {
  msg: 'Hello',
  msgFrom: 'User1',
  msgDateTime: new Date('2024-06-04'),
  type: 'global',
};

const message2: Message = {
  msg: 'Hi',
  msgFrom: 'User2',
  msgDateTime: new Date('2024-06-05'),
  type: 'global',
};

describe('Message model', () => {
  beforeEach(() => {
    // clean all mocks
    jest.clearAllMocks();
  });

  describe('saveMessage', () => {
    const mockMessage: Message = {
      msg: 'whats up sir',
      msgFrom: 'bostoncareerguy',
      msgDateTime: new Date('2025-01-01T10:00:00.000Z'),
      type: 'direct',
    };

    it('should create a message successfully if user exists', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        username: 'bostoncareerguy',
      });

      // Mock the created message
      const mockCreatedMsg = {
        _id: new mongoose.Types.ObjectId(),
        ...mockMessage,
      };
      jest
        .spyOn(MessageModel, 'create')
        .mockResolvedValueOnce(mockCreatedMsg as unknown as ReturnType<typeof MessageModel.create>);

      const result = await saveMessage(mockMessage);

      expect(result).toMatchObject({
        msg: 'whats up sir',
        msgFrom: 'bostoncareerguy',
        msgDateTime: new Date('2025-01-01T10:00:00.000Z'),
        type: 'direct',
      });
    });

    it('should return an error if user does not exist', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(null);

      const result = await saveMessage(mockMessage);
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Message sender is invalid');
      }
    });

    it('should return an error if message creation fails', async () => {
      // if the database can't save a message then saveMessage should return an error
      jest.spyOn(UserModel, 'findOne').mockResolvedValue({ _id: 'someUserId' });

      jest.spyOn(MessageModel, 'create').mockRejectedValueOnce(new Error('Create failed'));

      const result = await saveMessage(mockMessage);
      expect(result).toHaveProperty('error');
      if ('error' in result) {
        expect(result.error).toContain('Error when saving a message');
      }
    });
  });

  describe('getMessages', () => {
    it('should return all messages, sorted by date', async () => {
      // messages should be sorted by data database-wise
      jest.spyOn(MessageModel, 'find').mockResolvedValueOnce([message2, message1]);

      const messages = await getMessages();

      expect(messages).toMatchObject([message1, message2]);
    });

    it('should return an empty array if error when retrieving messages', async () => {
      jest
        .spyOn(MessageModel, 'find')
        .mockRejectedValueOnce(() => new Error('Error retrieving documents'));

      const messages = await getMessages();

      expect(messages).toEqual([]);
    });
  });

  describe('deleteMessagesByIds', () => {
    it('should delete multiple messages successfully', async () => {
      // when users delete their messages, the content and its references should be completely wiped
      const messageIds = [
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString(),
      ];

      const mockDeleteResult = {
        acknowledged: true,
        deletedCount: 2,
      };

      jest.spyOn(MessageModel, 'deleteMany').mockResolvedValueOnce(mockDeleteResult as any);

      const result = await deleteMessagesByIds(messageIds);

      expect(result).toEqual({ success: true });
      expect(MessageModel.deleteMany).toHaveBeenCalledWith({ _id: { $in: messageIds } });
    });

    it('should return success for empty array without calling deleteMany', async () => {
      const deleteSpy = jest.spyOn(MessageModel, 'deleteMany');

      const result = await deleteMessagesByIds([]);

      expect(result).toEqual({ success: true });
      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it('should return error if deleteMany returns null', async () => {
      const messageIds = [new mongoose.Types.ObjectId().toString()];

      jest.spyOn(MessageModel, 'deleteMany').mockResolvedValueOnce(null as any);

      const result = await deleteMessagesByIds(messageIds);

      expect(result).toHaveProperty('error');
      if ('error' in result) {
        expect(result.error).toContain('Failed to delete messages');
      }
    });

    it('should return error if deleteMany throws an exception', async () => {
      const messageIds = [new mongoose.Types.ObjectId().toString()];

      jest
        .spyOn(MessageModel, 'deleteMany')
        .mockRejectedValueOnce(new Error('Database connection lost'));

      const result = await deleteMessagesByIds(messageIds);

      expect(result).toHaveProperty('error');
      if ('error' in result) {
        expect(result.error).toContain('Error deleting messages');
        expect(result.error).toContain('Database connection lost');
      }
    });
  });
});
