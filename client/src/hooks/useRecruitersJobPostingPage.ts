import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getJobPostingByUserId } from '../services/jobPostingService';
import { DatabaseJobPosting } from '../types/types';
import useUserContext from './useUserContext';

/**
 * Custom hook to manage the state and logic for the "RecruitersJobPosting" page, including fetching a recruiter's job postings
 * and navigation details
 *
 * @returns an object containing the following:
 * - `usernameBeingViewed`: The username of the recruiter whose collections are being viewed.
 * - `jobPostings`: The list of job postings by the recruiter
 * - `handleCreateJobPosting`: A function to navigate to the create job posting page.
 * - `handleViewJobPosting`: A function to navigate to the job posting details page.
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
