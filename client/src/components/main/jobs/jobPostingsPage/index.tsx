import useRecruitersJobPostingPage from '../../../../hooks/useRecruitersJobPostingPage';
import './index.css';

/**
 * RecruiterJobPostings component displays a list of job_postings for a specific user.
 */
const RecruiterJobPostings = () => {
  const { usernameBeingViewed, jobPostings, handleCreateJobPosting, handleViewJobPosting } =
    useRecruitersJobPostingPage();

  return (
    <div className='job_postings-page'>
      <div className='job_postings-header'>
        <h1 className='job_postings-title'>{usernameBeingViewed}'s Job Postings</h1>
        <button className='job_postings-create-btn' onClick={handleCreateJobPosting}>
          Create Job Posting
        </button>
      </div>

      <div className='job_postings-list'>
        {jobPostings.map(job_posting => {
          const formattedDeadline = (() => {
            if (!job_posting.deadline) {
              return null;
            }

            const date = new Date(job_posting.deadline);
            if (Number.isNaN(date.getTime())) {
              return null;
            }

            return date.toLocaleDateString();
          })();

          return (
            <div
              key={job_posting._id.toString()}
              className='job_posting-card'
              onClick={() => handleViewJobPosting(job_posting._id.toString())}>
              <h2 className='job_posting-name'>{job_posting.title}</h2>
              <p className='job_posting-description'>{job_posting.company}</p>
              <p className='job_posting-privacy'>{job_posting.active ? 'Active' : 'Inactive'}</p>
              {formattedDeadline && (
                <p className='job_posting-privacy'>{`Application Deadline: ${formattedDeadline}`}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecruiterJobPostings;
