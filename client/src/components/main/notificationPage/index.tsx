import { useNavigate } from 'react-router-dom';
import useNotifications from '../../../hooks/useNotifications';
import './index.css';

/**
 * NotificationPage component displays all notifications for the user.
 * Users can view, mark as read, and clear all notifications.
 */
const NotificationPage = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleClearAll,
  } = useNotifications();

  const handleNotificationClick = (notification: (typeof notifications)[0]) => {
    // Mark as read if unread
    if (!notification.read) {
      handleMarkAsRead(notification._id.toString());
    }

    // Navigate based on notification type and relatedId
    if (notification.relatedId) {
      if (notification.type === 'dm') {
        navigate(`/messaging/direct-message?chatId=${notification.relatedId}`);
      } else if (notification.type === 'jobFair') {
        navigate(`/jobfairs/${notification.relatedId}`);
      } else if (notification.type === 'community') {
        // Assuming relatedId for community is questionId
        navigate(`/question/${notification.relatedId}`);
      }
    } else {
      // If no relatedId, just navigate to notifications page (already here)
      // or to a default page based on type
      if (notification.type === 'dm') {
        navigate('/messaging');
      } else if (notification.type === 'jobFair') {
        navigate('/jobfairs');
      } else if (notification.type === 'community') {
        navigate('/communities');
      }
    }
  };

  const handleClearAllWithConfirm = () => {
    if (
      window.confirm('Are you sure you want to clear all notifications? This cannot be undone.')
    ) {
      handleClearAll();
    }
  };

  return (
    <div className='notification-page'>
      <div className='notification-page-header'>
        <h1>Notifications</h1>
        <div className='notification-actions'>
          {unreadCount > 0 && (
            <button className='action-btn mark-all-read' onClick={handleMarkAllAsRead}>
              Mark All as Read
            </button>
          )}
          {notifications.length > 0 && (
            <button className='action-btn clear-all' onClick={handleClearAllWithConfirm}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {loading && <div className='loading-message'>Loading notifications...</div>}
      {error && <div className='error-message'>{error}</div>}

      {!loading && !error && notifications.length === 0 && (
        <div className='empty-notifications'>
          <p>You don't have any notifications.</p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className='notifications-list'>
          {notifications.map(notification => (
            <div
              key={notification._id.toString()}
              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
              onClick={() => handleNotificationClick(notification)}>
              <div className='notification-icon'>
                {notification.type === 'dm' && '💬'}
                {notification.type === 'jobFair' && '🏢'}
                {notification.type === 'community' && '👥'}
              </div>
              <div className='notification-content'>
                <div className='notification-title'>{notification.title}</div>
                <div className='notification-message'>{notification.message}</div>
                <div className='notification-time'>
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
              </div>
              {!notification.read && <div className='unread-indicator' />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationPage;
