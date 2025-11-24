import { DatabaseJobPosting } from '@fake-stack-overflow/shared';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { applyToJobPosting, getApplicationStatus } from '../services/jobApplicationService';
import { getJobPostingByJobId } from '../services/jobPostingService';
import { getUserResumes } from '../services/resumeService';
import useUserContext from './useUserContext';

/**
 * Custom hook to manage the state and logic for the "TalentJobPostingViewer" page, including fetching job details,
 * and controlling application capabilities depending on user type.
 *
 * @returns an object containing the following:
 * - `userType`: 'talent' or 'recruiter' user type for logged in user
 * - `jobPosting`: The job posting being used.
 * - `applicationStatus`: If the user has applied to the job posting already or not.
 * - `handleApplyToPosition`: Handler to apply to position for talent user types who have not already applied to position.
 */
const useTalentJobPostingViewerPage = () => {
  const { user: currentUser } = useUserContext();
  const { jobId } = useParams();
  const [jobPosting, setJobPosting] = useState<DatabaseJobPosting | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<boolean>(false);
  const [hasActiveResume, setHasActiveResume] = useState<boolean>(false);

  const handleApplyToPosition = async () => {
    if (jobId) {
      await applyToJobPosting(jobId, currentUser.username);
      setApplicationStatus(await getApplicationStatus(jobId, currentUser.username));
    }
    if (currentUser.profileVisibility !== 'public-full') {
      alert('Help Recruiters Learn More, set your profile visibility to full!');
    } else {
      alert('Position applied to and DM with Recruiter created!');
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

    const fetchHasActiveResume = async () => {
      if (currentUser) {
        let resumes = await getUserResumes(currentUser.username);
        resumes = resumes.filter(resume => resume.isActive);
        setHasActiveResume(resumes.length === 1);
      }
    };

    fetchJobApplicationStatus();
    fetchJobPosting();
    fetchHasActiveResume();
  }, [currentUser.username, jobId]);

  return {
    userType: currentUser.userType,
    jobPosting,
    applicationStatus,
    hasActiveResume,
    handleApplyToPosition,
  };
};

export default useTalentJobPostingViewerPage;
