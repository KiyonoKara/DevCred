import useTalentApplicationsViewerPage from '../../../../hooks/useTalentApplicationsViewerPage';
import './index.css';

/**
 * RecruiterJobPostings component displays a list of job_postings for a specific user.
 */
const TalentApplicationView = () => {
  const { jobApplications, handleViewJobPosting } = useTalentApplicationsViewerPage();

  return (
    <div className='job_postings-page'>
      <div className='job_postings-header'>
        <h1 className='job_postings-title'>My Applications</h1>
      </div>

      <div className='job_application-list'>
        {jobApplications.map(
          jobApplication =>
            jobApplication.jobPosting && (
              <div key={jobApplication._id.toString()} className='job_posting-card'>
                <h2 className='job_application-name'>{jobApplication.jobPosting.title}</h2>
                <p className='job_application-description'>{jobApplication.jobPosting.company}</p>
                <p className='job_application-description'>
                  Application Submission Date: {jobApplication.applicationDate.toString()}
                </p>

                {jobApplication.jobPosting.active ? (
                  <button
                    type='button'
                    onClick={() => handleViewJobPosting(jobApplication.jobPosting._id.toString())}>
                    View Job Posting
                  </button>
                ) : (
                  <p>Job Posting Deactivated</p>
                )}
              </div>
            ),
        )}
      </div>
    </div>
  );
};

export default TalentApplicationView;
