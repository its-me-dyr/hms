/**
 * Logger Utility
 * 
 * Simple, structured logger with log levels and timestamps.
 * Wraps console methods with level filtering and formatting.
 * 
 * In production, this can be replaced with Winston, Pino, etc.
 * without changing the API used throughout the codebase.
 */

const env = require('../config/env');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const currentLevel = LOG_LEVELS[env.logLevel] ?? LOG_LEVELS.info;

/**
 * Format a log message with timestamp and level
 */
const formatMessage = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  return { prefix, message, args };
};

const logger = {
  error: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.error) {
      const { prefix } = formatMessage('error', message, ...args);
      console.error(prefix, message, ...args);
    }
  },

  warn: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.warn) {
      const { prefix } = formatMessage('warn', message, ...args);
      console.warn(prefix, message, ...args);
    }
  },

  info: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.info) {
      const { prefix } = formatMessage('info', message, ...args);
      console.info(prefix, message, ...args);
    }
  },

  http: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.http) {
      const { prefix } = formatMessage('http', message, ...args);
      console.log(prefix, message, ...args);
    }
  },

  debug: (message, ...args) => {
    if (currentLevel >= LOG_LEVELS.debug) {
      const { prefix } = formatMessage('debug', message, ...args);
      console.debug(prefix, message, ...args);
    }
  },
};

module.exports = logger;
