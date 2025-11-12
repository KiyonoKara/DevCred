import useJobBoardPage from '../../../../hooks/useJobBoardPage';
import './index.css';

/**
 * RecruiterJobPostings component displays a list of job_postings for a specific user.
 */
const JobBoard = () => {
  const { jobPostings, handleViewJobPosting } = useJobBoardPage();

  return (
    <div className='job_postings-page'>
      <div className='job_postings-header'>
        <h1 className='job_postings-title'>Explore Job Postings</h1>
      </div>

      <div className='job_postings-list'>
        {jobPostings.map(job_posting => (
          <div
            key={job_posting._id.toString()}
            className='job_posting-card'
            onClick={() => handleViewJobPosting(job_posting._id.toString())}>
            <h2 className='job_posting-name'>{job_posting.title}</h2>
            <p className='job_posting-description'>{job_posting.company}</p>
            <p className='job_posting-privacy'>{job_posting.active ? 'Active' : 'Inactive'}</p>
            {!!job_posting.deadline && (
              <p className='job_posting-privacy'>
                {`Application Deadline: ${job_posting.deadline.toString()}`}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobBoard;
