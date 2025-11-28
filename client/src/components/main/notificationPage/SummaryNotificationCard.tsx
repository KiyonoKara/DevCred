import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatabaseNotification } from '@fake-stack-overflow/shared';
import { getSummaryBreakdown, SummaryBreakdown } from '../../../services/notificationService';
import { getMetaData } from '../../../tool';
import './SummaryNotificationCard.css';

interface SummaryNotificationCardProps {
  notification: DatabaseNotification;
  onMarkAsRead: (id: string) => void;
}

interface ParsedSummary {
  dmCount?: number;
  jobFairCount?: number;
  upcomingJobFairCount?: number;
  endedJobFairCount?: number;
  communityQuestionCount?: number;
  communityBreakdown?: { [communityName: string]: number };
}

/**
 * Parses the summary message to extract counts for different notification types.
 */
function parseSummaryMessage(message: string): ParsedSummary {
  const summary: ParsedSummary = {};

  // Remove "Summary: " prefix if present
  const cleanMessage = message.replace(/^Summary:\s*/, '');

  // Split by semicolons to get individual parts
  const parts = cleanMessage.split(';').map(p => p.trim());

  for (const part of parts) {
    // Parse DM messages: "X new DM message(s)"
    const dmMatch = part.match(/(\d+)\s+new\s+DM\s+message/i);
    if (dmMatch) {
      summary.dmCount = parseInt(dmMatch[1], 10);
      continue;
    }

    // Parse job fair updates: "X job fair update(s)"
    const jobFairMatch = part.match(/(\d+)\s+job\s+fair\s+update/i);
    if (jobFairMatch) {
      summary.jobFairCount = parseInt(jobFairMatch[1], 10);
      continue;
    }

    // Parse upcoming job fairs: "X job fair(s) starting soon"
    const upcomingMatch = part.match(/(\d+)\s+job\s+fair/i);
    if (upcomingMatch && part.includes('starting soon')) {
      summary.upcomingJobFairCount = parseInt(upcomingMatch[1], 10);
      continue;
    }

    // Parse ended job fairs: "X job fair(s) just ended"
    const endedMatch = part.match(/(\d+)\s+job\s+fair/i);
    if (endedMatch && part.includes('just ended')) {
      summary.endedJobFairCount = parseInt(endedMatch[1], 10);
      continue;
    }

    // Parse community questions: "X new question(s) in followed communities (Community1: 5, Community2: 3)"
    const communityMatch = part.match(/(\d+)\s+new\s+question/i);
    if (communityMatch && part.includes('followed communities')) {
      summary.communityQuestionCount = parseInt(communityMatch[1], 10);

      // Parse community breakdown from parentheses
      const breakdownMatch = part.match(/\(([^)]+)\)/);
      if (breakdownMatch) {
        summary.communityBreakdown = {};
        const breakdownStr = breakdownMatch[1];
        // Split by comma and parse "CommunityName: count"
        breakdownStr.split(',').forEach(item => {
          const [name, count] = item
            .trim()
            .split(':')
            .map(s => s.trim());
          if (name && count) {
            summary.communityBreakdown![name] = parseInt(count, 10);
          }
        });
      }
      continue;
    }
  }

  return summary;
}

/**
 * Component for displaying expandable summary notifications.
 */
