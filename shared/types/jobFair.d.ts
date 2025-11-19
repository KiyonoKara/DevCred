import { Request } from 'express';
import { ObjectId } from 'mongodb';

/**
 * Represents a document/file shared during a job fair.
 */
export interface JobFairDocument {
  filename: string;
  originalName: string;
  path: string;
  uploadedBy: string;
  uploadedAt: Date;
}

/**
 * Represents a job fair event.
 */
export interface JobFair {
  title: string;
  description: string;
  hostUsername: string;
  visibility: 'public' | 'invite-only';
  status: 'upcoming' | 'live' | 'ended';
  startTime: Date;
  endTime: Date;
  codingTournamentEnabled: boolean;
  overviewMessage?: string;
  participants: string[];
  invitedUsers: string[];
  chatMessages: ObjectId[];
  codingSubmissions: ObjectId[];
  documents: JobFairDocument[];
}

/**
 * Represents a job fair stored in the database.
 */
export interface DatabaseJobFair extends JobFair {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request for creating a job fair.
 */
export interface CreateJobFairRequest extends Request {
  body: {
    title: string;
    description: string;
    visibility: 'public' | 'invite-only';
    startTime: Date;
    endTime: Date;
    hostUsername: string;
    codingTournamentEnabled?: boolean;
    overviewMessage?: string;
    invitedUsers?: string[];
  };
}

/**
 * Request for job fair operations by ID.
 */
export interface JobFairIdRequest extends Request {
  params: {
    jobFairId: string;
  };
}

/**
 * Request for joining a job fair.
 */
export interface JoinJobFairRequest extends JobFairIdRequest {
  body: {
    username: string;
  };
}

/**
 * Request for adding a message to job fair chat.
 */
export interface AddJobFairMessageRequest extends JobFairIdRequest {
  body: {
    msg: string;
    msgFrom: string;
    msgDateTime: Date;
  };
}

/**
 * A type representing the possible responses for a JobFair interaction.
 */
export type JobFairResponse = DatabaseJobFair | { error: string };
