import { useState } from 'react';
import useJobFairPage from '../../../../hooks/useJobFairPage';
import useCodingTournament from '../../../../hooks/useCodingTournament';
import './index.css';

interface CodingTournamentPageProps {
  jobFairId: string;
}

/**
 * CodingTournamentPage component allows participants to submit code
 * and recruiters to grade submissions for a coding tournament.
 */
const CodingTournamentPage = ({ jobFairId }: CodingTournamentPageProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
  const { jobFair } = useJobFairPage();
  const {
    code,
    setCode,
    submissions,
    submissionStatus,
    error,
    isHost,
    isRecruiter,
    handleSubmitCode,
    handleAcceptSubmission,
    acceptedSubmission,
    setAcceptedSubmission,
    dmMessage,
    setDmMessage,
    handleSendDMToApplicant,
    isSendingDM,
  } = useCodingTournament(jobFairId, jobFair);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      await handleSubmitCode();
    }
  };

  return (
    <div className='coding-tournament-page'>
      <div className='tournament-layout'>
        <div className='tournament-container'>
          {!isRecruiter && (
            <div className='code-submission-section'>
              <h3>Code Submission</h3>
              {error && <div className='submission-error'>{error}</div>}
              {submissionStatus === 'success' && (
                <div className='submission-success'>Code submitted successfully!</div>
              )}

              <form onSubmit={handleSubmit} className='submission-form'>
                <div className='form-group'>
                  <label htmlFor='language-select'>Programming Language</label>
                  <select
                    id='language-select'
                    value={selectedLanguage}
                    onChange={e => setSelectedLanguage(e.target.value)}
                    className='language-select'>
                    <option value='javascript'>JavaScript</option>
                    <option value='python'>Python</option>
                    <option value='java'>Java</option>
                    <option value='cpp'>C++</option>
                    <option value='csharp'>C#</option>
                    <option value='typescript'>TypeScript</option>
                  </select>
                </div>

                <div className='form-group'>
                  <label htmlFor='code-input'>Your Code</label>
                  <textarea
                    id='code-input'
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder='Paste your code here...'
                    className='code-input'
                    rows={12}
                  />
                </div>

                <button type='submit' className='submit-btn' disabled={!code.trim()}>
                  Submit Code
                </button>
              </form>
            </div>
          )}

          <div className='submissions-section'>
            <h3>Submissions ({submissions.length})</h3>
            {submissions.length === 0 ? (
              <div className='no-submissions'>No submissions yet</div>
            ) : (
              <div className='submissions-list'>
                {submissions.map((sub, idx) => (
                  <div key={idx} className='submission-card'>
                    <div className='submission-header'>
                      <div className='submission-info'>
                        <span className='submission-by'>{sub.submittedBy || 'Unknown'}</span>
                        <span className='submission-time'>
                          {new Date(sub.submittedAt).toLocaleString()}
                        </span>
                      </div>
                      {sub.grade === 100 && <div className='submission-accepted'>Accepted</div>}
                      {sub.grade && sub.grade !== 100 && (
                        <div className='submission-grade'>
                          Grade: <span className='grade-value'>{sub.grade}</span>
                        </div>
                      )}
                    </div>

                    <div className='submission-language'>
                      <span className='language-badge'>{sub.language || 'Unknown'}</span>
                    </div>

                    <div className='submission-code'>
                      <code>{sub.code}</code>
                    </div>

                    {sub.feedback && (
                      <div className='submission-feedback'>
                        <strong>Feedback:</strong> {sub.feedback}
                      </div>
                    )}

                    {isHost && sub.grade !== 100 && (
                      <div className='submission-actions'>
                        <button
                          className='accept-submission-btn'
                          onClick={() => handleAcceptSubmission(sub)}>
                          Accept this submission
                        </button>
                      </div>
                    )}

                    {sub.gradedBy && (
                      <div className='submission-graded-by'>
                        Graded by: <span>{sub.gradedBy}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {acceptedSubmission && (
          <div className='accept-submission-panel'>
            <div className='panel-header'>
              <h3>Contact Applicant</h3>
              <button
                className='close-panel-btn'
                onClick={() => {
                  setAcceptedSubmission(null);
                  setDmMessage('');
                }}>
                ×
              </button>
            </div>
            <div className='panel-content'>
              <div className='applicant-info'>
                <p>
                  <strong>Applicant:</strong> {acceptedSubmission.submittedBy || 'Unknown'}
                </p>
                <p>
                  <strong>Language:</strong> {acceptedSubmission.language || 'Unknown'}
                </p>
              </div>
              <div className='dm-form'>
                <label htmlFor='dm-message'>Message to Applicant:</label>
                <textarea
                  id='dm-message'
                  className='dm-message-input'
                  value={dmMessage}
                  onChange={e => setDmMessage(e.target.value)}
                  placeholder='Enter your message asking for their resume...'
                  rows={6}
                />
                <button
                  className='dm-send-btn'
                  onClick={handleSendDMToApplicant}
                  disabled={!dmMessage.trim() || isSendingDM}>
                  {isSendingDM ? 'Sending...' : 'DM to this applicant'}
                </button>
              </div>
              {error && <div className='panel-error'>{error}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodingTournamentPage;
