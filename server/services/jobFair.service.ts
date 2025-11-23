import JobFairModel from '../models/jobFair.model';
import UserModel from '../models/users.model';
import { DatabaseJobFair, JobFair, JobFairResponse, Message } from '../types/types';
import { saveMessage } from './message.service';
import { incrementUserPoint } from './user.service';

/**
 * Creates a new job fair.
 * @param jobFairData - The job fair data to create.
 * @returns {Promise<JobFairResponse>} - The created job fair.
 */
export const createJobFair = async (jobFairData: JobFair): Promise<JobFairResponse> => {
  try {
    const newJobFair = await JobFairModel.create(jobFairData);
    return newJobFair;
  } catch (error) {
    return { error: `Error creating job fair: ${error}` };
  }
};

/**
 * Retrieves all job fairs with optional filtering.
 * @param status - Optional status filter ('upcoming', 'live', 'ended').
 * @param visibility - Optional visibility filter ('public', 'invite-only').
 * @param username - Optional username to filter job fairs for a user.
 * @returns {Promise<DatabaseJobFair[] | { error: string }>} - List of job fairs.
 */
export const getJobFairs = async (
  status?: 'upcoming' | 'live' | 'ended',
  visibility?: 'public' | 'invite-only',
  username?: string,
): Promise<DatabaseJobFair[] | { error: string }> => {
  try {
    const filter: Record<string, string> = {};

    if (status) {
      filter.status = status;
    }

    if (visibility) {
      filter.visibility = visibility;
    }

    let jobFairs = await JobFairModel.find(filter);

    // If username is provided, filter job fairs based on access permissions
    if (username) {
      jobFairs = jobFairs.filter(jobFair => {
        // User can access if it's public, invite-only and they're invited, or already a participant
        return (
          jobFair.visibility === 'public' ||
          jobFair.hostUsername === username ||
          jobFair.invitedUsers.includes(username) ||
          jobFair.participants.includes(username)
        );
      });
    } else {
      // If there is no username then only show public job fairs
      jobFairs = jobFairs.filter(jobFair => jobFair.visibility === 'public');
    }

    return jobFairs;
  } catch (error) {
    return { error: `Error retrieving job fairs: ${error}` };
  }
};

/**
 * Gets a job fair by its ID.
 * @param jobFairId - The ID of the job fair to retrieve.
 * @param username - Optional username to check access permissions.
 * @returns {Promise<JobFairResponse>} - The job fair data.
 */
export const getJobFairById = async (
  jobFairId: string,
  username?: string,
): Promise<JobFairResponse> => {
  try {
    // Populate chat messages so clients can render history
    const jobFair = await JobFairModel.findById(jobFairId).populate('chatMessages');

    if (!jobFair) {
      return { error: 'Job fair not found' };
    }

    // Check access permissions if username is provided
    if (username) {
      const hasAccess =
        jobFair.visibility === 'public' ||
        jobFair.hostUsername === username ||
        jobFair.invitedUsers.includes(username) ||
        jobFair.participants.includes(username);

      if (!hasAccess) {
        return { error: 'Access denied to this job fair' };
      }
    } else if (jobFair.visibility === 'invite-only') {
      return { error: 'Access denied to this job fair' };
    }

    return jobFair;
  } catch (error) {
    return { error: `Error retrieving job fair: ${error}` };
  }
};

/**
 * Updates a job fair's status (e.g., from 'upcoming' to 'live').
 * @param jobFairId - The ID of the job fair to update.
 * @param hostUsername - The username of the host (for authorization).
 * @param status - The new status to set.
 * @returns {Promise<JobFairResponse>} - The updated job fair.
 */
export const updateJobFairStatus = async (
  jobFairId: string,
  hostUsername: string,
  status: 'upcoming' | 'live' | 'ended',
): Promise<JobFairResponse> => {
  try {
    const jobFair = await JobFairModel.findById(jobFairId);

    if (!jobFair) {
      return { error: 'Job fair not found' };
    }

    if (jobFair.hostUsername !== hostUsername) {
      return { error: 'Only the host can update job fair status' };
    }

    jobFair.status = status;
    await jobFair.save();

    return jobFair;
  } catch (error) {
    return { error: `Error updating job fair status: ${error}` };
  }
};

/**
 * Adds a participant to a job fair.
 * @param jobFairId - The ID of the job fair.
 * @param username - The username of the participant to add.
 * @returns {Promise<JobFairResponse>} - The updated job fair.
 */
export const joinJobFair = async (
  jobFairId: string,
  username: string,
): Promise<JobFairResponse> => {
  try {
    const jobFair = await JobFairModel.findById(jobFairId);
    // Check if job fair exists
    if (!jobFair) {
      return { error: 'Job fair not found' };
    }

    // Update user points for joining job fairs
    const user = await incrementUserPoint(username);
    if (!user || 'error' in user) {
      throw new Error(user.error);
    }

    // Check if job fair is accessible to the user
    const hasAccess =
      jobFair.visibility === 'public' ||
      jobFair.invitedUsers.includes(username) ||
      jobFair.hostUsername === username;

    if (!hasAccess) {
      return { error: 'Access denied to this job fair' };
    }

    // Check if user is already a participant
    if (jobFair.participants.includes(username)) {
      return { error: 'User is already a participant in this job fair' };
    }

    // Add participant
    jobFair.participants.push(username);
    await jobFair.save();

    return jobFair;
  } catch (error) {
    return { error: `Error joining job fair: ${error}` };
  }
};

