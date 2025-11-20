import { DatabaseJobApplication, DatabaseJobPosting } from '@fake-stack-overflow/shared';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApplicationsByJobId } from '../services/jobApplicationService';
import {
  deleteJobPosting,
  getJobPostingByJobId,
  toggleJobPostingActiveStatus,
} from '../services/jobPostingService';
import useUserContext from './useUserContext';

/**
 * Custom hook to manage the state and logic for the "RecruitersJobPostingViewer" page, including fetching job posting details,
 * handling active status changes, and deleting job postings, and displaying all applications submitted for the given job.
 *
 * @returns an object containing the following:
 * - `jobApplications`: Applications submitted to a job.
 * - `jobPosting`: Details of a specific job posting for a user
 * - `handleToggleActiveStatus`: A handler for the button to toggle active status of a job posting.
 * - `handleDeleteJobPosting`: A handler to delete a job posting.
 */
const useRecruitersJobPostingViewerPage = () => {
  const { user: currentUser } = useUserContext();
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [jobApplications, setJobApplications] = useState<DatabaseJobApplication[]>([]);
  const [jobPosting, setJobPosting] = useState<DatabaseJobPosting | null>(null);

  const handleToggleActiveStatus = async () => {
    if (jobId) {
      setJobPosting(await toggleJobPostingActiveStatus(jobId, currentUser.username));
    }
  };

  const handleDeleteJobPosting = async () => {
    if (jobId) {
      await deleteJobPosting(jobId, currentUser.username);
      navigate(`/recruiters/jobposting/${currentUser.username}`);
    }
  };

  useEffect(() => {
    const fetchJobApplications = async () => {
      if (jobId) {
        setJobApplications(await getApplicationsByJobId(jobId?.toString(), currentUser.username));
      }
    };

    const fetchJobPosting = async () => {
      if (jobId) {
        setJobPosting(await getJobPostingByJobId(jobId, currentUser.username));
      }
    };

    fetchJobApplications();
    fetchJobPosting();
  }, [currentUser.username, jobId]);

  return {
    jobApplications,
    jobPosting,
    handleToggleActiveStatus,
    handleDeleteJobPosting,
  };
};

export default useRecruitersJobPostingViewerPage;
