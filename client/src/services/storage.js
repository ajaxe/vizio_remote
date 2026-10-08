const STORAGE_KEY_IP = 'vizio_tv_ip';

/**
 * Retrieves the saved TV IP from the browser's localStorage.
 * @returns {string}
 */
export function getSavedTvIp() {
  try {
    return localStorage.getItem(STORAGE_KEY_IP) || '';
  } catch (err) {
    console.warn('localStorage read error:', err);
    return '';
  }
}

/**
 * Saves the TV IP into the browser's localStorage.
 * @param {string} ip
 */
export function saveTvIp(ip) {
  try {
    if (ip) {
      localStorage.setItem(STORAGE_KEY_IP, ip.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_IP);
    }
  } catch (err) {
    console.warn('localStorage write error:', err);
  }
}

/**
 * Clears the saved TV IP from localStorage.
 */
export function clearSavedTvIp() {
  try {
    localStorage.removeItem(STORAGE_KEY_IP);
  } catch (err) {
    console.warn('localStorage clear error:', err);
  }
}
