import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJobBoardListings } from '../services/jobPostingService';
import { DatabaseJobPosting } from '../types/types';
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
const useJobBoardPage = () => {
  const { user: currentUser } = useUserContext();
  const [jobPostings, setJobPostings] = useState<DatabaseJobPosting[]>([]);
  const navigate = useNavigate();

  const handleViewJobPosting = async (jobPostingId: string) => {
    navigate(`/talent/jobposting/${jobPostingId}`);
    return;
  };

  useEffect(() => {
    const fetchJobPostings = async () => {
      setJobPostings(await getJobBoardListings(currentUser.username));
    };

    fetchJobPostings();
  }, [currentUser.username]);

  return {
    jobPostings,
    handleViewJobPosting,
  };
};

export default useJobBoardPage;
