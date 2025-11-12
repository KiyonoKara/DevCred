import { DatabaseJobPosting } from '@fake-stack-overflow/shared';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getJobPostingByJobId, toggleJobPostingActiveStatus } from '../services/jobPostingService';
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
const useTalentJobPostingViewerPage = () => {
  const { user: currentUser } = useUserContext();
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [jobPosting, setJobPosting] = useState<DatabaseJobPosting | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<boolean>(false);

  const handleApplyToPosition = async () => {
    if (jobId) {
      setJobPosting(await toggleJobPostingActiveStatus(jobId, currentUser.username));
    }
  };

  useEffect(() => {
    const fetchJobPosting = async () => {
      if (jobId) {
        setJobPosting(await getJobPostingByJobId(jobId, currentUser.username));
      }
    };

    const fetchJobApplicationStatus = async () => {
      if (jobId) {
        setJobPosting(await getJobPostingByJobId(jobId, currentUser.username));
      }
    };

    fetchJobPosting();
  }, [currentUser.username, jobId]);

  return {
    userType: currentUser.userType,
    jobPosting,
    applicationStatus,
    handleApplyToPosition,
  };
};

export default useTalentJobPostingViewerPage;
