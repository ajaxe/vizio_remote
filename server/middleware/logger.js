/**
 * @file Console JSON Logger Middleware for Hono Framework
 */

/**
 * @typedef {Object} JsonLoggerOptions
 * @property {(message: string) => void} [output=console.log] - Function to output the JSON log string.
 * @property {boolean} [includeQuery=true] - Whether to include parsed query parameters.
 * @property {boolean} [includeHeaders=false] - Whether to include request headers.
 */

/**
 * Standard structured console JSON logger for application events.
 */
export const serverLogger = {
  /**
   * @param {string} message
   * @param {Record<string, any>} [meta]
   */
  info(message, meta = {}) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message,
        ...meta
      })
    );
  },

  /**
   * @param {string} message
   * @param {Record<string, any>} [meta]
   */
  warn(message, meta = {}) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message,
        ...meta
      })
    );
  },

  /**
   * @param {string} message
   * @param {Record<string, any> | Error | string} [meta]
   */
  error(message, meta = {}) {
    const metaObj =
      meta instanceof Error
        ? { error: meta.message, stack: meta.stack }
        : typeof meta === 'string'
          ? { error: meta }
          : meta;
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
        ...metaObj
      })
    );
  }
};

/**
 * Hono middleware that outputs incoming HTTP request/response metrics as structured JSON to console.
 *
 * @param {JsonLoggerOptions} [options={}]
 * @returns {import('hono').MiddlewareHandler}
 */
export function jsonLogger(options = {}) {
  const includeQuery = options.includeQuery !== false;

  return async function jsonLoggerMiddleware(c, next) {
    const output = options.output || console.log;
    const start = Date.now();
    /** @type {any} */
    let thrownError = null;

    try {
      await next();
    } catch (err) {
      thrownError = err;
      throw err;
    } finally {
      const durationMs = Date.now() - start;
      const activeError = thrownError || c.error;
      const status = c.res?.status ?? (activeError ? 500 : 200);

      /** @type {'info' | 'warn' | 'error'} */
      let level = 'info';
      if (status >= 500 || activeError) {
        level = 'error';
      } else if (status >= 400) {
        level = 'warn';
      }

      /** @type {Record<string, any>} */
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        method: c.req.method,
        path: c.req.path,
        status,
        durationMs
      };

      // Extract Request ID if available via context or header
      const requestId = c.get?.('requestId') || c.req.header('x-request-id');
      if (requestId) {
        entry.requestId = requestId;
      }

      // Query parameters
      if (includeQuery) {
        const query = c.req.query();
        if (query && Object.keys(query).length > 0) {
          entry.query = query;
        }
      }

      // Client IP address
      const ip =
        c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
        c.req.header('x-real-ip');
      if (ip) {
        entry.ip = ip;
      }

      // User Agent
      const userAgent = c.req.header('user-agent');
      if (userAgent) {
        entry.userAgent = userAgent;
      }

      // Optional full headers
      if (options.includeHeaders) {
        entry.headers = c.req.header();
      }

      // Error details if thrown or recorded on context
      if (activeError) {
        entry.error =
          activeError instanceof Error ? activeError.message : String(activeError);
        if (activeError instanceof Error && activeError.stack) {
          entry.stack = activeError.stack;
        }
      }

      output(JSON.stringify(entry));
    }
  };
}

export default jsonLogger;
