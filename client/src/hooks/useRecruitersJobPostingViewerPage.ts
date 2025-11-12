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
 * Custom hook to manage the state and logic for the "All Collections" page, including fetching collections,
 * creating a new collection, and navigating to collection details.
 *
 * @returns an object containing the following:
 * - `usernameBeingViewed`: The username of the user whose collections are being viewed.
 * - `collections`: The list of collections for the user.
 * - `handleCreateCollection`: A function to navigate to the create collection page.
 * - `handleViewCollection`: A function to navigate to the collection details page.
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
