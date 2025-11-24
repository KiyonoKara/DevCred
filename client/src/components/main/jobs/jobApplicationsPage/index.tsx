import useTalentApplicationsViewerPage from '../../../../hooks/useTalentApplicationsViewerPage';
import formattedDate from '../../../helpers/formattingHelpers';
import './index.css';

/**
 * TalentApplicationView component displays all the applications submitted by a user for non-deleted jobs.
 */
const TalentApplicationView = () => {
  const { jobApplications, handleViewJobPosting } = useTalentApplicationsViewerPage();

  return (
    <div className='job_postings-page'>
      <div className='job_postings-header'>
        <h1 className='job_postings-title'>My Applications</h1>
      </div>

      <div className='job_application-list'>
        {jobApplications.map(job_application => {
          return (
            job_application.jobPosting && (
              <div key={job_application._id.toString()} className='job_posting-card'>
                <h2 className='job_application-name'>{job_application.jobPosting.title}</h2>
                <p className='job_application-description'>{job_application.jobPosting.company}</p>
                <p className='job_application-description'>
                  Application Submission Date: {formattedDate(job_application.applicationDate)}
                </p>

                {job_application.jobPosting.active ? (
                  <button
                    className='view-posting-button'
                    type='button'
                    onClick={() => handleViewJobPosting(job_application.jobPosting._id.toString())}>
                    View Job Posting
                  </button>
                ) : (
                  <p>Job Posting Deactivated</p>
                )}
              </div>
            )
          );
        })}
      </div>
    </div>
  );
};

export default TalentApplicationView;
