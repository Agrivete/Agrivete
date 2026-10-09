const isDev = process.env.NODE_ENV === 'development';

function generateErrorId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    console.log(
      JSON.stringify({
        level: 'info',
        message,
        ...context,
        timestamp: new Date().toISOString(),
      })
    );
  },

  warn(message: string, context?: Record<string, unknown>) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message,
        ...context,
        timestamp: new Date().toISOString(),
      })
    );
  },

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    const errorId = generateErrorId();
    console.error(
      JSON.stringify({
        level: 'error',
        errorId,
        message,
        errorType: error?.name,
        errorMessage: error?.message,
        stack: isDev ? error?.stack : undefined,
        ...context,
        timestamp: new Date().toISOString(),
      })
    );
    return errorId;
  },
};