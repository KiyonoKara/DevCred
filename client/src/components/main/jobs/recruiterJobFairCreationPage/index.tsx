import useRecruiterJobFairCreationPage from '../../../../hooks/useRecruiterJobFairCreationPage';
import './index.css';

// RecruiterJobFairCreationPage component allows recruiters to create new job fairs
// Includes form for details, date scheduling, and inviting users.
const RecruiterJobFairCreationPage = () => {
  const {
    title,
    setTitle,
    description,
    setDescription,
    visibility,
    setVisibility,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    codingTournamentEnabled,
    setCodingTournamentEnabled,
    invitedUsers,
    currentInviteInput,
    setCurrentInviteInput,
    loading,
    error,
    handleAddInvite,
    handleRemoveInvite,
    handleCreateJobFair,
    handleResetForm,
  } = useRecruiterJobFairCreationPage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleCreateJobFair();
  };

  return (
    <div className='recruiter-creation-page'>
      <div className='creation-container'>
        <div className='creation-header'>
          <h1>Create a New Job Fair</h1>
          <p>Schedule a job fair event to connect with talented developers</p>
        </div>

        <form onSubmit={handleSubmit} className='creation-form'>
          {error && <div className='form-error'>{error}</div>}

          <div className='form-section'>
            <h2>Job Fair Details</h2>

            <div className='form-group'>
              <label htmlFor='title'>
                Job Fair Title <span className='required'>*</span>
              </label>
              <input
                id='title'
                type='text'
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder='e.g., Summer Internship Fair 2025'
                className='form-input'
              />
              <span className='char-count'>{title.length}/100</span>
            </div>

            <div className='form-group'>
              <label htmlFor='description'>
                Description <span className='required'>*</span>
              </label>
              <textarea
                id='description'
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder='Describe the job fair, what positions are available, and any special requirements...'
                className='form-textarea'
                rows={6}
              />
              <span className='char-count'>{description.length}/500</span>
            </div>

            <div className='form-row'>
              <div className='form-group'>
                <label htmlFor='start-time'>
                  Start Time <span className='required'>*</span>
                </label>
                <input
                  id='start-time'
                  type='datetime-local'
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className='form-input'
                />
              </div>

              <div className='form-group'>
                <label htmlFor='end-time'>
                  End Time <span className='required'>*</span>
                </label>
                <input
                  id='end-time'
                  type='datetime-local'
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className='form-input'
                />
              </div>

              <div className='form-group'>
                <label htmlFor='visibility'>Visibility</label>
                <select
                  id='visibility'
                  value={visibility}
                  onChange={e => setVisibility(e.target.value as 'public' | 'invite-only')}
                  className='form-select'>
                  <option value='public'>Public</option>
                  <option value='invite-only'>Invite-Only</option>
                </select>
              </div>

              <div className='form-group checkbox-group'>
                <label htmlFor='coding-tournament'>
                  <input
                    id='coding-tournament'
                    type='checkbox'
                    checked={codingTournamentEnabled}
                    onChange={e => setCodingTournamentEnabled(e.target.checked)}
                  />
                  Enable Coding Tournament
                </label>
                <p className='checkbox-description'>
                  Allow participants to submit and compete in coding challenges during the job fair
                </p>
              </div>
            </div>
          </div>

          {visibility === 'invite-only' && (
            <div className='form-section'>
              <h2>Invite Users</h2>
              <p className='section-description'>
                Add users who should be invited to this job fair
              </p>

              <div className='invite-input-group'>
                <input
                  type='text'
                  value={currentInviteInput}
                  onChange={e => setCurrentInviteInput(e.target.value)}
                  placeholder='Enter username'
                  className='form-input'
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInvite();
                    }
                  }}
                />
                <button type='button' onClick={handleAddInvite} className='add-invite-btn'>
                  Add User
                </button>
              </div>

              {invitedUsers.length > 0 && (
                <div className='invited-users'>
                  <h3>Invited Users ({invitedUsers.length})</h3>
                  <div className='user-tags'>
                    {invitedUsers.map(user => (
                      <div key={user} className='user-tag'>
                        {user}
                        <button
                          type='button'
                          onClick={() => handleRemoveInvite(user)}
                          className='remove-user-btn'
                          aria-label={`Remove ${user}`}>
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className='form-actions'>
            <button type='button' onClick={handleResetForm} className='btn-secondary'>
              Clear Form
            </button>
            <button type='submit' className='btn-primary' disabled={loading}>
              {loading ? 'Creating...' : 'Create Job Fair'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecruiterJobFairCreationPage;
