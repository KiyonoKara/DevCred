import { DatabaseJobPosting, JobPosting } from '@fake-stack-overflow/shared';
import api from './config';

const JOB_POSTING_API_URL = `/api/jobposting`;

/**
 * Create a job posting
 * @param job Job posting object with details filled in to create new job posting
 * @returns Created job posting
 */
const createJobPosting = async (job: JobPosting): Promise<DatabaseJobPosting> => {
  const res = await api.post(`${JOB_POSTING_API_URL}/create`, job);

  if (res.status !== 201) {
    throw new Error('Error while creating job posting.');
  }

  return res.data;
};

/**
 * Gets all job postings made by a recruiter
 * @param recruiter username of recruiter to fetch job postings for
 * @param requestor username of user requesting the job postings
 * @returns array of job postings made by recruiter
 */
const getJobPostingByUserId = async (
  recruiter: string,
  requestor: string,
): Promise<DatabaseJobPosting[]> => {
  const params = new URLSearchParams({ requestorUsername: requestor });
  const res = await api.get(`${JOB_POSTING_API_URL}/recruiter/${recruiter}?${params.toString()}`);

  if (res.status !== 200) {
    throw new Error('Error while fetching job postings.');
  }

  return res.data;
};

/**
 * Fetches job details by job posting id
 * @param jobId Id of job to fetch details for
 * @param requestor username of user requesting job details
 * @returns Job details of requested job posting
 */
const getJobPostingByJobId = async (
  jobId: string,
  requestor: string,
): Promise<DatabaseJobPosting> => {
  const params = new URLSearchParams({ requestor });
  const res = await api.get(`${JOB_POSTING_API_URL}/${jobId}?${params.toString()}`);

  if (res.status !== 200) {
    throw new Error('Error while fetching job postings.');
  }

  return res.data;
};

/**
 * Toggles a job posting status active or inactive
 * @param jobId Id of job to toggle active status of
 * @param requestor username of user requesting status toggle
 * @returns job posting data after toggling active status
 */
const toggleJobPostingActiveStatus = async (
  jobId: string,
  requestor: string,
): Promise<DatabaseJobPosting> => {
  const params = new URLSearchParams({ requestor });
  const res = await api.patch(`${JOB_POSTING_API_URL}/${jobId}/toggle?${params.toString()}`);

  if (res.status !== 200) {
    throw new Error('Error toggling job posting active status.');
  }

  return res.data;
};

/**
 * Deletes the given job posting
 * @param jobId Id of job posting to delete
 * @param requestor username of user requesting job deletion
 * @returns data from the deleted job posting
 */
const deleteJobPosting = async (jobId: string, requestor: string): Promise<DatabaseJobPosting> => {
  const params = new URLSearchParams({ requestor });
  const res = await api.delete(`${JOB_POSTING_API_URL}/${jobId}?${params.toString()}`);

  if (res.status !== 200) {
    throw new Error('Error deleting job posting');
  }

  return res.data;
};

/**
 * fetches all job board listings by given optional filters
 * @param requestor username of user requesting job postings
 * @param location location filter (if provided)
 * @param jobType job type filter (if provided)
 * @param search search words filter (if provided)
 * @returns All job postings which match the filter criteria
 */
const getJobBoardListings = async (
  requestor: string,
  location?: string,
  jobType?: string,
  search?: string,
): Promise<DatabaseJobPosting[]> => {
  const params = new URLSearchParams({ requestor });
  if (location) {
    params.append('location', location);
  }
  if (jobType) {
    params.append('jobType', jobType);
  }
  if (search) {
    params.append('search', search);
  }

  const queryString = params.toString();
  const res = await api.get(`${JOB_POSTING_API_URL}/list?${queryString}`);

  if (res.status !== 200) {
    throw new Error('Error while fetching job postings.');
  }

  return res.data;
};

export {
  createJobPosting,
  deleteJobPosting,
  getJobBoardListings,
  getJobPostingByJobId,
  getJobPostingByUserId,
  toggleJobPostingActiveStatus,
};
