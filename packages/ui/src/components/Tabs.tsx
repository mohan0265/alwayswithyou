import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

export interface TabItem {
  /** Unique identifier for the tab */
  id: string;
  /** Tab label */
  label: string;
  /** Tab content */
  content: React.ReactNode;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Whether the tab is disabled */
  disabled?: boolean;
  /** Badge count or text */
  badge?: string | number;
}

export interface TabsProps {
  /** Array of tab items */
  tabs: TabItem[];
  /** Currently active tab ID */
  activeTab?: string;
  /** Callback when tab changes */
  onTabChange?: (tabId: string) => void;
  /** Tab orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Tab variant */
  variant?: 'default' | 'pills' | 'underline';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether tabs should fill available width */
  fullWidth?: boolean;
  /** Custom class names */
  className?: string;
  /** Whether to animate tab content changes */
  animateContent?: boolean;
}

const sizeClasses = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-6 py-3',
};

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab: controlledActiveTab,
  onTabChange,
  orientation = 'horizontal',
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className,
  animateContent = true,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id || '');
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeTab = controlledActiveTab ?? internalActiveTab;
  const activeTabData = tabs.find(tab => tab.id === activeTab);

  // Update indicator position
  useEffect(() => {
    const activeTabElement = tabRefs.current[activeTab];
    if (activeTabElement) {
      const rect = activeTabElement.getBoundingClientRect();
      const parentRect = activeTabElement.parentElement?.getBoundingClientRect();
      
      if (parentRect) {
        if (orientation === 'horizontal') {
          setIndicatorStyle({
            width: rect.width,
            height: variant === 'underline' ? 2 : rect.height,
            transform: `translateX(${rect.left - parentRect.left}px)`,
            top: variant === 'underline' ? 'auto' : 0,
            bottom: variant === 'underline' ? 0 : 'auto',
          });
        } else {
          setIndicatorStyle({
            width: variant === 'underline' ? 2 : rect.width,
            height: rect.height,
            transform: `translateY(${rect.top - parentRect.top}px)`,
            left: variant === 'underline' ? 0 : 'auto',
            right: variant === 'underline' ? 'auto' : 0,
          });
        }
      }
    }
  }, [activeTab, orientation, variant, tabs]);

  const handleTabClick = (tabId: string) => {
    if (tabs.find(tab => tab.id === tabId)?.disabled) return;
    
    setInternalActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const getTabClasses = (tab: TabItem, isActive: boolean) => {
    const baseClasses = clsx(
      'relative font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md',
      sizeClasses[size],
      {
        'cursor-not-allowed opacity-50': tab.disabled,
        'cursor-pointer': !tab.disabled,
      }
    );

    switch (variant) {
      case 'pills':
        return clsx(
          baseClasses,
          isActive
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
          'rounded-full'
        );
      
      case 'underline':
        return clsx(
          baseClasses,
          isActive
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent',
          'rounded-none'
        );
      
      default:
        return clsx(
          baseClasses,
          isActive
            ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        );
    }
  };

  const getContainerClasses = () => {
    return clsx(
      'relative',
      orientation === 'horizontal' ? 'flex' : 'flex flex-col',
      fullWidth && orientation === 'horizontal' && 'w-full',
      variant === 'default' && 'bg-gray-100 p-1 rounded-lg',
      className
    );
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  return (
    <div className={clsx(
      orientation === 'horizontal' ? 'space-y-4' : 'flex space-x-4'
    )}>
      {/* Tab List */}
      <div
        className={getContainerClasses()}
        role="tablist"
        aria-orientation={orientation}
      >
        {/* Active indicator */}
        {variant !== 'underline' && (
          <motion.div
            className={clsx(
              'absolute bg-blue-500 rounded-md transition-all duration-200',
              variant === 'pills' ? 'bg-blue-500' : 'bg-white shadow-sm border border-gray-200'
            )}
            style={indicatorStyle}
            layout
          />
        )}

        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          
          return (
            <button
              key={tab.id}
              ref={(el) => (tabRefs.current[tab.id] = el)}
              className={clsx(
                getTabClasses(tab, isActive),
                fullWidth && orientation === 'horizontal' && 'flex-1',
                'relative z-10'
              )}
              onClick={() => handleTabClick(tab.id)}
              disabled={tab.disabled}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
            >
              <div className="flex items-center justify-center space-x-2">
                {tab.icon && (
                  <span className="flex-shrink-0">{tab.icon}</span>
                )}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={clsx(
                    'inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full',
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-500 text-white'
                  )}>
                    {tab.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className={clsx(
        orientation === 'horizontal' ? 'flex-1' : 'flex-1'
      )}>
        <AnimatePresence mode="wait">
          {activeTabData && (
            <motion.div
              key={activeTab}
              className="w-full"
              role="tabpanel"
              id={`tabpanel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
              variants={animateContent ? contentVariants : undefined}
              initial={animateContent ? 'hidden' : undefined}
              animate={animateContent ? 'visible' : undefined}
              exit={animateContent ? 'exit' : undefined}
              transition={{ duration: 0.2 }}
            >
              {activeTabData.content}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Hook for managing tab state
export interface UseTabsReturn {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  nextTab: () => void;
  prevTab: () => void;
  isFirstTab: boolean;
  isLastTab: boolean;
}

export const useTabs = (tabs: TabItem[], initialTab?: string): UseTabsReturn => {
  const [activeTab, setActiveTab] = useState(initialTab || tabs[0]?.id || '');

  const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
  const isFirstTab = currentIndex === 0;
  const isLastTab = currentIndex === tabs.length - 1;

  const nextTab = () => {
    if (!isLastTab) {
      const nextIndex = currentIndex + 1;
      setActiveTab(tabs[nextIndex].id);
    }
  };

  const prevTab = () => {
    if (!isFirstTab) {
      const prevIndex = currentIndex - 1;
      setActiveTab(tabs[prevIndex].id);
    }
  };

  return {
    activeTab,
    setActiveTab,
    nextTab,
    prevTab,
    isFirstTab,
    isLastTab,
  };
};

