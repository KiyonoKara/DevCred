import useTalentJobPostingViewerPage from '../../../../hooks/useTalentJobPostingViewerPage';
import './index.css';

/**
 * RecruiterJobPostings component displays a list of job_postings for a specific user.
 */
const ApplicantJobPostingsViewer = () => {
  const { userType, jobPosting, applicationStatus, handleApplyToPosition } =
    useTalentJobPostingViewerPage();

  return (
    !!jobPosting && (
      <div className='job_postings-page'>
        <div className='job_postings-header'>
          <h1 className='job_postings-title'>
            {jobPosting.title} - {jobPosting.company}
          </h1>
        </div>

        {!!jobPosting.jobType && <p>{jobPosting.jobType.toUpperCase()}</p>}

        {!!jobPosting.payRange && <p>Pay Range: {jobPosting.payRange}</p>}
        <p> Location: {jobPosting.location}</p>

        {userType == 'recruiter' ? (
          <p> Recruiters Cannot Apply to Postings </p>
        ) : applicationStatus ? (
          <h3>Applied to Position</h3>
        ) : (
          <button type='button' onClick={handleApplyToPosition}>
            Apply to Posting
          </button>
        )}

        {!!jobPosting.deadline && <p> Application Deadline: {jobPosting.deadline.toString()}</p>}

        <p> Position Overview: {jobPosting.description}</p>

        <p> Recruiter: {jobPosting.recruiter}</p>
      </div>
    )
  );
};

export default ApplicantJobPostingsViewer;
