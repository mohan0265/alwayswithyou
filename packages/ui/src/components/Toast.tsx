import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export interface ToastProps {
  /** Unique identifier for the toast */
  id: string;
  /** Toast message */
  message: string;
  /** Toast type affecting styling and icon */
  type?: 'success' | 'error' | 'warning' | 'info';
  /** Duration in milliseconds before auto-dismiss (0 = no auto-dismiss) */
  duration?: number;
  /** Whether the toast can be dismissed manually */
  dismissible?: boolean;
  /** Callback when toast is dismissed */
  onDismiss?: (id: string) => void;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Custom positioning */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-600',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-600',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600',
  },
};

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type = 'info',
  duration = 5000,
  dismissible = true,
  onDismiss,
  action,
  position = 'top-right',
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const config = typeConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.(id);
    }, 300); // Wait for exit animation
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  const slideVariants = {
    initial: {
      opacity: 0,
      x: position.includes('right') ? 100 : position.includes('left') ? -100 : 0,
      y: position.includes('top') ? -20 : position.includes('bottom') ? 20 : 0,
      scale: 0.95,
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
    exit: {
      opacity: 0,
      x: position.includes('right') ? 100 : position.includes('left') ? -100 : 0,
      y: position.includes('top') ? -20 : position.includes('bottom') ? 20 : 0,
      scale: 0.95,
      transition: {
        duration: 0.2,
      },
    },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={clsx(
            'fixed z-50 max-w-sm w-full pointer-events-auto',
            getPositionClasses()
          )}
          variants={slideVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          layout
        >
          <div
            className={clsx(
              'rounded-lg border shadow-lg p-4',
              config.bgColor,
              config.borderColor
            )}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Icon className={clsx('w-5 h-5', config.iconColor)} />
              </div>
              
              <div className="ml-3 flex-1">
                <p className={clsx('text-sm font-medium', config.textColor)}>
                  {message}
                </p>
                
                {action && (
                  <div className="mt-2">
                    <button
                      className={clsx(
                        'text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded',
                        config.textColor
                      )}
                      onClick={action.onClick}
                    >
                      {action.label}
                    </button>
                  </div>
                )}
              </div>

              {dismissible && (
                <div className="ml-4 flex-shrink-0">
                  <button
                    className={clsx(
                      'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 hover:bg-opacity-20 hover:bg-gray-600',
                      config.textColor
                    )}
                    onClick={handleDismiss}
                    aria-label="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Progress bar for auto-dismiss */}
            {duration > 0 && (
              <motion.div
                className={clsx('mt-2 h-1 rounded-full', config.iconColor.replace('text-', 'bg-'))}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Toast container component for managing multiple toasts
export interface ToastContainerProps {
  /** Array of toasts to display */
  toasts: ToastProps[];
  /** Maximum number of toasts to show at once */
  maxToasts?: number;
  /** Default position for all toasts */
  position?: ToastProps['position'];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  maxToasts = 5,
  position = 'top-right',
}) => {
  const visibleToasts = toasts.slice(0, maxToasts);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <AnimatePresence mode="popLayout">
        {visibleToasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -50 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              transition: { delay: index * 0.1 }
            }}
            exit={{ opacity: 0, y: -50 }}
          >
            <Toast {...toast} position={position} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Hook for managing toasts
export interface UseToastReturn {
  toasts: ToastProps[];
  addToast: (toast: Omit<ToastProps, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (toast: Omit<ToastProps, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastProps = {
      ...toast,
      id,
      onDismiss: (toastId) => {
        removeToast(toastId);
        toast.onDismiss?.(toastId);
      },
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
  };
};

