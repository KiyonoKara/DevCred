import { useEffect, useState } from 'react';
import './ToastNotification.css';

export interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onClick?: () => void;
}

interface ToastNotificationProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

/**
 * ToastNotification component displays a single notification with auto-dismiss timer and progress bar.
 * Features:
 * - Auto-dismisses after specified duration (default 5 seconds)
 * - Visual progress bar showing time remaining
 * - Click to dismiss manually
 * - Different styles based on type (info, success, warning, error)
 * - Optional onClick handler for navigation
 */
const ToastNotification = ({ toast, onDismiss }: ToastNotificationProps) => {
  const { id, message, type = 'info', duration = 5000, onClick } = toast;
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration);

    const dismissTimer = setTimeout(() => {
      onDismiss(id);
    }, duration + 300); // Extra time for exit animation

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [id, duration, onDismiss]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 300);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 300);
  };

  return (
    <div
      className={`toast-notification toast-${type} ${isExiting ? 'toast-exit' : ''} ${onClick ? 'toast-clickable' : ''}`}
      onClick={onClick ? handleClick : undefined}
      role='alert'
      aria-live='polite'>
      <div className='toast-content'>
        <div className='toast-icon'>{getIcon(type)}</div>
        <div className='toast-message'>{message}</div>
        <button className='toast-dismiss' onClick={handleDismiss} aria-label='Dismiss notification'>
          ✕
        </button>
      </div>
      <div className='toast-progress' style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
};

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return '✓';
    case 'warning':
      return '⚠';
    case 'error':
      return '✕';
    case 'info':
    default:
      return 'ℹ';
  }
};

export default ToastNotification;
