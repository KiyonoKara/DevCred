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
      <div className='job-posting-viewer'>
        <div className='job-posting-container'>
          <div className='job-posting-header'>
            <div className='job-title-section'>
              <h1 className='job-title'>{jobPosting.title}</h1>
              <h2 className='company-name'>{jobPosting.company}</h2>
            </div>
            {!!jobPosting.jobType && (
              <span className='job-type-badge'>{jobPosting.jobType.toUpperCase()}</span>
            )}
          </div>

          <div className='job-meta-info'>
            <div className='meta-item'>
              <b>Location:</b>
              <span className='meta-text'>{jobPosting.location}</span>
            </div>
            {!!jobPosting.payRange && (
              <div className='meta-item'>
                <b>Pay Range:</b>
                <span className='meta-text'>{jobPosting.payRange}</span>
              </div>
            )}
            {!!jobPosting.deadline && (
              <div className='meta-item'>
                <b>Deadline:</b>
                <span className='meta-text'>
                  {(() => {
                    const date = new Date(jobPosting.deadline);
                    if (Number.isNaN(date.getTime())) {
                      return 'Unknown';
                    }
                    return date.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });
                  })()}
                </span>
              </div>
            )}
          </div>

          <p className='section-title'>Recruiter Controls</p>
          <p className='company-name'>
            Current Status: {jobPosting.active ? 'Active' : 'Inactive'}
          </p>
          <button
            className='status-handlers-active'
            type='button'
            onClick={handleToggleActiveStatus}>
            Change Active Status
          </button>

          <button type='button' className='status-handlers-delete' onClick={handleDeleteJobPosting}>
            Delete Job
          </button>

          <div className='job-description-section'>
            <h3 className='section-title'>Position Overview</h3>
            <p className='job-description'>{jobPosting.description}</p>
          </div>

          <div className='recruiter-section'>
            <div className='recruiter-info'>
              <div className='recruiter-details'>
                <span className='recruiter-label'>Posted by</span>
                <span className='recruiter-name'>{jobPosting.recruiter}</span>
              </div>
            </div>
          </div>
        </div>

        <div className='job-applications-container'>
          <h3 className='section-title'>Applications By Viewers</h3>
          <div className='job_application-list'>
            {jobApplications.map(job_application => (
              <div key={job_application._id.toString()} className='job_application-card'>
                <h2 className='job_application-name'>Applicant: {job_application.user}</h2>
                <p className='job_application-description'>
                  Application Submission Date:{' '}
                  {(() => {
                    const date = new Date(job_application.applicationDate);
                    if (Number.isNaN(date.getTime())) {
                      return 'Unknown';
                    }
                    return date.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });
                  })()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  );
};

export default RecruiterJobPostingsViewer;
