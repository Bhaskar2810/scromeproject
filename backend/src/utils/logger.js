const formatLog = (level, message, meta = '') => {
  const timestamp = new Date().toISOString();
  const metaStr = meta && typeof meta === 'object' ? JSON.stringify(meta) : meta;
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${metaStr}`.trim();
};

const logger = {
  info: (message, meta) => {
    console.log(formatLog('info', message, meta));
  },
  warn: (message, meta) => {
    console.warn(formatLog('warn', message, meta));
  },
  error: (message, meta) => {
    console.error(formatLog('error', message, meta));
  },
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatLog('debug', message, meta));
    }
  }
};

module.exports = logger;
