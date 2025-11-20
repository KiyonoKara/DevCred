import useTalentJobPostingViewerPage from '../../../../hooks/useTalentJobPostingViewerPage';
import './index.css';

/**
 * ApplicantJobPostingsViewer component displays a specific job posting.
 */
const ApplicantJobPostingsViewer = () => {
  const { userType, jobPosting, applicationStatus, handleApplyToPosition } =
    useTalentJobPostingViewerPage();

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

          <div className='application-section'>
            {userType == 'recruiter' ? (
              <div className='info-banner recruiter-notice'>
                <span className='info-icon'>ℹ️</span>
                <span>Recruiters cannot apply to postings</span>
              </div>
            ) : applicationStatus ? (
              <div className='info-banner applied-status'>
                <span>You have applied to this position</span>
              </div>
            ) : (
              <button type='button' className='apply-button' onClick={handleApplyToPosition}>
                Apply to Position
              </button>
            )}
          </div>

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
      </div>
    )
  );
};

export default ApplicantJobPostingsViewer;
