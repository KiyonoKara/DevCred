import useRecruitersJobPostingViewerPage from '../../../../hooks/useRecruitersJobPostingViewerPage';
import './index.css';

/**
 * RecruiterJobPostingsViewer component displays the details related to a specific job posting and allows recruiter to change active status or delete the posting.
 */
const RecruiterJobPostingsViewer = () => {
  const { jobApplications, jobPosting, handleToggleActiveStatus, handleDeleteJobPosting } =
    useRecruitersJobPostingViewerPage();

  return (
    !!jobPosting && (
      <div className='job_postings-page'>
        <div className='job_postings-header'>
          <h1 className='job_postings-title'>
            Applications for: {jobPosting.title} - {jobPosting.company}
          </h1>
        </div>

        <p>Current Status: {jobPosting.active ? 'Active' : 'Inactive'}</p>
        <button type='button' onClick={handleToggleActiveStatus}>
          Change Active Status
        </button>

        <button type='button' onClick={handleDeleteJobPosting}>
          Delete Job
        </button>

        <p>{jobPosting.description}</p>

        <div className='job_application-list'>
          {jobApplications.map(job_application => (
            <div key={job_application._id.toString()} className='job_posting-card'>
              <h2 className='job_application-name'>Applicant: {job_application.user}</h2>
              <p className='job_application-description'>
                Application Submission Date: {job_application.applicationDate.toString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    )
  );
};

export default RecruiterJobPostingsViewer;
