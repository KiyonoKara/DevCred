import { useState, ReactNode, useCallback } from 'react';
import { Toast } from '../components/notifications/ToastNotification';
import ToastContainer from '../components/notifications/ToastContainer';
import { ToastContext } from './ToastContext';

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Custom hook to provide toast notifications which are the 
 * dismissable notifications that show up in the corner of an app or website.
 */
const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Show the toast notification
  const showToast = useCallback((message: string, options?: Partial<Toast>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      id,
      message,
      type: options?.type || 'info',
      duration: options?.duration || 5000,
      onClick: options?.onClick,
    };

    setToasts(prev => [...prev, newToast]);
  }, []);

  // Dismiss a toast by ID
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export default ToastProvider;
