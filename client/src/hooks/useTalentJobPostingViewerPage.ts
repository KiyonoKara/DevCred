import { DatabaseJobPosting } from '@fake-stack-overflow/shared';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { applyToJobPosting, getApplicationStatus } from '../services/jobApplicationService';
import { getJobPostingByJobId } from '../services/jobPostingService';
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
  const [jobPosting, setJobPosting] = useState<DatabaseJobPosting | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<boolean>(false);

  const handleApplyToPosition = async () => {
    if (jobId) {
      await applyToJobPosting(jobId, currentUser.username);
      setApplicationStatus(await getApplicationStatus(jobId, currentUser.username));
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
        setApplicationStatus(await getApplicationStatus(jobId, currentUser.username));
      }
    };

    fetchJobApplicationStatus();
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
