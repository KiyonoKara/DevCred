import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import useJobFairPage from '../../../../hooks/useJobFairPage';
import jobFairService from '../../../../services/jobFairService';
import JobFairChatPage from '../jobFairChatPage/index';
import CodingTournamentPage from '../codingTournamentPage/index';
import './index.css';

// JobFairDetailPage component for showing details of a job fair
const JobFairDetailPage = () => {
  const { jobFairId } = useParams<{ jobFairId: string }>();
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const {
    jobFair,
    loading,
    error,
    isParticipant,
    isHost,
    activeTab,
    setActiveTab,
    handleJoinJobFair,
    handleLeaveJobFair,
    handleStartJobFair,
    handleEndJobFair,
  } = useJobFairPage();

  const handleDeleteJobFair = async () => {
    if (!jobFairId || !isHost) return;

    // Confirm deletion
    const confirmed = window.confirm(
      'Are you sure you want to delete this job fair? This action cannot be undone.',
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);
      await jobFairService.deleteJobFair(jobFairId);
      // Redirect to job fairs list after successful deletion
      navigate('/jobfairs');
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed to delete job fair');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className='job-fair-detail-page'>
        <div className='loading-spinner'>Loading job fair details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='job-fair-detail-page'>
        <div className='job-fair-error'>{error}</div>
      </div>
    );
  }

  if (!jobFair) {
    return (
      <div className='job-fair-detail-page'>
        <div className='job-fair-error'>Job fair not found</div>
      </div>
    );
  }

  return (
    <div className='job-fair-detail-page'>
      <div className='job-fair-detail-header'>
        <div className='job-fair-detail-title-section'>
          <h1 className='job-fair-detail-title'>{jobFair.title}</h1>
          <span className={`job-fair-status status-${jobFair.status}`}>{jobFair.status}</span>
        </div>

        <div className='job-fair-detail-actions'>
          {isHost ? (
            <>
              {jobFair.status === 'upcoming' && (
                <>
                  <button className='action-btn btn-primary' onClick={handleStartJobFair}>
                    Start Job Fair
                  </button>
                  <button
                    className='action-btn btn-danger'
                    onClick={handleDeleteJobFair}
                    disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Delete Job Fair'}
                  </button>
                </>
              )}
              {jobFair.status === 'live' && (
                <button className='action-btn btn-danger' onClick={handleEndJobFair}>
                  End Job Fair
                </button>
              )}
              {jobFair.status === 'ended' && (
                <button
                  className='action-btn btn-danger'
                  onClick={handleDeleteJobFair}
                  disabled={isDeleting}>
                  {isDeleting ? 'Deleting...' : 'Delete Job Fair'}
                </button>
              )}
              {deleteError && <div className='job-fair-error'>{deleteError}</div>}
            </>
          ) : (
            <>
              {!isParticipant && jobFair.status !== 'ended' && (
                <button className='action-btn btn-primary' onClick={handleJoinJobFair}>
                  Join Job Fair
                </button>
              )}
              {isParticipant && jobFair.status === 'live' && (
                <button className='action-btn btn-secondary' onClick={handleLeaveJobFair}>
                  Leave Job Fair
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className='job-fair-detail-info'>
        <div className='info-section'>
          <h3>About this Job Fair</h3>
          <p className='job-fair-description'>{jobFair.description}</p>
        </div>

        <div className='info-grid'>
          <div className='info-item'>
            <label>Host</label>
            <p>{jobFair.hostUsername}</p>
          </div>
          <div className='info-item'>
            <label>Scheduled Date</label>
            <p>{new Date(jobFair.startTime).toLocaleString()}</p>
          </div>
          <div className='info-item'>
            <label>Participants</label>
            <p>{jobFair.participants.length}</p>
          </div>
          <div className='info-item'>
            <label>Visibility</label>
            <p className={`visibility-badge visibility-${jobFair.visibility}`}>
              {jobFair.visibility}
            </p>
          </div>
        </div>

        {jobFair.visibility === 'invite-only' && jobFair.invitedUsers && (
          <div className='info-section'>
            <h3>Invited Users</h3>
            <div className='invited-users-list'>
              {jobFair.invitedUsers.map(username => (
                <div key={username} className='invited-user-badge'>
                  {username}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className='info-section'>
          <h3>Participants ({jobFair.participants.length})</h3>
          <div className='participants-list'>
            {jobFair.participants.map(participant => (
              <div key={participant} className='participant-item'>
                {participant}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='job-fair-tabs'>
        <div className='tabs-header'>
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}>
            📋 Overview
          </button>
          {(isParticipant || isHost) && (
            <>
              <button
                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}>
                💬 Live Chat
              </button>
              {jobFair.codingTournamentEnabled && (
                <button
                  className={`tab-btn ${activeTab === 'tournament' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tournament')}>
                  🏆 Coding Tournament
                </button>
              )}
            </>
          )}
        </div>

        <div className='tabs-content'>
          {activeTab === 'overview' && (
            <div className='overview-content'>
              <p>Join the event above to participate in live chat and coding tournaments!</p>
            </div>
          )}
          {activeTab === 'chat' && jobFairId && (
            <div>
              <JobFairChatPage jobFairId={jobFairId} jobFairStatus={jobFair.status} />
            </div>
          )}
          {activeTab === 'tournament' && jobFairId && jobFair.codingTournamentEnabled && (
            <div>
              <CodingTournamentPage jobFairId={jobFairId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobFairDetailPage;
