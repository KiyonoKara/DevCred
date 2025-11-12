import { ObjectId } from 'mongodb';
import { Message, PopulatedDatabaseChat } from '../types/types';
import api from './config';

const CHAT_API_URL = `/api/chat`;

/**
 * Fetches all chats associated with a given user.
 *
 * @param username - The username of the user whose chats are to be fetched.
 * @returns The list of chats for the specified user.
 * @throws Throws an error if the fetch fails or if the status code is not 200.
 */
export const getChatsByUser = async (username: string): Promise<PopulatedDatabaseChat[]> => {
  const res = await api.get(`${CHAT_API_URL}/getChatsByUser/${username}`);

  if (res.status !== 200) {
    throw new Error('Error when fetching chats for user');
  }

  return res.data;
};

/**
 * Fetches a chat by its unique ID.
 *
 * @param chatID - The ID of the chat to fetch.
 * @returns The details of the chat with the specified ID.
 * @throws Throws an error if the fetch fails or if the status code is not 200.
 */
export const getChatById = async (chatID: ObjectId): Promise<PopulatedDatabaseChat> => {
  const res = await api.get(`${CHAT_API_URL}/${chatID}`);

  if (res.status !== 200) {
    throw new Error('Error when fetching chat by ID');
  }

  return res.data;
};

/**
 * Sends a message to a specific chat.
 *
 * @param message - The message to be sent, excluding the 'type' property.
 * @param chatID - The ID of the chat to which the message will be added.
 * @returns The updated chat data after the message has been sent.
 * @throws Throws an error if the message could not be added to the chat.
 */
export const sendMessage = async (
  message: Omit<Message, 'type'>,
  chatID: ObjectId,
): Promise<PopulatedDatabaseChat> => {
  const res = await api.post(`${CHAT_API_URL}/${chatID}/addMessage`, message);

  if (res.status !== 200) {
    throw new Error('Error when adding message to chat');
  }

  return res.data;
};

/**
 * Creates a new chat with the specified participants.
 *
 * @param participants - An array of user IDs representing the participants of the chat.
 * @returns The newly created chat data.
 * @throws Throws an error if the chat creation fails or if the status code is not 200.
 */
export const createChat = async (participants: string[]): Promise<PopulatedDatabaseChat> => {
  const res = await api.post(`${CHAT_API_URL}/createChat`, { participants, messages: [] });

  if (res.status !== 200) {
    throw new Error('Error when adding message to chat');
  }

  return res.data;
};

/**
 * Deletes a DM for a specific user (marks as deleted by them for story 2.7).
 * If both participants have deleted, removes the chat completely.
 *
 * @param chatID - The ID of the chat to delete for the user.
 * @param username - The username of the user deleting the chat.
 * @returns Success status and updated deletedBy array.
 * @throws Throws an error if the deletion fails.
 */
export const deleteDMForUser = async (
  chatID: ObjectId,
  username: string,
): Promise<{ success: boolean; deletedBy: string[] }> => {
  const res = await api.delete(`${CHAT_API_URL}/${chatID}`, {
    data: { username },
  });

  if (res.status !== 200) {
    throw new Error('Error when deleting DM');
  }

  return res.data;
};

/**
 * Checks if a DM can be completely deleted (both users have deleted).
 *
 * @param chatID - The ID of the chat to check.
 * @returns Object with canDelete flag and deletion status.
 * @throws Throws an error if the check fails.
 */
export const canDeleteDMCompletely = async (
  chatID: ObjectId,
): Promise<{ canDelete: boolean; deletedBy: string[]; participants: string[] }> => {
  const res = await api.get(`${CHAT_API_URL}/${chatID}/canDelete`);

  if (res.status !== 200) {
    throw new Error('Error checking DM deletion status');
  }

  return res.data;
};
