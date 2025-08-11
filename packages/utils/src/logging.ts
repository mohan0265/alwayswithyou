export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  orgId?: string;
  error?: Error;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile?: boolean;
  filePath?: string;
  enableRemote?: boolean;
  remoteEndpoint?: string;
}

export class Logger {
  private config: LoggerConfig;
  private context: Record<string, any> = {};

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  /**
   * Set persistent context for all log entries
   */
  setContext(context: Record<string, any>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear persistent context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: { ...this.context, ...context },
      error,
    };

    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    if (this.config.enableFile && this.config.filePath) {
      this.logToFile(entry);
    }

    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.logToRemote(entry);
    }
  }

  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const contextStr = entry.context && Object.keys(entry.context).length > 0
      ? ` ${JSON.stringify(entry.context)}`
      : '';

    const logMessage = `[${timestamp}] ${levelName}: ${entry.message}${contextStr}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        if (entry.error) {
          console.error(entry.error.stack);
        }
        break;
    }
  }

  /**
   * Log to file (placeholder - would need file system access)
   */
  private logToFile(entry: LogEntry): void {
    // In a real implementation, this would write to a file
    // For now, we'll just use console as fallback
    this.logToConsole(entry);
  }

  /**
   * Log to remote endpoint (placeholder)
   */
  private logToRemote(entry: LogEntry): void {
    // In a real implementation, this would send to a remote logging service
    // For now, we'll just use console as fallback
    if (entry.level >= LogLevel.ERROR) {
      this.logToConsole(entry);
    }
  }
}

/**
 * Create a logger instance with default configuration
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  const defaultConfig: LoggerConfig = {
    level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
    enableConsole: true,
    enableFile: false,
    enableRemote: false,
  };

  return new Logger({ ...defaultConfig, ...config });
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Create a child logger with additional context
 */
export function createChildLogger(
  parentLogger: Logger,
  context: Record<string, any>
): Logger {
  const childLogger = Object.create(parentLogger);
  childLogger.setContext(context);
  return childLogger;
}

/**
 * Log performance metrics
 */
export function logPerformance(
  operation: string,
  startTime: number,
  context?: Record<string, any>
): void {
  const duration = Date.now() - startTime;
  logger.info(`Performance: ${operation}`, {
    ...context,
    duration_ms: duration,
  });
}

/**
 * Create a performance timer
 */
export function createTimer(operation: string): () => void {
  const startTime = Date.now();
  return (context?: Record<string, any>) => {
    logPerformance(operation, startTime, context);
  };
}

/**
 * Log user action for audit trail
 */
export function logUserAction(
  userId: string,
  action: string,
  resource?: string,
  context?: Record<string, any>
): void {
  logger.info(`User action: ${action}`, {
    userId,
    resource,
    ...context,
  });
}

/**
 * Log security event
 */
export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  context?: Record<string, any>
): void {
  const level = severity === 'critical' || severity === 'high' 
    ? LogLevel.ERROR 
    : LogLevel.WARN;

  logger.log(level, `Security event: ${event}`, {
    severity,
    ...context,
  });
}

/**
 * Sanitize sensitive data from logs
 */
export function sanitizeLogData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'auth',
    'authorization',
    'cookie',
    'session',
  ];

  const sanitized = { ...data };

  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive.toLowerCase())
    )) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
}

