import { createContext } from 'react';
import { Toast } from '../components/notifications/ToastNotification';

export interface ToastContextType {
  showToast: (message: string, options?: Partial<Toast>) => void;
  dismissToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
