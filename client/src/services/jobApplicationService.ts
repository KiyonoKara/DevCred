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

export { getApplicationsByJobId };
