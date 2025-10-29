import {
  JobPosting,
  JobPostingListResponse,
  JobPostingResponse,
} from '@fake-stack-overflow/shared';
import JobPostingModel from '../models/jobPosting.model';
import UserModel from '../models/users.model';

/**
 * Creates a new job posting (recruiter user type method only).
 * @param {JobPosting} job - The job posting
 * @returns {Promise<JobPostingResponse>} - The created job posting or an error message.
 */
export const createJobPosting = async (job: JobPosting): Promise<JobPostingResponse> => {
  try {
    const community = await JobPostingModel.create(job);
    return community;
  } catch (err) {
    return {
      error: 'Error creating job posting',
    };
  }
};

/**
 * Deletes a job posting (recruiter user type method only).
 * @param {string} jobId - The ID of the job posting
 * @param {string} username - The username of the recruiter requesting deletion.
 * @returns {Promise<JobPostingResponse>} - The deleted job posting or an error message.
 */
export const deleteJobPosting = async (
  jobId: string,
  username: string,
): Promise<JobPostingResponse> => {
  try {
    const job = await JobPostingModel.findOne({ _id: jobId, recruiter: username });

    if (!job) {
      return {
        error: 'Job not found',
      };
    }
    const result = await JobPostingModel.findByIdAndDelete(jobId);

    if (!result) {
      return { error: 'Job Posting not found or already deleted' };
    }

    return result;
  } catch (err) {
    return {
      error: 'Error deleting job posting',
    };
  }
};

/**
 * Toggles a job posting's active status, taking into consideration the deadline
 * @param {string} jobId - The ID of the job posting
 * @param {string} username - The username of the recruiter toggling the posting.
 * @returns {Promise<JobPostingResponse>} - The updated job posting or an error message.
 */
export const toggleJobPostingActive = async (
  jobId: string,
  username: string,
): Promise<JobPostingResponse> => {
  try {
    let job = await JobPostingModel.findOne({ _id: jobId, recruiter: username });
    if (!job) {
      return {
        error: 'Job not found',
      };
    }

    const today = new Date();
    const dueDate = job.deadline ? new Date(job.deadline) : null;

    // If the job is beyond the due date of the job
    // (meaning it is not returned when fetched as due date takes precedence over activation status)
    // Re-activate the position, wiping the due date in the process.
    if (dueDate && today > dueDate) {
      job.deadline = null;
      job.active = true;
    } else {
      job.active = !job.active;
    }
    await job.save();

    job = await JobPostingModel.findOne({ _id: jobId, recruiter: username });
    if (!job) {
      return {
        error: 'Job not found',
      };
    }

    return job;
  } catch (err) {
    return {
      error: 'Error modifying job posting',
    };
  }
};

/**
 * Retrieves job postings for a user. Returns recruiter made job posts if recruiter requests/
 * Returns job posts that are active if talent requests.
 * @param {string} username - The username of the requester.
 * @returns {Promise<JobPostingListResponse>} - A list of job postings or an error message.
 */
export const getJobPostings = async (username: string): Promise<JobPostingListResponse> => {
  try {
    const user = await UserModel.findOne({ username: username });
    if (!user) {
      return {
        error: 'User not found',
      };
    }

    let jobs = null;
    if (user.userType == 'recruiter') {
      jobs = await JobPostingModel.find({ recruiter: username });
    } else {
      jobs = await JobPostingModel.find({
        active: true,
        $or: [{ deadline: null }, { deadline: { $gt: new Date() } }],
      });
    }

    return jobs;
  } catch (err) {
    return {
      error: 'Error fetching jobs',
    };
  }
};
