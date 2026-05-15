import fs from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: unknown;
  error?: string;
}

class Logger {
  private logDir: string;
  private isDevelopment: boolean;
  private logLevel: LogLevel;
  private fileLoggingEnabled: boolean;

  constructor() {
    this.logDir =
      process.env.LOG_DIR ||
      (process.env.VERCEL ? path.join('/tmp', 'babycore-logs') : path.join(process.cwd(), 'logs'));
    this.isDevelopment = !process.env.VERCEL && process.env.NODE_ENV !== 'production';
    this.logLevel = this.parseLogLevel(process.env.LOG_LEVEL || 'INFO');
    this.fileLoggingEnabled = String(process.env.DISABLE_FILE_LOGGING || '').toLowerCase() !== 'true';

    if (this.fileLoggingEnabled && !fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch (error) {
        this.fileLoggingEnabled = false;
        console.warn('File logging disabled because the log directory is not writable:', error);
      }
    }
  }

  private parseLogLevel(level: string): LogLevel {
    const levels: Record<string, LogLevel> = {
      ERROR: LogLevel.ERROR,
      WARN: LogLevel.WARN,
      INFO: LogLevel.INFO,
      DEBUG: LogLevel.DEBUG,
    };
    return levels[level.toUpperCase()] || LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    const levelOrder = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    return levelOrder.indexOf(level) <= levelOrder.indexOf(this.logLevel);
  }

  private formatEntry(entry: LogEntry): string {
    const jsonEntry = JSON.stringify(entry);
    return jsonEntry;
  }

  private writeToFile(entry: LogEntry): void {
    if (!this.fileLoggingEnabled) return;

    try {
      const dateString = new Date().toISOString().split('T')[0];
      const logFile = path.join(this.logDir, `${dateString}.log`);

      const logLine = this.formatEntry(entry) + '\n';
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: string,
    data?: unknown,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      error: error ? `${error.name}: ${error.message}\n${error.stack}` : undefined,
    };
  }

  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    this.writeToFile(entry);

    if (this.isDevelopment) {
      const colorCode = this.getColorCode(entry.level);
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();

      if (entry.error) {
        console.error(
          `${colorCode}[${entry.level}] ${timestamp} [${entry.context}]${colorCode} ${entry.message}`,
          entry.error
        );
      } else {
        console.log(
          `${colorCode}[${entry.level}] ${timestamp} [${entry.context}]${colorCode} ${entry.message}`,
          entry.data || ''
        );
      }
      return;
    }

    const line = this.formatEntry(entry);
    if (entry.level === LogLevel.ERROR) {
      console.error(line);
    } else if (entry.level === LogLevel.WARN) {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  private getColorCode(level: LogLevel): string {
    const colors = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m', // Yellow
      INFO: '\x1b[36m', // Cyan
      DEBUG: '\x1b[35m', // Magenta
    };
    return colors[level];
  }

  debug(message: string, context?: string, data?: unknown): void {
    this.output(this.createEntry(LogLevel.DEBUG, message, context, data));
  }

  info(message: string, context?: string, data?: unknown): void {
    this.output(this.createEntry(LogLevel.INFO, message, context, data));
  }

  warn(message: string, context?: string, data?: unknown): void {
    this.output(this.createEntry(LogLevel.WARN, message, context, data));
  }

  error(message: string, error?: Error, context?: string, data?: unknown): void {
    this.output(this.createEntry(LogLevel.ERROR, message, context, data, error));
  }

  // Convenience methods
  logRequest(method: string, path: string, userId?: string, duration?: number): void {
    const message = `${method} ${path}`;
    const data = userId ? { userId, duration } : { duration };
    this.info(message, 'REQUEST', data);
  }

  logResponse(statusCode: number, duration?: number): void {
    this.info(`Response: ${statusCode}`, 'RESPONSE', { duration });
  }

  logDatabaseQuery(query: string, duration?: number, error?: Error): void {
    if (error) {
      this.error(`Database query failed: ${query}`, error, 'DATABASE', { duration });
    } else {
      this.debug(`Database query executed: ${query}`, 'DATABASE', { duration });
    }
  }

  logApiCall(method: string, url: string, statusCode?: number, duration?: number, error?: Error): void {
    const message = `${method} ${url}`;
    if (error) {
      this.error(`API call failed: ${message}`, error, 'API_CALL', { statusCode, duration });
    } else {
      this.info(`API call: ${message}`, 'API_CALL', { statusCode, duration });
    }
  }

  logAuthEvent(event: string, userId?: string, success?: boolean, error?: Error): void {
    const data = { userId, success };
    if (error) {
      this.error(`Auth ${event} failed`, error, 'AUTH', data);
    } else {
      this.info(`Auth ${event}`, 'AUTH', data);
    }
  }

  logPaymentEvent(event: string, userId: string, amount: number, status: string, error?: Error): void {
    const data = { userId, amount, status };
    if (error) {
      this.error(`Payment ${event} failed`, error, 'PAYMENT', data);
    } else {
      this.info(`Payment ${event}`, 'PAYMENT', data);
    }
  }

  logValidationError(endpoint: string, errors: string[], data?: unknown): void {
    this.warn(`Validation failed at ${endpoint}`, 'VALIDATION', { errors, data });
  }

  logServiceError(service: string, operation: string, error: Error, context?: unknown): void {
    this.error(`${service}.${operation} failed`, error, 'SERVICE', context);
  }

  // Cleanup old logs (older than 30 days)
  cleanupOldLogs(daysToKeep: number = 30): void {
    try {
      const files = fs.readdirSync(this.logDir);
      const now = Date.now();
      const thirtyDaysAgo = now - daysToKeep * 24 * 60 * 60 * 1000;

      files.forEach((file) => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtimeMs < thirtyDaysAgo) {
          fs.unlinkSync(filePath);
          this.info(`Deleted old log file: ${file}`, 'CLEANUP');
        }
      });
    } catch (error) {
      this.error('Failed to cleanup old logs', error as Error, 'CLEANUP');
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export default Logger;
