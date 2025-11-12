import { ObjectId } from 'mongodb';
import ChatModel from '../models/chat.model';
import UserModel from '../models/users.model';
import { Chat, ChatResponse, DatabaseChat, MessageResponse, DatabaseUser } from '../types/types';
import { saveMessage, deleteMessagesByIds } from './message.service';

/**
 * Saves a new chat, storing any messages provided as part of the argument.
 * @param chatPayload - The chat object containing full message data.
 * @returns {Promise<ChatResponse>} - The saved chat or an error message.
 */
export const saveChat = async (chatPayload: Chat): Promise<ChatResponse> => {
  try {
    // Save the messages provided in the arugment to the database
    const messageIds: ObjectId[] = await Promise.all(
      chatPayload.messages.map(async msg => {
        const savedMessage: MessageResponse = await saveMessage(msg);

        if ('error' in savedMessage) {
          throw new Error(savedMessage.error);
        }

        return savedMessage._id;
      }),
    );

    // Create the chat using participant IDs and saved message IDs
    return await ChatModel.create({
      participants: chatPayload.participants,
      messages: messageIds,
    });
  } catch (error) {
    return { error: `Error saving chat: ${error}` };
  }
};

/**
 * Adds a message ID to a chat.
 * @param chatId - The ID of the chat to update.
 * @param messageId - The ID of the message to add.
 * @returns {Promise<ChatResponse>} - The updated chat or an error message.
 */
export const addMessageToChat = async (
  chatId: string,
  messageId: string,
): Promise<ChatResponse> => {
  try {
    const updatedChat: DatabaseChat | null = await ChatModel.findByIdAndUpdate(
      chatId,
      { $push: { messages: messageId } },
      { new: true },
    );

    if (!updatedChat) {
      throw new Error('Chat not found');
    }

    return updatedChat;
  } catch (error) {
    return { error: `Error adding message to chat: ${error}` };
  }
};

/**
 * Retrieves a chat document by its ID.
 * @param chatId - The ID of the chat to retrieve.
 * @returns {Promise<ChatResponse>} - The chat or an error message.
 */
export const getChat = async (chatId: string): Promise<ChatResponse> => {
  try {
    const chat: DatabaseChat | null = await ChatModel.findById(chatId);

    if (!chat) {
      throw new Error('Chat not found');
    }

    return chat;
  } catch (error) {
    return { error: `Error retrieving chat: ${error}` };
  }
};

/**
 * Retrieves chats that include all the provided participants.
 * @param p - An array of participant usernames or IDs.
 * @returns {Promise<DatabaseChat[]>} - An array of matching chats or an empty array.
 */
export const getChatsByParticipants = async (p: string[]): Promise<DatabaseChat[]> => {
  try {
    const chats = await ChatModel.find({ participants: { $all: p } }).lean();

    if (!chats) {
      throw new Error('Chat not found with the provided participants');
    }

    return chats;
  } catch {
    return [];
  }
};

/**
 * Adds a participant to an existing chat.
 * @param chatId - The ID of the chat to update.
 * @param userId - The user ID to add to the chat.
 * @returns {Promise<ChatResponse>} - The updated chat or an error message.
 */
export const addParticipantToChat = async (
  chatId: string,
  userId: string,
): Promise<ChatResponse> => {
  try {
    // Validate if user exists
    const userExists: DatabaseUser | null = await UserModel.findById(userId);

    if (!userExists) {
      throw new Error('User does not exist.');
    }

    // Add participant if not already in the chat
    const updatedChat: DatabaseChat | null = await ChatModel.findOneAndUpdate(
      { _id: chatId, participants: { $ne: userId } },
      { $push: { participants: userId } },
      { new: true }, // Return the updated document
    );

    if (!updatedChat) {
      throw new Error('Chat not found or user already a participant.');
    }

    return updatedChat;
  } catch (error) {
    return { error: `Error adding participant to chat: ${(error as Error).message}` };
  }
};

