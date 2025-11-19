import { PopulatedDatabaseAnswer } from './answer';
import { PopulatedDatabaseChat } from './chat';
import { DatabaseMessage } from './message';
import { PopulatedDatabaseQuestion } from './question';
import { SafeDatabaseUser } from './user';
import { BaseMove, GameInstance, GameInstanceID, GameMove, GameState } from './game';
import { DatabaseCommunity } from './community';
import { PopulatedDatabaseCollection } from './collection';
import { DatabaseJobFair } from './jobFair';
import { DatabaseJobPosting } from './jobPosting';

/**
 * Payload for an answer update event.
 * - `qid`: The unique identifier of the question.
 * - `answer`: The updated answer.
 */
export interface AnswerUpdatePayload {
  qid: ObjectId;
  answer: PopulatedDatabaseAnswer;
}

/**
 * Payload for a game state update event.
 * - `gameInstance`: The updated instance of the game.
 */
export interface GameUpdatePayload {
  gameInstance: GameInstance<GameState>;
}

/**
 * Payload for a game operation error event.
 * - `player`: The player ID who caused the error.
 * - `error`: The error message.
 */
export interface GameErrorPayload {
  player: string;
  error: string;
}

/**
 * Payload for a vote update event.
 * - `qid`: The unique identifier of the question.
 * - `upVotes`: An array of usernames who upvoted the question.
 * - `downVotes`: An array of usernames who downvoted the question.
 */
export interface VoteUpdatePayload {
  qid: string;
  upVotes: string[];
  downVotes: string[];
}

/**
 * Payload for a chat update event.
 * - `chat`: The updated chat object.
 * - `type`: The type of update (`'created'`, `'newMessage'`, or `'newParticipant'`).
 */
export interface ChatUpdatePayload {
  chat: PopulatedDatabaseChat;
  type: 'created' | 'newMessage' | 'newParticipant';
}

/**
 * Payload for a comment update event.
 * - `result`: The updated question or answer.
 * - `type`: The type of the updated item (`'question'` or `'answer'`).
 */
export interface CommentUpdatePayload {
  result: PopulatedDatabaseQuestion | PopulatedDatabaseAnswer;
  type: 'question' | 'answer';
}

/**
 * Payload for a message update event.
 * - `msg`: The updated message.
 */
export interface MessageUpdatePayload {
  msg: DatabaseMessage;
}

/**
 * Payload for a user update event.
 * - `user`: The updated user object.
 * - `type`: The type of modification (`'created'`, `'deleted'`, or `'updated'`).
 */
export interface UserUpdatePayload {
  user: SafeDatabaseUser;
  type: 'created' | 'deleted' | 'updated';
}

/**
 * Interface representing the payload for a game move operation, which contains:
 * - `gameID`: The ID of the game being played.
 * - `move`: The move being made in the game, defined by `GameMove`.
 */
export interface GameMovePayload {
  gameID: GameInstanceID;
  move: GameMove<BaseMove>;
}

/**
 * Interface representing the payload for a community update event.
 * - `type`: The type of update (`'created'`, `'updated'`, or `'deleted'`).
 * - `community`: The updated community object.
 */
export interface CommunityUpdatePayload {
  type: 'created' | 'updated' | 'deleted';
  community: DatabaseCommunity;
}

/**
 * Interface representing the payload for a collection update event.
 * - `type`: The type of update (`'created'`, `'updated'`, or `'deleted'`).
 * - `collection`: The updated collection object.
 */
export interface CollectionUpdatePayload {
  type: 'created' | 'updated' | 'deleted';
  collection: PopulatedDatabaseCollection;
}

/**
 * Interface representing the payload for a job fair update event.
 * - `type`: The type of update.
 * - `jobFair`: The updated job fair object.
 */
export interface JobFairUpdatePayload {
  type:
    | 'created'
    | 'updated'
    | 'deleted'
    | 'statusChanged'
    | 'participantJoined'
    | 'participantLeft';
  jobFair: DatabaseJobFair;
}

/**
 * Interface representing the payload for a job fair chat message event.
 * - `jobFairId`: The ID of the job fair.
 * - `message`: The chat message data.
 */
export interface JobFairChatMessagePayload {
  jobFairId: string;
  message: {
    msg: string;
    msgFrom: string;
    msgDateTime: Date;
  };
}

/**
 * Payload for a coding tournament submission event.
 * - `jobFairId`: The ID of the job fair.
 * - `submission`: The submission data including code and language.
 */
