import mongoose from 'mongoose';
import ChatModel from '../../models/chat.model';
import MessageModel from '../../models/messages.model';
import UserModel from '../../models/users.model';
import * as messageService from '../../services/message.service';
import {
  saveChat,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  getChatsByParticipants,
  deleteDMForUser,
  resetDeletionTracking,
  deleteDMCompletely,
  getDMsByUserWithoutDeleted,
  canReceiveDirectMessages,
} from '../../services/chat.service';
import { Chat, DatabaseChat } from '../../types/types';
import { user } from '../mockData.models';

describe('Chat service', () => {
  beforeEach(() => {
    // clean all mocks
    jest.clearAllMocks();
  });

  describe('saveChat', () => {
    const mockChatPayload: Chat = {
      participants: ['user1'],
      messages: [
        {
          msg: 'Hello!',
          msgFrom: 'user1',
          msgDateTime: new Date('2025-01-01T00:00:00.000Z'),
          type: 'direct',
        },
      ],
    };

    it('should successfully save a chat and verify its body (ignore exact IDs)', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(user);

      jest.spyOn(MessageModel, 'create').mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        msg: 'Hello!',
        msgFrom: 'user1',
        msgDateTime: new Date('2025-01-01T00:00:00Z'),
        type: 'direct',
      } as unknown as ReturnType<typeof MessageModel.create>);

      jest.spyOn(ChatModel, 'create').mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1'],
        messages: [new mongoose.Types.ObjectId()],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as ReturnType<typeof ChatModel.create>);

      const result = await saveChat(mockChatPayload);

      if ('error' in result) {
        throw new Error(`Expected a Chat, got error: ${result.error}`);
      }

      expect(result).toHaveProperty('_id');
      expect(Array.isArray(result.participants)).toBe(true);
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.participants[0].toString()).toEqual(expect.any(String));
      expect(result.messages[0].toString()).toEqual(expect.any(String));
    });

    it('should return an error if an exception occurs', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(user);
      jest.spyOn(MessageModel, 'create').mockResolvedValueOnce({
        error: 'Error when saving a message',
      } as unknown as ReturnType<typeof MessageModel.create>);

      const result = await saveChat(mockChatPayload);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error when saving a message');
      }
    });
  });

  describe('addMessageToChat', () => {
    it('should add a message ID to an existing chat', async () => {
      const chatId = new mongoose.Types.ObjectId().toString();
      const messageId = new mongoose.Types.ObjectId().toString();

      const mockUpdatedChat: Chat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['testUser'],
        messages: [new mongoose.Types.ObjectId()],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Chat;

      jest.spyOn(ChatModel, 'findOneAndUpdate').mockResolvedValueOnce(mockUpdatedChat);

      const result = await addMessageToChat(chatId, messageId);
      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }

      expect(result.messages).toEqual(mockUpdatedChat.messages);
    });

    it('should return an error if chat is not found', async () => {
      jest.spyOn(ChatModel, 'findOneAndUpdate').mockResolvedValueOnce(null);

      const result = await addMessageToChat('invalidChatId', 'someMsgId');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Chat not found');
      }
    });

    it('should return an error if DB fails', async () => {
      jest.spyOn(ChatModel, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('DB Error'));

      const result = await addMessageToChat('anyChatId', 'anyMessageId');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error adding message to chat:');
      }
    });
  });

  describe('getChat', () => {
    it('should retrieve a chat by ID', async () => {
      const mockFoundChat: DatabaseChat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['testUser'],
        messages: [],
        deletedBy: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(ChatModel, 'findOne').mockResolvedValueOnce(mockFoundChat);
      const result = await getChat(mockFoundChat._id.toString());

      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }
      expect(result._id).toEqual(mockFoundChat._id);
    });

    it('should return an error if the chat is not found', async () => {
      jest.spyOn(ChatModel, 'findOne').mockResolvedValueOnce(null);

      const result = await getChat('anyChatId');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Chat not found');
      }
    });

    it('should return an error if DB fails', async () => {
      jest.spyOn(ChatModel, 'findById').mockRejectedValueOnce(new Error('DB Error'));

      const result = await getChat('dbFailChatId');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error retrieving chat:');
      }
    });
  });

  describe('addParticipantToChat', () => {
    it('should add a participant if user exists', async () => {
      // mock the user lookup to return a valid user
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        username: 'testUser',
      });

      const mockChat: DatabaseChat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['testUser'],
        messages: [],
        deletedBy: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(ChatModel, 'findOneAndUpdate').mockResolvedValueOnce(mockChat);

      const result = await addParticipantToChat(mockChat._id.toString(), 'newUserId');
      if ('error' in result) {
        throw new Error('Expected a chat, got an error');
      }
      expect(result._id).toEqual(mockChat._id);
    });

    it('should return an error if user does not exist', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);

      const result = await addParticipantToChat('anyChatId', 'nonExistentUser');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('User does not exist.');
      }
    });

    it('should return an error if chat is not found', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce({
        _id: 'validUserId',
      });
      jest.spyOn(ChatModel, 'findOneAndUpdate').mockResolvedValueOnce(null);

      const result = await addParticipantToChat('anyChatId', 'validUserId');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Chat not found or user already a participant.');
      }
    });

    it('should return an error if DB fails', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce({
        _id: 'validUserId',
      });
      jest.spyOn(ChatModel, 'findOneAndUpdate').mockRejectedValueOnce(new Error('DB Error'));

      const result = await addParticipantToChat('chatId', 'validUserId');
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error adding participant to chat:');
      }
    });
  });

  describe('getChatsByParticipants', () => {
    it('should retrieve chats by participants', async () => {
      // setup the mock chat data to be used in the test
      const mockChats: DatabaseChat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          deletedBy: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user3'],
          messages: [],
          deletedBy: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const participantsUsedAsInput = ['user1', 'user2'];
      // mock the find method of ChatModel to return the mock chat data for participantsUsedAsInput
      jest.spyOn(ChatModel, 'find').mockImplementation((cond?: any) => {
        if (!cond) {
          expect(false).toBe(true);
        }
        expect(cond).toHaveProperty('participants');
        expect(JSON.stringify(cond.participants)).toContain(participantsUsedAsInput[0]);
        expect(JSON.stringify(cond.participants)).toContain(participantsUsedAsInput[1]);
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockChats[0]]));
        return query;
      });

      const result = await getChatsByParticipants(participantsUsedAsInput);

      expect(result).toHaveLength(1);
      expect(result).toEqual([mockChats[0]]);
    });

    it('should retrieve chats by participants where the provided list is a subset', async () => {
      const mockChats: DatabaseChat[] = [
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user2'],
          messages: [],
          deletedBy: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user1', 'user3'],
          messages: [],
          deletedBy: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: new mongoose.Types.ObjectId(),
          participants: ['user2', 'user3'],
          messages: [],
          deletedBy: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const participantsUsedAsInput = ['user1'];
      // mock the find method of ChatModel to return the mock chat data for participantsUsedAsInput
      jest.spyOn(ChatModel, 'find').mockImplementation((cond?: any) => {
        if (!cond) {
          expect(false).toBe(true);
        }
        expect(cond).toHaveProperty('participants');
        expect(JSON.stringify(cond.participants)).toContain(participantsUsedAsInput[0]);
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([mockChats[0], mockChats[1]]));
        return query;
      });

      const result = await getChatsByParticipants(participantsUsedAsInput);
      expect(result).toHaveLength(2);
      expect(result).toEqual([mockChats[0], mockChats[1]]);
    });

    it('should return an empty array if no chats are found', async () => {
      const participantsUsedAsInput = ['user1'];
      // mock the find method of ChatModel to return the mock chat data for participantsUsedAsInput
      jest.spyOn(ChatModel, 'find').mockImplementation((cond?: any) => {
        if (!cond) {
          expect(false).toBe(true);
        }
        expect(cond).toHaveProperty('participants');
        expect(JSON.stringify(cond.participants)).toContain(participantsUsedAsInput[0]);
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve([]));
        return query;
      });

      const result = await getChatsByParticipants(['user1']);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array if chats is null', async () => {
      const participantsUsedAsInput = ['user1'];
      // mock the find method of ChatModel to return the mock chat data for participantsUsedAsInput
      jest.spyOn(ChatModel, 'find').mockImplementation((cond?: any) => {
        if (!cond) {
          expect(false).toBe(true);
        }
        expect(cond).toHaveProperty('participants');
        expect(JSON.stringify(cond.participants)).toContain(participantsUsedAsInput[0]);
        const query: any = {};
        query.lean = jest.fn().mockReturnValue(Promise.resolve(null));
        return query;
      });

      const result = await getChatsByParticipants(participantsUsedAsInput);
      expect(result).toHaveLength(0);
    });

    it('should return an empty array if a database error occurs', async () => {
      const participantsUsedAsInput = ['user1'];
      // mock the find method of ChatModel to return the mock chat data for participantsUsedAsInput
      jest.spyOn(ChatModel, 'find').mockImplementation((cond?: any) => {
        if (!cond) {
          expect(false).toBe(true);
        }
        expect(cond).toHaveProperty('participants');
        expect(JSON.stringify(cond.participants)).toContain(participantsUsedAsInput[0]);
        const query: any = {};
        query.lean = jest.fn().mockRejectedValueOnce(new Error('DB Error'));
        return query;
      });

      const result = await getChatsByParticipants(participantsUsedAsInput);
      expect(result).toHaveLength(0);
    });
  });

  describe('deleteDMForUser', () => {
    const mockChatId = new mongoose.Types.ObjectId().toString();

    it('should mark chat as deleted by user successfully', async () => {
      // mock the current date
      const deletedAt = new Date();
      const updatedChat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [],
        deletedBy: [{ username: 'user1', deletedAt }],
      };

      // check if the correct update object is used
      jest.spyOn(ChatModel, 'findByIdAndUpdate').mockResolvedValueOnce(updatedChat as any);

      const result = await deleteDMForUser(mockChatId, 'user1');

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.deletedBy).toHaveLength(1);
        expect(result.deletedBy[0].username).toBe('user1');
      }
    });

    it('should return error if chat not found', async () => {
      jest.spyOn(ChatModel, 'findByIdAndUpdate').mockResolvedValueOnce(null);

      const result = await deleteDMForUser(mockChatId, 'user1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Chat not found');
      }
    });

    it('should return error if deletion marking fails', async () => {
      jest.spyOn(ChatModel, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('Update failed'));

      const result = await deleteDMForUser(mockChatId, 'user1');

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error deleting DM for user');
      }
    });
  });

  describe('resetDeletionTracking', () => {
    const mockChatId = new mongoose.Types.ObjectId().toString();

    it('should reset deletion tracking successfully', async () => {
      const updatedChat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [],
        deletedBy: [],
      };

      jest.spyOn(ChatModel, 'findByIdAndUpdate').mockResolvedValueOnce(updatedChat as any);

      const result = await resetDeletionTracking(mockChatId);

      expect('error' in result).toBe(false);
      if (!('error' in result)) {
        expect(result.deletedBy).toHaveLength(0);
      }
    });

    it('should return error if chat not found', async () => {
      jest.spyOn(ChatModel, 'findByIdAndUpdate').mockResolvedValueOnce(null);

      const result = await resetDeletionTracking(mockChatId);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Chat not found');
      }
    });

    it('should return error if reset fails', async () => {
      // reset as in two users deleted the chat but then one user wants to restore it
      jest.spyOn(ChatModel, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('Update failed'));

      const result = await resetDeletionTracking(mockChatId);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error resetting deletion tracking');
      }
    });
  });

  describe('deleteDMCompletely', () => {
    // if two users mutually delete a chat, it should be removed from the database entirely
    const mockChatId = new mongoose.Types.ObjectId().toString();
    const mockMessageId1 = new mongoose.Types.ObjectId();
    const mockMessageId2 = new mongoose.Types.ObjectId();

    it('should delete chat and all messages successfully', async () => {
      const chatWithMessages = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [mockMessageId1, mockMessageId2],
        deletedBy: [],
      };

      jest.spyOn(ChatModel, 'findById').mockResolvedValueOnce(chatWithMessages as any);
      jest.spyOn(messageService, 'deleteMessagesByIds').mockResolvedValueOnce({ success: true });
      jest.spyOn(ChatModel, 'findByIdAndDelete').mockResolvedValueOnce(chatWithMessages as any);

      const result = await deleteDMCompletely(mockChatId);

      expect(result).toEqual({ success: true });
      expect(messageService.deleteMessagesByIds).toHaveBeenCalledWith([
        mockMessageId1.toString(),
        mockMessageId2.toString(),
      ]);
    });

    it('should handle chat with no messages', async () => {
      const chatWithoutMessages = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [],
        deletedBy: [],
      };

      jest.spyOn(ChatModel, 'findById').mockResolvedValueOnce(chatWithoutMessages as any);
      const deleteMessagesSpy = jest.spyOn(messageService, 'deleteMessagesByIds');
      jest.spyOn(ChatModel, 'findByIdAndDelete').mockResolvedValueOnce(chatWithoutMessages as any);

      const result = await deleteDMCompletely(mockChatId);

      expect(result).toEqual({ success: true });
      expect(deleteMessagesSpy).not.toHaveBeenCalled();
    });

    it('should return error if chat not found during fetch', async () => {
      // mock the chat not being found
      jest.spyOn(ChatModel, 'findById').mockResolvedValueOnce(null);

      const result = await deleteDMCompletely(mockChatId);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Chat not found');
      }
    });

    it('should return error if message deletion fails', async () => {
      const chatWithMessages = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [mockMessageId1],
        deletedBy: [],
      };

      jest.spyOn(ChatModel, 'findById').mockResolvedValueOnce(chatWithMessages as any);
      jest
        .spyOn(messageService, 'deleteMessagesByIds')
        .mockResolvedValueOnce({ error: 'Failed to delete messages' });

      const result = await deleteDMCompletely(mockChatId);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Failed to delete messages');
      }
    });

    it('should return error if chat deletion fails', async () => {
      const chatWithMessages = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [mockMessageId1],
        deletedBy: [],
      };

      jest.spyOn(ChatModel, 'findById').mockResolvedValueOnce(chatWithMessages as any);
      jest.spyOn(messageService, 'deleteMessagesByIds').mockResolvedValueOnce({ success: true });
      jest.spyOn(ChatModel, 'findByIdAndDelete').mockResolvedValueOnce(null);

      const result = await deleteDMCompletely(mockChatId);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Chat not found');
      }
    });

    it('should return error if exception occurs', async () => {
      jest.spyOn(ChatModel, 'findById').mockRejectedValueOnce(new Error('Database error'));

      const result = await deleteDMCompletely(mockChatId);

      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toContain('Error deleting DM completely');
      }
    });
  });

  describe('getDMsByUserWithoutDeleted', () => {
    // tests for retrieving chats not deleted by a specific user
    it('should retrieve chats not deleted by user', async () => {
      const mockChat = {
        _id: new mongoose.Types.ObjectId(),
        participants: ['user1', 'user2'],
        messages: [],
        deletedBy: [],
      };

      jest.spyOn(ChatModel, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockChat]),
      } as any);

      const result = await getDMsByUserWithoutDeleted('user1');

      expect(result).toHaveLength(1);
      expect(ChatModel.find).toHaveBeenCalledWith({
        'participants': 'user1',
        'deletedBy.username': { $ne: 'user1' },
      });
    });

    it('should return empty array if no chats found', async () => {
      // mock no chats found error
      jest.spyOn(ChatModel, 'find').mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await getDMsByUserWithoutDeleted('user1');

      expect(result).toEqual([]);
    });

    it('should return empty array if error occurs', async () => {
      // mock a database error
      jest.spyOn(ChatModel, 'find').mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Database error')),
      } as any);

      const result = await getDMsByUserWithoutDeleted('user1');

      expect(result).toEqual([]);
    });
  });

  describe('canReceiveDirectMessages', () => {
    // check if a user can receive DMs based on their dmEnabled setting
    it('should return true if user has dmEnabled set to true', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce({
        username: 'user1',
        dmEnabled: true,
      } as any);

      const result = await canReceiveDirectMessages('user1');

      expect(result).toBe(true);
    });

    it('should return true if dmEnabled is not set (default)', async () => {
      // dmEnabled defaults to true if not set
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce({
        username: 'user1',
      } as any);

      const result = await canReceiveDirectMessages('user1');

      expect(result).toBe(true);
    });

    it('should return false if user has dmEnabled set to false', async () => {
      // dmEnabled set to false
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce({
        username: 'user1',
        dmEnabled: false,
      } as any);

      const result = await canReceiveDirectMessages('user1');

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      // user not found
      jest.spyOn(UserModel, 'findOne').mockResolvedValueOnce(null);

      const result = await canReceiveDirectMessages('user1');

      expect(result).toBe(false);
    });

    it('should return false if error occurs', async () => {
      // database error occurs
      jest.spyOn(UserModel, 'findOne').mockRejectedValueOnce(new Error('Database error'));

      const result = await canReceiveDirectMessages('user1');

      expect(result).toBe(false);
    });
  });
});