/**
 * Marks a chat as deleted by a specific user (for story 2.7 - local deletion).
 * Records the deletion timestamp so old messages can be hidden from re-engaged user.
 * @param chatId - The ID of the chat to mark as deleted for the user.
 * @param username - The username of the user deleting the chat.
 * @returns {Promise<ChatResponse>} - The updated chat or an error message.
 */
export const deleteDMForUser = async (chatId: string, username: string): Promise<ChatResponse> => {
  try {
    const updatedChat: DatabaseChat | null = await ChatModel.findByIdAndUpdate(
      chatId,
      {
        $addToSet: {
          deletedBy: {
            username,
            deletedAt: new Date(),
          },
        },
      }, // Add deletion record with timestamp
      { new: true },
    );

    if (!updatedChat) {
      throw new Error('Chat not found');
    }

    return updatedChat;
  } catch (error) {
    return { error: `Error deleting DM for user: ${(error as Error).message}` };
  }
};

/**
 * Resets deletion tracking for a chat by clearing all deletion records.
 * This allows deleted users to see the chat again when another user sends a message.
 * Called when a user sends a message to a chat that others have deleted.
 * @param chatId - The ID of the chat to reset deletion tracking for.
 * @returns {Promise<ChatResponse>} - The updated chat or an error message.
 */
export const resetDeletionTracking = async (chatId: string): Promise<ChatResponse> => {
  try {
    const updatedChat: DatabaseChat | null = await ChatModel.findByIdAndUpdate(
      chatId,
      { $set: { deletedBy: [] } },
      { new: true },
    );

    if (!updatedChat) {
      throw new Error('Chat not found');
    }

    return updatedChat;
  } catch (error) {
    return { error: `Error resetting deletion tracking: ${(error as Error).message}` };
  }
};

/**
 * Completely removes a chat from the database (story 2.7 - when both users delete).
 * Also deletes all messages associated with the chat.
 * @param chatId - The ID of the chat to delete completely.
 * @returns {Promise<{ success: boolean } | { error: string }>} - Success or error message.
 */
export const deleteDMCompletely = async (
  chatId: string,
): Promise<{ success: boolean } | { error: string }> => {
  try {
    // First, fetch the chat to get its message IDs
    const chat = await ChatModel.findById(chatId);

    if (!chat) {
      throw new Error('Chat not found');
    }

    // Convert message ObjectIds to strings for deletion
    const messageIds = chat.messages.map(id => id.toString());

    // Delete all messages associated with this chat
    if (messageIds.length > 0) {
      const deleteMessagesResult = await deleteMessagesByIds(messageIds);

      if ('error' in deleteMessagesResult) {
        throw new Error(deleteMessagesResult.error);
      }
    }

    // Delete the chat document itself
    const result = await ChatModel.findByIdAndDelete(chatId);

    if (!result) {
      throw new Error('Chat not found');
    }

    return { success: true };
  } catch (error) {
    return { error: `Error deleting DM completely: ${(error as Error).message}` };
  }
};

/**
 * Retrieves all DMs for a user, excluding chats that have been deleted by that user.
 * Uses the deletedBy array to find deletion records for this user.
 * @param username - The username to fetch DMs for.
 * @returns {Promise<DatabaseChat[]>} - An array of active chats for the user.
 */
export const getDMsByUserWithoutDeleted = async (username: string): Promise<DatabaseChat[]> => {
  try {
    const chats = await ChatModel.find({
      'participants': username,
      'deletedBy.username': { $ne: username }, // Exclude chats where this user has a deletion record
    }).lean();

    return chats || [];
  } catch (error) {
    return [];
  }
};

/**
 * Checks if a user can receive direct messages based on their dmEnabled setting.
 * @param username - The username to check.
 * @returns {Promise<boolean>} - True if the user accepts DMs, false otherwise.
 */
export const canReceiveDirectMessages = async (username: string): Promise<boolean> => {
  try {
    const user: DatabaseUser | null = await UserModel.findOne({ username });

    if (!user) {
      return false;
    }

    return user.dmEnabled !== false; // Default to true if not set
  } catch (error) {
    return false;
  }
};
