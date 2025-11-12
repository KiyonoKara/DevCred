import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getJobPostingByUserId } from '../services/jobPostingService';
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
const useRecruitersJobPostingPage = () => {
  const { user: currentUser } = useUserContext();
  const { username: usernameBeingViewed } = useParams();
  const [jobPostings, setJobPostings] = useState<DatabaseJobPosting[]>([]);
  const navigate = useNavigate();

  const handleCreateJobPosting = async () => {
    navigate('/recruiters/jobposting/new');
    return;
  };

  const handleViewJobPosting = async (jobPostingId: string) => {
    navigate(`/recruiters/jobposting/${jobPostingId}/applications`);
    return;
  };

  useEffect(() => {
    const fetchJobPostings = async () => {
      if (usernameBeingViewed === undefined) {
        return;
      }

      setJobPostings(await getJobPostingByUserId(usernameBeingViewed, currentUser.username));
    };

    fetchJobPostings();
  }, [currentUser.username, usernameBeingViewed]);

  return {
    usernameBeingViewed,
    jobPostings,
    handleCreateJobPosting,
    handleViewJobPosting,
  };
};

export default useRecruitersJobPostingPage;
