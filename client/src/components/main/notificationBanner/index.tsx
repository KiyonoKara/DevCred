import { DatabaseNotification } from '@fake-stack-overflow/shared';
import { useNavigate } from 'react-router-dom';
import './index.css';

interface NotificationBannerProps {
  notification: DatabaseNotification | null;
  onDismiss: () => void;
}

/**
 * NotificationBanner component displays a pop-up notification at the bottom right.
 * Auto-dismisses after 5 seconds or can be manually dismissed.
 */
const NotificationBanner = ({ notification, onDismiss }: NotificationBannerProps) => {
  const navigate = useNavigate();

  if (!notification) return null;

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'dm':
        return '💬';
      case 'jobFair':
        return '🏢';
      case 'community':
        return '👥';
      default:
        return '🔔';
    }
  };

  const handleBannerClick = () => {
    // Navigate based on notification type and relatedId
    if (notification.relatedId) {
      if (notification.type === 'dm') {
        navigate(`/messaging/direct-message?chatId=${notification.relatedId}`);
      } else if (notification.type === 'jobFair') {
        navigate(`/jobfairs/${notification.relatedId}`);
      } else if (notification.type === 'community') {
        navigate(`/question/${notification.relatedId}`);
      }
    } else {
      // If no relatedId, navigate to default page based on type
      if (notification.type === 'dm') {
        navigate('/messaging');
      } else if (notification.type === 'jobFair') {
        navigate('/jobfairs');
      } else if (notification.type === 'community') {
        navigate('/communities');
      }
    }
    onDismiss();
  };

  return (
    <div className='notification-banner'>
      <div className='notification-banner-content' onClick={handleBannerClick}>
        <div className='notification-banner-icon'>{getNotificationIcon()}</div>
        <div className='notification-banner-text'>
          <div className='notification-banner-title'>{notification.title}</div>
          <div className='notification-banner-message'>{notification.message}</div>
        </div>
        <button
          className='notification-banner-close'
          onClick={e => {
            e.stopPropagation();
            onDismiss();
          }}>
          ×
        </button>
      </div>
    </div>
  );
};

export default NotificationBanner;

