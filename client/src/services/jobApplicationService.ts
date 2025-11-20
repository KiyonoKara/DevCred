import { DatabaseJobApplication } from '@fake-stack-overflow/shared';
import api from './config';

const JOB_APPLICATION_API_URL = `/api/jobapplication`;

/**
 * Fetches all applications associated to a job by job id
 * @param jobId Id of job to fetch applications for.
 * @param requestor username of application requesting user.
 * @returns array of job applications associated to a job.
 */
const getApplicationsByJobId = async (
  jobId: string,
  requestor: string,
): Promise<DatabaseJobApplication[]> => {
  const params = new URLSearchParams({ requestor });
  const res = await api.get(`${JOB_APPLICATION_API_URL}/job/${jobId}?${params.toString()}`);

  if (res.status !== 200) {
    throw new Error('Error fetching applications by job id');
  }

  return res.data;
};

/**
 * Fetches status of if a user has applied to a job yet or not
 * @param jobId Id of job being checked for an application.
 * @param requestor username of user that is being checked for having applied yet to associated job.
 * @returns boolean indicating if the job has been applied to by the user.
 */
const getApplicationStatus = async (jobId: string, requestor: string): Promise<boolean> => {
  const params = new URLSearchParams({ username: requestor });
  const res = await api.get(`${JOB_APPLICATION_API_URL}/${jobId}/status?${params.toString()}`);

  if (res.status !== 200) {
    throw new Error('Error fetching application status by job id');
  }

  return res.data.hasApplied;
};

/**
 * Submits a job application for the passed user to the given job.
 * @param jobId Id of job being applied to
 * @param username username of user applying to job
 * @returns created job application
 */
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

  return res.data;
};

/**
 * Fetches all applications submitted by a user
 * @param username username of user to fetch applications for
 * @returns Array of applications submitted by a user
 */
const getApplicationsByUser = async (username: string): Promise<DatabaseJobApplication[]> => {
  const res = await api.get(`${JOB_APPLICATION_API_URL}/user/${username}`);

  if (res.status !== 200) {
    throw new Error('Error fetching application status by job id');
  }

  return res.data;
};

export { applyToJobPosting, getApplicationsByJobId, getApplicationsByUser, getApplicationStatus };
