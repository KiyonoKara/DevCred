import { DatabaseJobApplication } from '@fake-stack-overflow/shared';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApplicationsByUser } from '../services/jobApplicationService';
import useUserContext from './useUserContext';

/**
 * Custom hook to manage the state and logic for the "TalentApplicationsViewer" page, including fetching job applications submitted by user,
 * and viewing associated job descriptions if active
 *
 * @returns an object containing the following:
 * - `jobApplications`: Job applications submitted by user
 * - `handleViewJobPosting`: Handler for viewing a job posting associated to application.
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