const SummaryNotificationCard = ({ notification, onMarkAsRead }: SummaryNotificationCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [breakdown, setBreakdown] = useState<SummaryBreakdown | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const navigate = useNavigate();
  const parsed = parseSummaryMessage(notification.message);

  // Fetch breakdown when expanded
  useEffect(() => {
    if (isExpanded && !breakdown && !loadingBreakdown) {
      setLoadingBreakdown(true);
      getSummaryBreakdown(notification._id.toString())
        .then(data => {
          setBreakdown(data);
        })
        .catch(err => {
          // eslint-disable-next-line no-console
          console.error('Error fetching summary breakdown:', err);
        })
        .finally(() => {
          setLoadingBreakdown(false);
        });
    }
  }, [isExpanded, breakdown, loadingBreakdown, notification._id]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Mark as read when clicked/expanded
    if (!notification.read) {
      onMarkAsRead(notification._id.toString());
    }
    setIsExpanded(!isExpanded);
  };

  const totalJobFairCount =
    (parsed.jobFairCount || 0) +
    (parsed.upcomingJobFairCount || 0) +
    (parsed.endedJobFairCount || 0);

  return (
    <div
      className={`summary-notification-card ${notification.read ? 'read' : 'unread'}`}
      onClick={handleClick}>
      <div className='summary-notification-header'>
        <div className='summary-notification-icon'>📋</div>
        <div className='summary-notification-content'>
          <div className='summary-notification-title'>{notification.title}</div>
          <div className='summary-notification-time'>
            {new Date(notification.createdAt).toLocaleString()}
          </div>
        </div>
        <div className='summary-notification-expand'>{isExpanded ? '▼' : '▶'}</div>
        {!notification.read && <div className='unread-indicator' />}
      </div>

      {isExpanded && (
        <div className='summary-notification-sections'>
          {loadingBreakdown && <div className='summary-loading'>Loading details...</div>}

          {/* Job Fairs Section */}
          {totalJobFairCount > 0 && (
            <SummarySection
              title='Job Fairs'
              count={totalJobFairCount}
              icon='🏢'
              type='jobFair'
              jobFairs={breakdown?.jobFairs}
              onNavigate={jobFairId => {
                if (jobFairId) {
                  navigate(`/jobfairs/${jobFairId}`);
                } else {
                  navigate('/jobfairs');
                }
              }}
            />
          )}

          {/* DM Messages Section */}
          {parsed.dmCount && parsed.dmCount > 0 && (
            <SummarySection
              title='Direct Messages'
              count={parsed.dmCount}
              icon='💬'
              type='dm'
              dmMessages={breakdown?.dmMessages}
              onNavigate={chatId => {
                if (chatId) {
                  // Check if this chat is deleted
                  const chatData = breakdown?.dmMessages?.[chatId];
                  if (chatData?.isDeleted) {
                    alert('This chatroom has been deleted and is no longer available.');
                    return;
                  }
                  navigate(`/messaging/direct-message?chatId=${chatId}`);
                } else {
                  navigate('/messaging/direct-message');
                }
              }}
            />
          )}

          {/* Community Questions Section */}
          {parsed.communityQuestionCount && parsed.communityQuestionCount > 0 && (
            <SummarySection
              title='Community Questions'
              count={parsed.communityQuestionCount}
              icon='👥'
              type='community'
              communityQuestions={breakdown?.communityQuestions}
              onNavigate={questionId => {
                if (questionId) {
                  navigate(`/question/${questionId}`);
                } else {
                  navigate('/communities');
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

interface SummarySectionProps {
  title: string;
  count: number;
  icon: string;
  type: 'dm' | 'community' | 'jobFair';
  dmMessages?: SummaryBreakdown['dmMessages'];
  communityQuestions?: SummaryBreakdown['communityQuestions'];
  jobFairs?: SummaryBreakdown['jobFairs'];
  onNavigate?: (id?: string) => void;
}

/**
 * Component for individual sections within a summary notification.
 */
const SummarySection = ({
  title,
  count,
  icon,
  type,
  dmMessages,
  communityQuestions,
  jobFairs,
  onNavigate,
}: SummarySectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleViewAllClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate();
    }
  };

  const handleItemClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onNavigate) {
      onNavigate(id);
    }
  };

  return (
    <div className='summary-section'>
      <div className='summary-section-header' onClick={handleSectionClick}>
        <span className='summary-section-icon'>{icon}</span>
        <span className='summary-section-title'>
          {title}: {count} new {count === 1 ? 'item' : 'items'}
        </span>
        <span className='summary-section-expand'>{isExpanded ? '▼' : '▶'}</span>
      </div>
      {isExpanded && (
        <div className='summary-section-content'>
          {/* DM Messages Breakdown */}
          {type === 'dm' && dmMessages && Object.keys(dmMessages).length > 0 && (
            <div className='summary-section-breakdown'>
              {Object.entries(dmMessages).map(([chatId, data]) => (
                <div
                  key={chatId}
                  className={`breakdown-item clickable ${data.isDeleted ? 'deleted' : ''}`}
                  onClick={e => handleItemClick(e, chatId)}
                  title={data.isDeleted ? 'This chatroom has been deleted' : undefined}>
                  <span className='breakdown-name'>
                    {data.otherUser}
                    {data.isDeleted && ' (Deleted)'}
                  </span>
                  <span className='breakdown-count'>
                    {data.count} message{data.count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Community Questions Breakdown */}
          {type === 'community' &&
            communityQuestions &&
            Object.keys(communityQuestions).length > 0 && (
              <div className='summary-section-breakdown'>
                {Object.entries(communityQuestions).map(([communityId, data]) => (
                  <div key={communityId} className='community-group'>
                    <div className='community-header'>
                      <span className='community-name'>{data.communityName}</span>
                      <span className='community-count'>
                        {data.count} question{data.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className='questions-list'>
                      {data.questions.map(question => (
                        <div
                          key={question._id}
                          className='question-item clickable'
                          onClick={e => handleItemClick(e, question._id)}>
                          <div className='question-title'>{question.title}</div>
                          <div className='question-meta'>
                            by {question.askedBy} • {getMetaData(new Date(question.askDateTime))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

          {/* Job Fairs Breakdown */}
          {type === 'jobFair' && jobFairs && jobFairs.length > 0 && (
            <div className='summary-section-breakdown'>
              {jobFairs.map(jobFair => (
                <div
                  key={jobFair._id}
                  className='breakdown-item clickable'
                  onClick={e => handleItemClick(e, jobFair._id)}>
                  <span className='breakdown-name'>{jobFair.title}</span>
                  <span className='breakdown-count'>{jobFair.status}</span>
                </div>
              ))}
            </div>
          )}

          <div className='summary-section-footer'>
            <button className='view-all-btn' onClick={handleViewAllClick}>
              View All {title}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryNotificationCard;
