import express, { Response } from 'express';
import {
  saveChat,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  deleteDMForUser,
  deleteDMCompletely,
  getDMsByUserWithoutDeleted,
  resetDeletionTracking,
} from '../services/chat.service';
import { populateDocument } from '../utils/database.util';
import {
  FakeSOSocket,
  CreateChatRequest,
  AddMessageRequestToChat,
  AddParticipantRequest,
  ChatIdRequest,
  GetChatByParticipantsRequest,
  PopulatedDatabaseChat,
  DeleteDMRequest,
  CanDeleteDMRequest,
} from '../types/types';
import { saveMessage } from '../services/message.service';

/*
 * This controller handles chat-related routes.
 * @param socket The socket instance to emit events.
 * @returns {express.Router} The router object containing the chat routes.
 * @throws {Error} Throws an error if the chat creation fails.
 */
const chatController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Creates a new chat with the given participants (and optional initial messages).
   * @param req The request object containing the chat data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is created.
   * @throws {Error} Throws an error if the chat creation fails.
   */
  const createChatRoute = async (req: CreateChatRequest, res: Response): Promise<void> => {
    const { participants, messages } = req.body;
    const formattedMessages = messages.map(m => ({ ...m, type: 'direct' as 'direct' | 'global' }));

    try {
      const savedChat = await saveChat({ participants, messages: formattedMessages });

      if ('error' in savedChat) {
        throw new Error(savedChat.error);
      }

      // Enrich the newly created chat with message details
      const populatedChat = await populateDocument(savedChat._id.toString(), 'chat');

      if ('error' in populatedChat) {
        throw new Error(populatedChat.error);
      }

      socket.emit('chatUpdate', {
        chat: populatedChat as PopulatedDatabaseChat,
        type: 'created',
      });
      res.json(populatedChat);
      return undefined;
    } catch (err: unknown) {
      res.status(500).send(`Error creating a chat: ${(err as Error).message}`);
    }
  };

  /**
   * Adds a new message to an existing chat.
   * If another user sends a message to a chat that was deleted by other participants,
   * it resets their deletion tracking and the chat reappears in their DM list.
   * @param req The request object containing the message data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the message is added.
   * @throws {Error} Throws an error if the message addition fails.
   */
  const addMessageToChatRoute = async (
    req: AddMessageRequestToChat,
    res: Response,
  ): Promise<void> => {
    const { chatId } = req.params;
    const { msg, msgFrom, msgDateTime } = req.body;

    try {
      // Check if the chat exists
      const chat = await getChat(chatId);

      if ('error' in chat) {
        throw new Error(chat.error);
      }

      // Check if sender has deleted this chat themselves
      const senderDeleted = chat.deletedBy.find(d => d.username === msgFrom);

      if (senderDeleted) {
        // Sender deleted their copy, so create a completely new chat for both users
        // Get the other participant
        const otherParticipant = chat.participants.find(p => p !== msgFrom);

        if (!otherParticipant) {
          throw new Error('Unable to find other participant');
        }

        // Create a new fresh chat
        const newChat = await saveChat({
          participants: [msgFrom, otherParticipant],
          messages: [{ msg, msgFrom, msgDateTime, type: 'direct' }],
        });

        if ('error' in newChat) {
          throw new Error(newChat.error);
        }

        const populatedChat = await populateDocument(newChat._id.toString(), 'chat');

        if ('error' in populatedChat) {
          throw new Error(populatedChat.error);
        }

        // Emit new chat creation event
        socket.emit('chatUpdate', {
          chat: populatedChat as PopulatedDatabaseChat,
          type: 'created',
        });
        res.json(populatedChat);
        return;
      }

      // If sender hasn't deleted, but others have, remove their deletion record (re-engage them)
      // This resets deletion tracking so the chat reappears in their DM list
      if (chat.deletedBy.length > 0) {
        // Remove all deletion records since sender is re-engaging
        // This allows deleted users to see the chat again with all new messages
        const resetResult = await resetDeletionTracking(chatId);

        if ('error' in resetResult) {
          throw new Error(resetResult.error);
        }
      }

      // Create a new message in the DB
      const newMessage = await saveMessage({ msg, msgFrom, msgDateTime, type: 'direct' });

      if ('error' in newMessage) {
        throw new Error(newMessage.error);
      }

      // Associate the message with the chat
      const updatedChat = await addMessageToChat(chatId, newMessage._id.toString());

      if ('error' in updatedChat) {
        throw new Error(updatedChat.error);
      }

      // Fetch the updated chat with deletion records cleared
      const populatedChat2 = await populateDocument(updatedChat._id.toString(), 'chat');

      socket
        .to(chatId)
        .emit('chatUpdate', { chat: populatedChat2 as PopulatedDatabaseChat, type: 'newMessage' });
      res.json(populatedChat2);
    } catch (err: unknown) {
      res.status(500).send(`Error adding a message to chat: ${(err as Error).message}`);
    }
  };

  /**
   * Retrieves a chat by its ID, optionally populating participants and messages.
   * User cannot access a chat they have deleted (story 2.7).
   * @param req The request object containing the chat ID.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is retrieved.
   * @throws {Error} Throws an error if the chat retrieval fails.
   */
  const getChatRoute = async (req: ChatIdRequest, res: Response): Promise<void> => {
    const { chatId } = req.params;

    try {
      const foundChat = await getChat(chatId);

      if ('error' in foundChat) {
        throw new Error(foundChat.error);
      }

      const populatedChat = await populateDocument(foundChat._id.toString(), 'chat');

      if ('error' in populatedChat) {
        throw new Error(populatedChat.error);
      }

      res.json(populatedChat);
    } catch (err: unknown) {
      res.status(500).send(`Error retrieving chat: ${(err as Error).message}`);
    }
  };

  /**
   * Retrieves chats for a user based on their username.
   * Filters out chats that have been deleted by this user (story 2.7 - local deletion).
   * @param req The request object containing the username parameter in `req.params`.
   * @param res The response object to send the result, either the populated chats or an error message.
   * @returns {Promise<void>} A promise that resolves when the chats are successfully retrieved and populated.
   */
  const getChatsByUserRoute = async (
    req: GetChatByParticipantsRequest,
    res: Response,
  ): Promise<void> => {
    const { username } = req.params;

    try {
      // Use getDMsByUserWithoutDeleted to exclude chats deleted by this user
      const chats = await getDMsByUserWithoutDeleted(username);

      const populatedChats = await Promise.all(
        chats.map(chat => populateDocument(chat._id.toString(), 'chat')),
      );

      if (populatedChats.some(chat => 'error' in chat)) {
        throw new Error('Failed populating all retrieved chats');
      }

      res.json(populatedChats);
    } catch (err: unknown) {
      res.status(500).send(`Error retrieving chat: ${(err as Error).message}`);
    }
  };

  /**
   * Adds a participant to an existing chat.
   * @param req The request object containing the participant data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the participant is added.
   * @throws {Error} Throws an error if the participant addition fails.
   */
  const addParticipantToChatRoute = async (
    req: AddParticipantRequest,
    res: Response,
  ): Promise<void> => {
    const { chatId } = req.params;
    const { username: userId } = req.body;

    try {
      const updatedChat = await addParticipantToChat(chatId, userId);

      if ('error' in updatedChat) {
        throw new Error(updatedChat.error);
      }

      const populatedChat = await populateDocument(updatedChat._id.toString(), 'chat');

      if ('error' in populatedChat) {
        throw new Error(populatedChat.error);
      }

      socket.emit('chatUpdate', {
        chat: populatedChat as PopulatedDatabaseChat,
        type: 'newParticipant',
      });
      res.json(updatedChat);
    } catch (err: unknown) {
      res.status(500).send(`Error adding participant to chat: ${(err as Error).message}`);
    }
  };

  socket.on('connection', conn => {
    conn.on('joinChat', (chatID: string) => {
      conn.join(chatID);
    });

    conn.on('leaveChat', (chatID: string | undefined) => {
      if (chatID) {
        conn.leave(chatID);
      }
    });
  });

  /**
   * Deletes a DM for a specific user (marks as deleted by them).
   * If both participants have deleted, removes the chat completely from database (story 2.7).
   * @param req The request object containing the chatId in params and username in body.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the DM is deleted.
   */
  const deleteDMRoute = async (req: DeleteDMRequest, res: Response): Promise<void> => {
    const { chatId } = req.params;
    const { username } = req.body;

    try {
      // Check if the chat exists
      const chat = await getChat(chatId);

      if ('error' in chat) {
        throw new Error(chat.error);
      }

      // Mark this user as having deleted the chat
      const updatedChat = await deleteDMForUser(chatId, username);

      if ('error' in updatedChat) {
        throw new Error(updatedChat.error);
      }

      // Check if both participants have deleted
      if (updatedChat.deletedBy.length === updatedChat.participants.length) {
        const deleteResult = await deleteDMCompletely(chatId);

        if ('error' in deleteResult) {
          throw new Error(deleteResult.error);
        }

        socket.emit('dmDeleted', {
          chatId,
          deletedCompletely: true,
        });
      } else {
        // Extract just the usernames for the response
        const deletedByUsernames = updatedChat.deletedBy.map(d => d.username);

        socket.emit('dmDeleted', {
          chatId,
          deletedCompletely: false,
          deletedBy: deletedByUsernames,
        });
      }

      // Return only usernames in the response, not the full deletion records
      const deletedByUsernames = updatedChat.deletedBy.map(d => d.username);
      res.json({ success: true, deletedBy: deletedByUsernames });
    } catch (err: unknown) {
      res.status(500).send(`Error deleting DM: ${(err as Error).message}`);
    }
  };

  /**
   * Checks if a DM can be completely deleted (both users have deleted).
   * @param req The request object containing the chatId.
   * @param res The response object with the deletion status.
   * @returns {Promise<void>} A promise that resolves when the check is complete.
   */
  const canDeleteDMRoute = async (req: CanDeleteDMRequest, res: Response): Promise<void> => {
    const { chatId } = req.params;

    try {
      const chat = await getChat(chatId);

      if ('error' in chat) {
        throw new Error(chat.error);
      }

      const canDelete = chat.deletedBy.length === chat.participants.length;
      const deletedByUsernames = chat.deletedBy.map(d => d.username);

      res.json({ canDelete, deletedBy: deletedByUsernames, participants: chat.participants });
    } catch (err: unknown) {
      res.status(500).send(`Error checking DM deletion status: ${(err as Error).message}`);
    }
  };

  // Register the routes
  router.post('/createChat', createChatRoute);
  router.post('/:chatId/addMessage', addMessageToChatRoute);
  router.get('/:chatId', getChatRoute);
  router.post('/:chatId/addParticipant', addParticipantToChatRoute);
  router.get('/getChatsByUser/:username', getChatsByUserRoute);
  router.delete('/:chatId', deleteDMRoute);
  router.get('/:chatId/canDelete', canDeleteDMRoute);

  return router;
};

export default chatController;
