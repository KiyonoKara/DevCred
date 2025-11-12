import { DatabaseJobApplication } from '@fake-stack-overflow/shared';
import api from './config';

const JOB_APPLICATION_API_URL = `/api/jobapplication`;

const getApplicationsByJobId = async (
  jobId: string,
  requestor: string,
): Promise<DatabaseJobApplication[]> => {
  const res = await api.get(`${JOB_APPLICATION_API_URL}/job/${jobId}?requestor=${requestor}`);

  if (res.status !== 200) {
    throw new Error('Error fetching applications by job id');
  }

  return res.data;
};

const getApplicationStatus = async (jobId: string, requestor: string): Promise<boolean> => {
  const res = await api.get(`${JOB_APPLICATION_API_URL}/${jobId}/status?username=${requestor}`);

  if (res.status !== 200) {
    throw new Error('Error fetching application status by job id');
  }

  return res.data.hasApplied;
};

const applyToJobPosting = async (
  jobId: string,
  username: string,
): Promise<DatabaseJobApplication[]> => {
  const res = await api.post(`${JOB_APPLICATION_API_URL}/create`, {
    jobId,
    username,
  });

  if (res.status !== 201) {
    throw new Error('Error fetching application status by job id');
  }

  return res.data.hasApplied;
};

const getApplicationsByUser = async (username: string): Promise<DatabaseJobApplication[]> => {
  const res = await api.get(`${JOB_APPLICATION_API_URL}/user/${username}`);

  if (res.status !== 200) {
    throw new Error('Error fetching application status by job id');
  }

  return res.data;
};

export { applyToJobPosting, getApplicationsByJobId, getApplicationsByUser, getApplicationStatus };
