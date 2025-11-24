import useJobFairListPage from '../../../../hooks/useJobFairListPage';
import './index.css';

// JobFairListPage component displays a list of available job fairs.
// Users can filter by status and visibility, and navigate to individual fairs.
const JobFairListPage = () => {
  const {
    jobFairs,
    loading,
    error,
    isRecruiter,
    statusFilter,
    visibilityFilter,
    myOrganizationOnly,
    setStatusFilter,
    setVisibilityFilter,
    setMyOrganizationOnly,
    handleViewJobFair,
    handleCreateJobFair,
  } = useJobFairListPage();
  if (loading) {
    return (
      <div className='job-fair-page'>
        <p>Loading job fairs...</p>
      </div>
    );
  }

  return (
    <div className='job-fair-page'>
      <div className='job-fair-header'>
        <h1 className='job-fair-title'>Explore Job Fairs</h1>
        {/* Do not show this button to regular (talent) users, but is disabled for good measure */}
        {isRecruiter && (
          <button
            className='job-fair-create-btn'
            onClick={handleCreateJobFair}
            disabled={!isRecruiter}>
            Create Job Fair
          </button>
        )}
      </div>

      {error && <div className='job-fair-error'>{error}</div>}

      <div className='job-fair-filters'>
        <div className='filter-group'>
          <label htmlFor='status-filter'>Status:</label>
          <select
            id='status-filter'
            value={statusFilter}
            onChange={e =>
              setStatusFilter(e.target.value as 'all' | 'upcoming' | 'live' | 'ended')
            }>
            <option value='all'>All</option>
            <option value='upcoming'>Upcoming</option>
            <option value='live'>Live</option>
            <option value='ended'>Ended</option>
          </select>
        </div>

        <div className='filter-group'>
          <label htmlFor='visibility-filter'>Visibility:</label>
          <select
            id='visibility-filter'
            value={visibilityFilter}
            onChange={e => setVisibilityFilter(e.target.value as 'all' | 'public' | 'invite-only')}>
            <option value='all'>All</option>
            <option value='public'>Public</option>
            <option value='invite-only'>Invite-Only</option>
          </select>
        </div>

        {isRecruiter && (
          <div className='filter-group filter-checkbox-group'>
            <label htmlFor='my-organization-filter' className='checkbox-label'>
              <input
                id='my-organization-filter'
                type='checkbox'
                checked={myOrganizationOnly}
                onChange={e => setMyOrganizationOnly(e.target.checked)}
                className='filter-checkbox'
              />
              <span>Published by my organization</span>
            </label>
          </div>
        )}
      </div>

      {jobFairs.length === 0 ? (
        <div className='no-job-fairs'>
          <p>No job fairs found matching your filters.</p>
        </div>
      ) : (
        <div className='job-fair-list'>
          {jobFairs.map(jobFair => (
            <div
              key={jobFair._id.toString()}
              className='job-fair-card'
              onClick={() => handleViewJobFair(jobFair._id.toString())}>
              <div className='job-fair-card-header'>
                <h2 className='job-fair-name'>{jobFair.title}</h2>
                <span className={`job-fair-status status-${jobFair.status}`}>
                  {jobFair.status.charAt(0).toUpperCase() + jobFair.status.slice(1)}
                </span>
              </div>

              <p className='job-fair-description'>{jobFair.description}</p>

              <div className='job-fair-meta'>
                <p className='job-fair-host'>
                  <strong>Hosted by:</strong> {jobFair.hostUsername}
                </p>
                <p className='job-fair-date'>
                  <strong>Scheduled:</strong> {new Date(jobFair.startTime).toLocaleDateString()}{' '}
                  {new Date(jobFair.startTime).toLocaleTimeString()}
                </p>
                <p className='job-fair-participants'>
                  <strong>Participants:</strong> {jobFair.participants.length}
                </p>
              </div>

              <span className={`job-fair-visibility visibility-${jobFair.visibility}`}>
                {jobFair.visibility === 'public' ? 'Public' : 'Invite-Only'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobFairListPage;
