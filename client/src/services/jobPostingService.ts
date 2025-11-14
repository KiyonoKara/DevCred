import { DatabaseJobPosting, JobPosting } from '@fake-stack-overflow/shared';
import api from './config';

const JOB_POSTING_API_URL = `/api/jobposting`;

const createJobPosting = async (job: JobPosting): Promise<DatabaseJobPosting> => {
  const res = await api.post(`${JOB_POSTING_API_URL}/create`, job);

  if (res.status !== 201) {
    throw new Error('Error while creating job posting.');
  }

  return res.data;
};

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

const deleteJobPosting = async (jobId: string, requestor: string): Promise<DatabaseJobPosting> => {
  const params = new URLSearchParams({ requestor });
  const res = await api.delete(`${JOB_POSTING_API_URL}/${jobId}?${params.toString()}`);

  if (res.status !== 200) {
    throw new Error('Error deleting job posting');
  }

  return res.data;
};

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
