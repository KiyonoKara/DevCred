import useJobBoardPage from '../../../../hooks/useJobBoardPage';
import formattedDate from '../../../helpers/formattingHelpers';
import './index.css';

/**
 * JobBoard component displays a list of all active and available job_postings for a user to apply to or recruiter to view.
 */
const JobBoard = () => {
  const {
    location,
    setLocation,
    jobType,
    setJobType,
    search,
    setSearch,
    jobPostings,
    handleViewJobPosting,
  } = useJobBoardPage();

  return (
    <div className='job_postings-page'>
      <div className='job_postings-header'>
        <h1 className='job_postings-title'>Explore Job Postings</h1>
      </div>

      <div className='filter-control'>
        <input
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder='Search by location'
        />

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='General Search'
        />

        <select value={jobType} onChange={e => setJobType(e.target.value)}>
          <option value=''>All</option>
          <option value='full-time'>Full-Time</option>
          <option value='co-op'>Co-Op</option>
          <option value='internship'>Internship</option>
          <option value='part-time'>Part-Time</option>
        </select>
      </div>

      <div className='job_postings-list'>
        {jobPostings.map(job_posting => {
          return (
            job_posting && (
              <div
                key={job_posting._id.toString()}
                className='job_posting-card'
                onClick={() => handleViewJobPosting(job_posting._id.toString())}>
                <h2 className='job_posting-name'>{job_posting.title}</h2>
                <p className='job_posting-description'>{job_posting.company}</p>
                {job_posting.deadline && (
                  <p className='job_posting-privacy'>{`Application Deadline: ${formattedDate(job_posting.deadline)}`}</p>
                )}
              </div>
            )
          );
        })}
      </div>
    </div>
  );
};

export default JobBoard;
