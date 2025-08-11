import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Video, Phone, MessageCircle } from 'lucide-react';
import clsx from 'clsx';

export interface HeartButtonProps {
  /** Current presence status affecting the pulse color */
  status: 'online' | 'offline' | 'partner-online' | 'both-offline';
  /** Whether the drawer panel is open */
  isOpen: boolean;
  /** Callback when button is clicked */
  onClick: () => void;
  /** Whether to show reduced motion */
  reduceMotion?: boolean;
  /** Custom positioning */
  position?: {
    bottom?: number;
    right?: number;
    top?: number;
    left?: number;
  };
  /** Custom colors */
  colors?: {
    online: string;
    offline: string;
    background: string;
  };
  /** Accessibility label */
  ariaLabel?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-20 h-20',
};

const iconSizes = {
  sm: 20,
  md: 24,
  lg: 28,
};

export const HeartButton: React.FC<HeartButtonProps> = ({
  status,
  isOpen,
  onClick,
  reduceMotion = false,
  position = { bottom: 24, right: 24 },
  colors = {
    online: '#10B981', // Green
    offline: '#6B7280', // Gray
    background: '#FFFFFF',
  },
  ariaLabel = 'Always With You - Connect with your loved one',
  disabled = false,
  size = 'md',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  // Determine pulse color based on status
  const getPulseColor = () => {
    switch (status) {
      case 'online':
      case 'partner-online':
        return colors.online;
      case 'offline':
      case 'both-offline':
      default:
        return colors.offline;
    }
  };

  // Handle click with ripple effect
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newRipple = {
      id: Date.now(),
      x,
      y,
    };

    setRipples(prev => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);

    onClick();
  };

  // Breathing animation variants
  const breathingVariants = {
    initial: { scale: 1 },
    animate: {
      scale: reduceMotion ? 1 : [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  // Pulse animation variants
  const pulseVariants = {
    initial: { scale: 0, opacity: 0.7 },
    animate: {
      scale: reduceMotion ? 0 : [0, 2],
      opacity: [0.7, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeOut",
      },
    },
  };

  // Hover animation variants
  const hoverVariants = {
    initial: { scale: 1 },
    hover: {
      scale: reduceMotion ? 1 : 1.1,
      transition: { duration: 0.2 },
    },
  };

  const positionStyles = {
    position: 'fixed' as const,
    ...position,
    zIndex: 1000,
  };

  return (
    <div style={positionStyles} className="pointer-events-none">
      <motion.button
        className={clsx(
          'relative pointer-events-auto rounded-full shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50 transition-shadow duration-200',
          sizeClasses[size],
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        )}
        style={{
          backgroundColor: colors.background,
          boxShadow: isOpen
            ? '0 8px 32px rgba(0, 0, 0, 0.12)'
            : '0 4px 16px rgba(0, 0, 0, 0.08)',
        }}
        variants={hoverVariants}
        initial="initial"
        animate={isHovered ? 'hover' : 'initial'}
        whileTap={reduceMotion ? {} : { scale: 0.95 }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        disabled={disabled}
      >
        {/* Breathing pulse background */}
        <motion.div
          className={clsx('absolute inset-0 rounded-full', sizeClasses[size])}
          style={{ backgroundColor: getPulseColor() }}
          variants={breathingVariants}
          initial="initial"
          animate="animate"
          opacity={0.1}
        />

        {/* Expanding pulse rings */}
        <AnimatePresence>
          {!reduceMotion && (
            <>
              <motion.div
                className={clsx('absolute inset-0 rounded-full border-2', sizeClasses[size])}
                style={{ borderColor: getPulseColor() }}
                variants={pulseVariants}
                initial="initial"
                animate="animate"
              />
              <motion.div
                className={clsx('absolute inset-0 rounded-full border-2', sizeClasses[size])}
                style={{ borderColor: getPulseColor() }}
                variants={pulseVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: 0.5 }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Heart icon */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <Heart
            size={iconSizes[size]}
            className={clsx(
              'transition-colors duration-200',
              status === 'online' || status === 'partner-online'
                ? 'text-red-500 fill-red-500'
                : 'text-gray-400 fill-gray-400'
            )}
          />
        </div>

        {/* Click ripples */}
        <AnimatePresence>
          {ripples.map(ripple => (
            <motion.div
              key={ripple.id}
              className="absolute rounded-full bg-current opacity-20 pointer-events-none"
              style={{
                left: ripple.x - 10,
                top: ripple.y - 10,
                width: 20,
                height: 20,
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          ))}
        </AnimatePresence>

        {/* Status indicator dot */}
        <div
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm"
          style={{
            backgroundColor: getPulseColor(),
          }}
        />
      </motion.button>

      {/* Quick action buttons when hovered (optional enhancement) */}
      <AnimatePresence>
        {isHovered && !isOpen && !disabled && (
          <motion.div
            className="absolute -top-16 left-1/2 transform -translate-x-1/2 flex space-x-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button
              className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Start video call"
            >
              <Video size={16} />
            </motion.button>
            <motion.button
              className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Start voice call"
            >
              <Phone size={16} />
            </motion.button>
            <motion.button
              className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-purple-600 hover:bg-purple-50 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Send message"
            >
              <MessageCircle size={16} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

