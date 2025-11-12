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
  const res = await api.get(
    `${JOB_POSTING_API_URL}/recruiter/${recruiter}?requestorUsername=${requestor}`,
  );

  if (res.status !== 200) {
    throw new Error('Error while fetching job postings.');
  }

  return res.data;
};

const getJobPostingByJobId = async (
  jobId: string,
  requestor: string,
): Promise<DatabaseJobPosting> => {
  const res = await api.get(`${JOB_POSTING_API_URL}/${jobId}?requestor=${requestor}`);

  if (res.status !== 200) {
    throw new Error('Error while fetching job postings.');
  }

  return res.data;
};

const toggleJobPostingActiveStatus = async (
  jobId: string,
  requestor: string,
): Promise<DatabaseJobPosting> => {
  const res = await api.patch(`${JOB_POSTING_API_URL}/${jobId}/toggle?requestor=${requestor}`);

  if (res.status !== 200) {
    throw new Error('Error toggling job posting active status.');
  }

  return res.data;
};

const deleteJobPosting = async (jobId: string, requestor: string): Promise<DatabaseJobPosting> => {
  const res = await api.delete(`${JOB_POSTING_API_URL}/${jobId}?requestor=${requestor}`);

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
  let queryString = '';
  if (!!location) {
    queryString += `location=${location}`;
  }
  if (!!jobType) {
    queryString += `jobType=${jobType}`;
  }
  if (!!search) {
    queryString += `search=${search}`;
  }
  const res = await api.get(`${JOB_POSTING_API_URL}/list?requestor=${requestor}&${queryString}`);

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
