import { DatabaseJobFair } from '@fake-stack-overflow/shared';
import api from './config';

const JOB_FAIR_API_URL = '/api/jobfair';

/**
 * Fetches all job fairs with optional filtering by status and visibility.
 * @param status Optional: 'upcoming', 'live', or 'ended'
 * @param visibility Optional: 'public' or 'invite-only'
 * @returns Array of DatabaseJobFair objects
 */
const getJobFairs = async (
  status?: 'upcoming' | 'live' | 'ended',
  visibility?: 'public' | 'invite-only',
): Promise<DatabaseJobFair[]> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (visibility) params.append('visibility', visibility);

  const res = await api.get(`${JOB_FAIR_API_URL}/list?${params.toString()}`);

  if (res.status !== 200) {
    throw new Error('Error fetching job fairs.');
  }

  return res.data;
};

/**
 * Fetches a specific job fair by ID.
 * @param jobFairId The ID of the job fair to fetch
 * @returns The DatabaseJobFair object
 */
const getJobFairById = async (jobFairId: string): Promise<DatabaseJobFair> => {
  const res = await api.get(`${JOB_FAIR_API_URL}/${jobFairId}`);

  if (res.status !== 200) {
    throw new Error('Error fetching job fair.');
  }

  return res.data;
};

/**
 * Creates a new job fair.
 * @param jobFairData Object containing title, description, visibility, startTime, endTime, hostUsername, invitedUsers
 * @returns The created DatabaseJobFair object
 */
const createJobFair = async (jobFairData: {
  title: string;
  description: string;
  visibility: 'public' | 'invite-only';
  startTime: Date | string;
  endTime: Date | string;
  hostUsername: string;
  invitedUsers?: string[];
}): Promise<DatabaseJobFair> => {
  const res = await api.post(`${JOB_FAIR_API_URL}/create`, jobFairData);

  if (res.status !== 201) {
    throw new Error('Error creating job fair.');
  }

  return res.data;
};

/**
 * Updates the status of a job fair.
 * @param jobFairId The ID of the job fair
 * @param status The new status ('upcoming', 'live', or 'ended')
 * @param hostUsername The username of the host updating the status
 * @returns The updated DatabaseJobFair object
 */
const updateJobFairStatus = async (
  jobFairId: string,
  status: 'upcoming' | 'live' | 'ended',
  hostUsername: string,
): Promise<DatabaseJobFair> => {
  const res = await api.patch(`${JOB_FAIR_API_URL}/${jobFairId}/status`, { status, hostUsername });

  if (res.status !== 200) {
    throw new Error('Error updating job fair status.');
  }

  return res.data;
};

/**
 * Joins a job fair as a participant.
 * @param jobFairId The ID of the job fair to join
 * @returns The updated DatabaseJobFair object
 */
const joinJobFair = async (jobFairId: string, username: string): Promise<DatabaseJobFair> => {
  const res = await api.post(`${JOB_FAIR_API_URL}/${jobFairId}/join`, {
    username,
  });

  if (res.status !== 200) {
    throw new Error('Error joining job fair.');
  }

  return res.data;
};

/**
 * Leaves a job fair as a participant.
 * @param jobFairId The ID of the job fair to leave
 * @returns The updated DatabaseJobFair object
 */
const leaveJobFair = async (jobFairId: string, username: string): Promise<DatabaseJobFair> => {
  const res = await api.post(`${JOB_FAIR_API_URL}/${jobFairId}/leave`, {
    username,
  });

  if (res.status !== 200) {
    throw new Error('Error leaving job fair.');
  }

  return res.data;
};

/**
 * Adds a message to the job fair chat.
 * @param jobFairId The ID of the job fair
 * @param msg The message text
 * @param msgFrom The username of the message sender
 * @param msgDateTime The timestamp of the message
 * @returns The updated DatabaseJobFair object
 */
const addJobFairMessage = async (
  jobFairId: string,
  msg: string,
  msgFrom: string,
  msgDateTime: Date | string,
): Promise<DatabaseJobFair> => {
  const res = await api.post(`${JOB_FAIR_API_URL}/${jobFairId}/message`, {
    msg,
    msgFrom,
    msgDateTime,
  });

  if (res.status !== 200) {
    throw new Error('Error adding message to job fair.');
  }

  return res.data;
};

/**
 * Submits a coding solution to the job fair tournament.
 * @param jobFairId The ID of the job fair
 * @param submission The coding submission data
 * @param submittedBy The username of the person submitting
 * @returns The updated DatabaseJobFair object
 */
const submitCodingChallenge = async (
  jobFairId: string,
  submission: {
    code: string;
    language: string;
    submittedAt: Date | string;
  },
  submittedBy: string,
): Promise<DatabaseJobFair> => {
  const res = await api.post(`${JOB_FAIR_API_URL}/${jobFairId}/submission`, {
    ...submission,
    submittedBy,
  });

  if (res.status !== 200) {
    throw new Error('Error submitting coding challenge.');
  }

  return res.data;
};

/**
 * Updates a job fair (only by host).
 * @param jobFairId The ID of the job fair to update
 * @param updateData The data to update
 * @param hostUsername The username of the host updating the job fair
 * @returns The updated DatabaseJobFair object
 */
const updateJobFair = async (
  jobFairId: string,
  updateData: {
    title?: string;
    description?: string;
    startTime?: Date | string;
    endTime?: Date | string;
    visibility?: 'public' | 'invite-only';
    codingTournamentEnabled?: boolean;
    overviewMessage?: string;
    invitedUsers?: string[];
  },
  hostUsername: string,
): Promise<DatabaseJobFair> => {
  const res = await api.put(`${JOB_FAIR_API_URL}/${jobFairId}`, {
    ...updateData,
    hostUsername,
  });

  if (res.status !== 200) {
    throw new Error('Error updating job fair.');
  }

  return res.data;
};

/**
 * Deletes a job fair (only by host).
 * @param jobFairId The ID of the job fair to delete
 * @param hostUsername The username of the host deleting the job fair
 * @returns The deleted DatabaseJobFair object
 */
const deleteJobFair = async (
  jobFairId: string,
  hostUsername: string,
): Promise<DatabaseJobFair> => {
  const res = await api.delete(`${JOB_FAIR_API_URL}/${jobFairId}`, {
    data: { hostUsername },
  });

  if (res.status !== 200) {
    throw new Error('Error deleting job fair.');
  }

  return res.data;
};

export default {
  getJobFairs,
  getJobFairById,
  createJobFair,
  updateJobFairStatus,
  updateJobFair,
  joinJobFair,
  leaveJobFair,
  addJobFairMessage,
  submitCodingChallenge,
  deleteJobFair,
};