/**
 * Removes a participant from a job fair.
 * @param jobFairId - The ID of the job fair.
 * @param username - The username of the participant to remove.
 * @returns {Promise<JobFairResponse>} - The updated job fair.
 */
export const leaveJobFair = async (
  jobFairId: string,
  username: string,
): Promise<JobFairResponse> => {
  try {
    const jobFair = await JobFairModel.findById(jobFairId);
    // Check if job fair exists
    if (!jobFair) {
      return { error: 'Job fair not found' };
    }

    // Check if user is a participant
    const participantIndex = jobFair.participants.indexOf(username);
    if (participantIndex === -1) {
      return { error: 'User is not a participant in this job fair' };
    }
    // Remove participant
    jobFair.participants.splice(participantIndex, 1);
    await jobFair.save();

    return jobFair;
  } catch (error) {
    return { error: `Error leaving job fair: ${error}` };
  }
};

/**
 * Adds a message to a job fair chat.
 * @param jobFairId - The ID of the job fair.
 * @param messageData - The message data to add.
 * @returns {Promise<JobFairResponse>} - The updated job fair or an error message.
 */
export const addJobFairMessage = async (
  jobFairId: string,
  messageData: Omit<Message, 'type'>,
): Promise<JobFairResponse> => {
  try {
    const jobFair = await JobFairModel.findById(jobFairId);

    if (!jobFair) {
      return { error: 'Job fair not found' };
    }

    // Check if the sender is the host
    if (jobFair.hostUsername === messageData.msgFrom) {
      // Host can always send messages
    } else {
      // For non-hosts, check if they are a participant
      if (!jobFair.participants.includes(messageData.msgFrom)) {
        return { error: 'Only participants and hosts can send messages' };
      }

      // Check if the sender is a recruiter (non-host recruiters cannot send messages)
      const user = await UserModel.findOne({ username: messageData.msgFrom }).select('userType');
      if (user && user.userType === 'recruiter') {
        return { error: 'Recruiters cannot send messages in job fairs hosted by other recruiters' };
      }
    }
    // Save the message
    const savedMessage = await saveMessage({ ...messageData, type: 'direct' });
    if ('error' in savedMessage) {
      return { error: savedMessage.error };
    }
    // Add message to job fair
    jobFair.chatMessages.push(savedMessage._id);
    await jobFair.save();

    return jobFair;
  } catch (error) {
    return { error: `Error adding job fair message: ${error}` };
  }
};

/**
 * Updates a job fair's information (host only).
 * @param jobFairId - The ID of the job fair to update.
 * @param hostUsername - The username of the host (for authorization).
 * @param updateData - The data to update (title, description, startTime, endTime, visibility, codingTournamentEnabled, overviewMessage, invitedUsers).
 * @returns {Promise<JobFairResponse>} - The updated job fair.
 */
export const updateJobFair = async (
  jobFairId: string,
  hostUsername: string,
  updateData: Partial<{
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    visibility: 'public' | 'invite-only';
    codingTournamentEnabled: boolean;
    overviewMessage?: string;
    invitedUsers: string[];
  }>,
): Promise<JobFairResponse> => {
  try {
    const jobFair = await JobFairModel.findById(jobFairId);

    if (!jobFair) {
      return { error: 'Job fair not found' };
    }

    if (jobFair.hostUsername !== hostUsername) {
      return { error: 'Only the host can update the job fair' };
    }

    // Update allowed fields
    if (updateData.title !== undefined) {
      jobFair.title = updateData.title;
    }
    if (updateData.description !== undefined) {
      jobFair.description = updateData.description;
    }
    if (updateData.startTime !== undefined) {
      jobFair.startTime = updateData.startTime;
    }
    if (updateData.endTime !== undefined) {
      jobFair.endTime = updateData.endTime;
    }
    if (updateData.visibility !== undefined) {
      jobFair.visibility = updateData.visibility;
    }
    if (updateData.codingTournamentEnabled !== undefined) {
      jobFair.codingTournamentEnabled = updateData.codingTournamentEnabled;
    }
    if (updateData.overviewMessage !== undefined) {
      jobFair.overviewMessage = updateData.overviewMessage;
    }
    if (updateData.invitedUsers !== undefined) {
      jobFair.invitedUsers = updateData.invitedUsers;
    }

    await jobFair.save();

    return jobFair;
  } catch (error) {
    return { error: `Error updating job fair: ${error}` };
  }
};

/**
 * Deletes a job fair (host only).
 * @param jobFairId - The ID of the job fair to delete.
 * @param hostUsername - The username of the host (for authorization).
 * @returns {Promise<JobFairResponse>} - The deleted job fair.
 */
export const deleteJobFair = async (
  jobFairId: string,
  hostUsername: string,
): Promise<JobFairResponse> => {
  try {
    const jobFair = await JobFairModel.findById(jobFairId);

    if (!jobFair) {
      return { error: 'Job fair not found' };
    }

    if (jobFair.hostUsername !== hostUsername) {
      return { error: 'Only the host can delete the job fair' };
    }

    await JobFairModel.findByIdAndDelete(jobFairId);
    return jobFair;
  } catch (error) {
    return { error: `Error deleting job fair: ${error}` };
  }
};
