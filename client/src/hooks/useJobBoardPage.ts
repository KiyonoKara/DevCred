import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJobBoardListings } from '../services/jobPostingService';
import { DatabaseJobPosting } from '../types/types';
import useUserContext from './useUserContext';

/**
 * Custom hook to manage the state and logic for the "Job Board" page, including fetching job postings,
 * viewing job descriptions, and .
 *
 * @returns an object containing the following:
 * - `jobPostings`: list of all available job postings for user to view
 * - `handleViewJobPosting`: navigation handler to view job posting.
 * -`location`: location filter
 * -`setLocation`: set location filter
 * -`jobType`: job type filter
 * -`setJobType`: set job type filter
 * -`search`: search filter
 * -`setSearch`: setSearchFilter
 */
const useJobBoardPage = () => {
  const { user: currentUser } = useUserContext();
  const [location, setLocation] = useState<string>('');
  const [jobType, setJobType] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [jobPostings, setJobPostings] = useState<DatabaseJobPosting[]>([]);
  const navigate = useNavigate();

  const handleViewJobPosting = async (jobPostingId: string) => {
    navigate(`/talent/jobposting/${jobPostingId}`);
    return;
  };

  useEffect(() => {
    const fetchJobPostings = async () => {
      setJobPostings(await getJobBoardListings(currentUser.username, location, jobType, search));
    };

    fetchJobPostings();
  }, [currentUser.username, location, jobType, search]);

  return {
    location,
    setLocation,
    jobType,
    setJobType,
    search,
    setSearch,
    jobPostings,
    handleViewJobPosting,
  };
};

export default useJobBoardPage;