export interface CodingSubmissionPayload {
  jobFairId: string;
  submission: {
    code: string;
    language: string;
    submittedAt: Date;
    submittedBy: string;
  };
}
/**
 * Interface representing the payload for a job application update event.
 * - `jobId`: The ID of the job posting.
 * - `type`: The type of update (`'applicationCreated'` or `'applicationDeleted'`).
 */
export interface JobApplicationUpdatePayload {
  jobId: string;
  type: 'applicationCreated' | 'applicationDeleted';
}

/**
 * Interface representing the payload for a job posting update event.
 * Can be either a full job posting object or a deletion notification.
 */
export type JobPostingUpdatePayload = DatabaseJobPosting | { type: 'deleted'; jobId: string };

/**
 * Interface representing the payload for a DM deletion events.
 * - `chatId`: The ID of the deleted DM.
 * - `deletedCompletely`: Whether the DM was completely removed (both users deleted) or just for one user.
 * - `deletedBy`: Array of usernames who have deleted the chat (optional, for partial deletion).
 */
export interface DMDeletedPayload {
  chatId: string;
  deletedCompletely: boolean;
  deletedBy?: string[];
}

/**
 * Interface representing the events the client can emit to the server.
 * - `makeMove`: Client can emit a move in the game.
 * - `joinGame`: Client can join a game.
 * - `leaveGame`: Client can leave a game.
 * - `joinChat`: Client can join a chat.
 * - `leaveChat`: Client can leave a chat.
 */
export interface ClientToServerEvents {
  makeMove: (move: GameMovePayload) => void;
  joinGame: (gameID: string) => void;
  leaveGame: (gameID: string) => void;
  joinChat: (chatID: string) => void;
  leaveChat: (chatID: string | undefined) => void;
  joinJobFair: (jobFairId: string) => void;
  leaveJobFair: (jobFairId: string) => void;
}

/**
 * Interface representing the events the server can emit to the client.
 * - `questionUpdate`: Server sends updated question.
 * - `answerUpdate`: Server sends updated answer.
 * - `viewsUpdate`: Server sends updated views count for a question.
 * - `voteUpdate`: Server sends updated votes for a question.
 * - `commentUpdate`: Server sends updated comment for a question or answer.
 * - `messageUpdate`: Server sends updated message.
 * - `userUpdate`: Server sends updated user status.
 * - `gameUpdate`: Server sends updated game state.
 * - `gameError`: Server sends error message related to game operation.
 * - `chatUpdate`: Server sends updated chat.
 * - `dmDeleted`: Server sends DM deletion request.
 * - `communityUpdate`: Server sends updated community.
 * - `collectionUpdate`: Server sends updated collection.
 * - `jobFairUpdate`: Server sends updated job fair.
 * - `jobFairChatMessage`: Server sends new message in job fair chat.
 * - `jobPostingUpdate`: Server sends updated job posting.
 * - `jobApplicationUpdate`: Server sends job application update.
 */
export interface ServerToClientEvents {
  questionUpdate: (question: PopulatedDatabaseQuestion) => void;
  answerUpdate: (result: AnswerUpdatePayload) => void;
  viewsUpdate: (question: PopulatedDatabaseQuestion) => void;
  voteUpdate: (vote: VoteUpdatePayload) => void;
  commentUpdate: (comment: CommentUpdatePayload) => void;
  messageUpdate: (message: MessageUpdatePayload) => void;
  userUpdate: (user: UserUpdatePayload) => void;
  gameUpdate: (game: GameUpdatePayload) => void;
  gameError: (error: GameErrorPayload) => void;
  chatUpdate: (chat: ChatUpdatePayload) => void;
  dmDeleted: (payload: DMDeletedPayload) => void;
  communityUpdate: (community: CommunityUpdatePayload) => void;
  collectionUpdate: (community: CollectionUpdatePayload) => void;
  jobFairUpdate: (jobFair: JobFairUpdatePayload) => void;
  jobFairChatMessage: (message: JobFairChatMessagePayload) => void;
  codingSubmission: (payload: CodingSubmissionPayload) => void;
  jobPostingUpdate: (jobPosting: JobPostingUpdatePayload) => void;
  jobApplicationUpdate: (update: JobApplicationUpdatePayload) => void;
  metricsUpdate: (update: UserMetricsUpdatePayload) => void;
}
