import useRecruitersNewJobPostingPage from '../../../../hooks/useRecruitersNewJobPostingPage';
import './index.css';

/**
 * This component renders a form for creating a new job posting.
 */
const NewJobPostingPage = () => {
  const {
    error,
    company,
    setCompany,
    title,
    setTitle,
    payRange,
    setPayRange,
    description,
    setDescription,
    location,
    setLocation,
    jobType,
    setJobType,
    active,
    setActive,
    deadline,
    setDeadline,
    tags,
    setTags,
    handleCreateJobPosting,
  } = useRecruitersNewJobPostingPage();

  return (
    <div className='new-job_posting-page'>
      <h1 className='new-job_posting-title'>Create New Job Posting</h1>

      <h4>Position Title*</h4>
      <input
        type='text'
        placeholder='Enter Title Here...'
        className='new-job_posting-input'
        onChange={e => setTitle(e.target.value)}
        value={title}
      />

      <h4>Company Name*</h4>
      <input
        type='text'
        placeholder='Enter Company Here...'
        className='new-job_posting-input'
        value={company}
        onChange={e => setCompany(e.target.value)}
      />

      <h4>Pay Range</h4>
      <input
        type='text'
        placeholder='Enter Pay Range Here...'
        className='new-job_posting-input'
        value={payRange}
        onChange={e => setPayRange(e.target.value)}
      />

      <h4>Job Description*</h4>
      <input
        type='text'
        placeholder='Enter Description Here...'
        className='new-job_posting-input'
        value={description}
        onChange={e => setDescription(e.target.value)}
      />

      <h4>Job Location*</h4>
      <input
        type='text'
        placeholder='Enter Location Here...'
        className='new-job_posting-input'
        value={location}
        onChange={e => setLocation(e.target.value)}
      />

      <h4>Position Deadline (MM/DD/YYYY)</h4>
      <input
        type='text'
        placeholder='Enter Date'
        className='new-job_posting-input'
        value={deadline}
        onChange={e => setDeadline(e.target.value)}
      />

      <h4>Tags (Please add them separated by a space)</h4>
      <input
        type='text'
        placeholder='Enter Date'
        className='new-job_posting-input'
        value={tags}
        onChange={e => setTags(e.target.value)}
      />

      <h4>Job Type</h4>
      <div>
        <button
          type='button'
          className={`new-job_posting-type-btn ${jobType === 'full-time' ? 'active' : 'disabled'}`}
          onClick={() => {
            setJobType('full-time');
          }}>
          Full-Time
        </button>

        <button
          type='button'
          className={`new-job_posting-type-btn ${jobType === 'part-time' ? 'active' : 'disabled'}`}
          onClick={() => {
            setJobType('part-time');
          }}>
          Part-Time
        </button>

        <button
          type='button'
          className={`new-job_posting-type-btn ${jobType === 'co-op' ? 'active' : 'disabled'}`}
          onClick={() => {
            setJobType('co-op');
          }}>
          Co-op
        </button>

        <button
          type='button'
          className={`new-job_posting-type-btn ${jobType === 'internship' ? 'active' : 'disabled'}`}
          onClick={() => {
            setJobType('internship');
          }}>
          Internship
        </button>
      </div>

      <label className='new-job_posting-checkbox'>
        <input type='checkbox' checked={active} onChange={() => setActive(!active)} />
        Active on Publish?
      </label>

      <button className='new-job_posting-btn' onClick={handleCreateJobPosting}>
        Create
      </button>

      {error && <p className='new-job_posting-error'>{error}</p>}
    </div>
  );
};

export default NewJobPostingPage;
