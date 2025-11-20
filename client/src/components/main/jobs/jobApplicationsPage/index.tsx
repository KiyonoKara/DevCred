import useTalentApplicationsViewerPage from '../../../../hooks/useTalentApplicationsViewerPage';
import './index.css';

/**
 * TalentApplicationView component displays a list of job applications made by the talent.
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
          const formattedSubmissionDate = (() => {
            const date = new Date(job_application.applicationDate);
            if (Number.isNaN(date.getTime())) {
              return 'Unknown submission time';
            }

            return date.toLocaleString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
          })();

          return (
            <div key={job_application._id.toString()} className='job_posting-card'>
              <h2 className='job_application-name'>{job_application.jobPosting.title}</h2>
              <p className='job_application-description'>{job_application.jobPosting.company}</p>
              <p className='job_application-description'>
                Application Submission Date: {formattedSubmissionDate}
              </p>

              {job_application.jobPosting.active ? (
                <button
                  type='button'
                  onClick={() => handleViewJobPosting(job_application.jobPosting._id.toString())}>
                  View Job Posting
                </button>
              ) : (
                <p>Job Posting Deactivated</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TalentApplicationView;
