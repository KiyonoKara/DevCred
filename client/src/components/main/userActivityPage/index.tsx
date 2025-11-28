import { Link } from 'react-router-dom';
import useUserActivityPage from '../../../hooks/useUserActivityPage';
import './index.css';
import PaginationControls from './PaginationControls';

const UserActivityPage = () => {
  const {
    loading,
    error,
    activity,
    searchQuery,
    setSearchQuery,
    questionSort,
    answerSort,
    setQuestionSort,
    setAnswerSort,
    sortedQuestions,
    sortedAnswers,
    handleGoToSettings,
    handleSendMessage,
    canEditProfile,
    canViewDetails,
    handleDeleteQuestion,
    handleDeleteAnswer,
    showAllQuestions,
    setShowAllQuestions,
    showAllAnswers,
    setShowAllAnswers,
    questionMeta,
    answerMeta,
  } = useUserActivityPage();

  if (loading) {
    return <div className='user-activity-page'>Loading user activity...</div>;
  }

  if (error) {
    return <div className='user-activity-page error-state'>{error}</div>;
  }

  if (!activity) {
    return <div className='user-activity-page error-state'>No activity data available.</div>;
  }

  const { profile, summary, visibility } = activity;

  return (
    <div className='user-activity-page'>
      <div className='user-activity-container'>
        <div className='user-activity-header'>
          <div>
            <h1>{profile.username}</h1>
            {profile.dateJoined && (
              <p className='user-activity-joined'>
                Joined {new Date(profile.dateJoined).toLocaleDateString()}
              </p>
            )}
            {canViewDetails && (
              <p className='user-activity-joined'>User Points: {activity.userPoints || 0}</p>
            )}
            {canViewDetails && (
              <p className='user-activity-bio'>
                {profile.biography?.trim() ? profile.biography : 'No biography available.'}
              </p>
            )}
          </div>
          <div className='user-activity-header-actions'>
            {canEditProfile && (
              <button className='user-activity-settings-button' onClick={handleGoToSettings}>
                Go to Settings
              </button>
            )}
            {!canEditProfile && (
              <button className='user-activity-message-button' onClick={handleSendMessage}>
                Send Message
              </button>
            )}
          </div>
        </div>

        {canViewDetails && (
          <div className='user-activity-summary'>
            <div className='summary-card'>
              <p className='summary-count'>{summary.totalQuestions}</p>
              <p className='summary-label'>Questions Asked</p>
            </div>
            <div className='summary-card'>
              <p className='summary-count'>{summary.totalAnswers}</p>
              <p className='summary-label'>Answers Posted</p>
            </div>
          </div>
        )}
        {!canViewDetails && visibility === 'public-metrics-only' && (
          <div className='user-activity-summary'>
            <div className='summary-card'>
              <p className='summary-count'>{summary.totalQuestions}</p>
              <p className='summary-label'>Questions Asked</p>
            </div>
            <div className='summary-card'>
              <p className='summary-count'>{summary.totalAnswers}</p>
              <p className='summary-label'>Answers Posted</p>
            </div>
          </div>
        )}

        {canViewDetails && (
          <div className='user-activity-search'>
            <input
              type='text'
              placeholder='Search questions and answers...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='user-activity-search-input'
            />
            {searchQuery && (
              <button
                type='button'
                className='user-activity-search-clear'
                onClick={() => setSearchQuery('')}
                aria-label='Clear search'>
                ✕
              </button>
            )}
          </div>
        )}

        {!canViewDetails && (
          <div className='user-activity-notice'>
            {visibility === 'private'
              ? 'This user keeps their activity private.'
              : 'This user shares only aggregate activity metrics.'}
          </div>
        )}

        {canViewDetails && (
          <>
            <section className='user-activity-section'>
              <div className='section-header'>
                <h2>Questions</h2>
                <label className='section-filter'>
                  Sort by:{' '}
                  <select
                    value={questionSort}
                    onChange={event =>
                      setQuestionSort(event.target.value as 'newest' | 'oldest' | 'mostViewed')
                    }>
                    <option value='newest'>Newest to Oldest</option>
                    <option value='oldest'>Oldest to Newest</option>
                    <option value='mostViewed'>Most to Least Viewed</option>
                  </select>
                </label>
              </div>
              {sortedQuestions.length === 0 ? (
                <p className='user-activity-empty'>No questions posted yet.</p>
              ) : (
                <ul className='user-activity-list'>
                  {sortedQuestions.map(question => (
                    <li key={question.id} className='user-activity-item'>
                      <div className='item-main'>
                        <div className='item-header'>
                          <Link to={`/question/${question.id}`} className='item-title'>
                            {question.title}
                          </Link>
                          {canEditProfile && (
                            <button
                              type='button'
                              className='user-activity-delete-button'
                              onClick={() => handleDeleteQuestion(question.id)}>
                              Delete
                            </button>
                          )}
                        </div>
                        <div className='item-meta'>
                          <span>Asked {new Date(question.askDateTime).toLocaleString()}</span>
                          <span>{question.viewsCount} views</span>
                          <span>{question.answersCount} answers</span>
                        </div>
                      </div>
                      {question.tags.length > 0 && (
                        <div className='item-tags'>
                          {question.tags.map(tag => (
                            <span key={String(tag._id)} className='tag-pill'>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!showAllQuestions && questionMeta.totalItems > 3 && (
                <div className='section-actions'>
                  <button
                    type='button'
                    className='user-activity-secondary-button'
                    onClick={() => setShowAllQuestions(true)}>
                    See more questions
                  </button>
                </div>
              )}
              {showAllQuestions && questionMeta.totalPages > 1 && (
                <PaginationControls
                  currentPage={questionMeta.currentPage}
                  totalPages={questionMeta.totalPages}
                  onPageChange={questionMeta.onPageChange}
                />
              )}
              {showAllQuestions && questionMeta.totalItems > 3 && (
                <div className='section-actions'>
                  <button
                    type='button'
                    className='user-activity-secondary-button'
                    onClick={() => setShowAllQuestions(false)}>
                    Show fewer questions
                  </button>
                </div>
              )}
            </section>

            <section className='user-activity-section'>
              <div className='section-header'>
                <h2>Answers</h2>
                <label className='section-filter'>
                  Sort by:{' '}
                  <select
                    value={answerSort}
                    onChange={event => setAnswerSort(event.target.value as 'newest' | 'oldest')}>
                    <option value='newest'>Newest to Oldest</option>
                    <option value='oldest'>Oldest to Newest</option>
                  </select>
                </label>
              </div>
              {sortedAnswers.length === 0 ? (
                <p className='user-activity-empty'>No answers posted yet.</p>
              ) : (
                <ul className='user-activity-list'>
                  {sortedAnswers.map(answer => (
                    <li key={answer.id} className='user-activity-item'>
                      <div className='item-main'>
                        <div className='item-header'>
                          {answer.question ? (
                            <Link to={`/question/${answer.question.id}`} className='item-title'>
                              Answer to: {answer.question.title}
                            </Link>
                          ) : (
                            <span className='item-title'>Answer (question unavailable)</span>
                          )}
                          {canEditProfile && (
                            <button
                              type='button'
                              className='user-activity-delete-button'
                              onClick={() => handleDeleteAnswer(answer.id)}>
                              Delete
                            </button>
                          )}
                        </div>
                        <div className='item-meta'>
                          <span>Answered {new Date(answer.ansDateTime).toLocaleString()}</span>
                          {answer.question && (
                            <span>{answer.question.viewsCount} question views</span>
                          )}
                          <span>{answer.commentsCount} comments</span>
                        </div>
                        <p className='answer-preview'>
                          {answer.text.length > 200 ? `${answer.text.slice(0, 200)}…` : answer.text}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!showAllAnswers && answerMeta.totalItems > 3 && (
                <div className='section-actions'>
                  <button
                    type='button'
                    className='user-activity-secondary-button'
                    onClick={() => setShowAllAnswers(true)}>
                    See more answers
                  </button>
                </div>
              )}
              {showAllAnswers && answerMeta.totalPages > 1 && (
                <PaginationControls
                  currentPage={answerMeta.currentPage}
                  totalPages={answerMeta.totalPages}
                  onPageChange={answerMeta.onPageChange}
                />
              )}
              {showAllAnswers && answerMeta.totalItems > 3 && (
                <div className='section-actions'>
                  <button
                    type='button'
                    className='user-activity-secondary-button'
                    onClick={() => setShowAllAnswers(false)}>
                    Show fewer answers
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default UserActivityPage;
