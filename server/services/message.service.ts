import MessageModel from '../models/messages.model';
import UserModel from '../models/users.model';
import { DatabaseMessage, DatabaseUser, Message, MessageResponse } from '../types/types';

/**
 * Saves a new message to the database.
 * @param {Message} message - The message to save
 * @returns {Promise<MessageResponse>} - The saved message or an error message
 */
export const saveMessage = async (message: Message): Promise<MessageResponse> => {
  try {
    const user: DatabaseUser | null = await UserModel.findOne({ username: message.msgFrom });

    if (!user) {
      throw new Error('Message sender is invalid or does not exist.');
    }

    const result: DatabaseMessage = await MessageModel.create(message);
    return result;
  } catch (error) {
    return { error: `Error when saving a message: ${(error as Error).message}` };
  }
};

/**
 * Retrieves all global messages from the database, sorted by date in ascending order.
 * @returns {Promise<DatabaseMessage[]>} - An array of messages or an empty array if error occurs.
 */
export const getMessages = async (): Promise<DatabaseMessage[]> => {
  try {
    const messages: DatabaseMessage[] = await MessageModel.find({ type: 'global' });
    messages.sort((a, b) => a.msgDateTime.getTime() - b.msgDateTime.getTime());

    return messages;
  } catch (error) {
    return [];
  }
};

/**
 * Deletes multiple messages by their IDs from the database.
 * Used when deleting a chat conversation.
 * @param {string[]} messageIds - Array of message IDs to delete
 * @returns {Promise<{ success: boolean } | { error: string }>} - Success or error message
 */
export const deleteMessagesByIds = async (
  messageIds: string[],
): Promise<{ success: boolean } | { error: string }> => {
  try {
    if (messageIds.length === 0) {
      return { success: true };
    }

    const result = await MessageModel.deleteMany({ _id: { $in: messageIds } });

    if (!result) {
      throw new Error('Failed to delete messages');
    }

    return { success: true };
  } catch (error) {
    return { error: `Error deleting messages: ${(error as Error).message}` };
  }
};
