import { DatabaseJobApplication } from '@fake-stack-overflow/shared';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApplicationsByUser } from '../services/jobApplicationService';
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
const useTalentApplicationsViewerPage = () => {
  const { user: currentUser } = useUserContext();
  const navigate = useNavigate();
  const [jobApplications, setJobApplications] = useState<DatabaseJobApplication[]>([]);

  const handleViewJobPosting = async (jobId: string) => {
    navigate(`/talent/jobposting/${jobId}`);
  };
  useEffect(() => {
    const fetchJobApplications = async () => {
      const res = await getApplicationsByUser(currentUser.username);
      setJobApplications(res);
    };

    fetchJobApplications();
  }, [currentUser.username]);

  return {
    jobApplications,
    handleViewJobPosting,
  };
};

export default useTalentApplicationsViewerPage;
