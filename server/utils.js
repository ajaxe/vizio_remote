/**
 * Wraps a promise with a timeout constraint.
 * @param {Promise} promise - The asynchronous operation to monitor.
 * @param {number} ms - Timeout duration in milliseconds.
 * @returns {Promise} Resolves with the original promise or rejects on timeout.
 */
export function withTimeout(promise, ms) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    // Clear the timer to prevent memory leaks if the main promise wins
    clearTimeout(timeoutId);
  });
}
