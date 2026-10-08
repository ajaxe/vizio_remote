/**
 * @file Client HTTP API helper to interact with the Hono backend bridge
 */

/**
 * Checks if the TV at the specified IP address is paired in Redis.
 * @param {string} ip
 * @returns {Promise<import('../../../types').StatusResponse>}
 */
export async function checkTvStatus(ip) {
  if (!ip) throw new Error('TV IP is required');
  const res = await fetch(`/api/status?ip=${encodeURIComponent(ip.trim())}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `Status check failed (${res.status})`);
  }
  return await res.json();
}

/**
 * Initiates TV pairing sequence to display the 4-digit PIN on screen.
 * @param {string} ip
 * @param {string} [deviceName='VizioWebRemote']
 * @returns {Promise<import('../../../types').PairingInitiateResponse>}
 */
export async function initiatePairing(ip, deviceName = 'VizioWebRemote') {
  const res = await fetch('/api/pair/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip: ip.trim(), deviceName })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to initiate pairing (${res.status})`);
  }
  return data;
}

/**
 * Confirms pairing by submitting the 4-digit PIN displayed on the TV.
 * @param {string} ip
 * @param {string} pin
 * @param {number|string} [pairingReqToken]
 * @returns {Promise<import('../../../types').PairingConfirmResponse>}
 */
export async function confirmPairing(ip, pin, pairingReqToken) {
  const res = await fetch('/api/pair/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ip: ip.trim(),
      pin: String(pin).trim(),
      pairingReqToken
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Failed to confirm pairing (${res.status})`);
  }
  return data;
}

/**
 * Sends a remote navigation or control command to the TV.
 * @param {string} ip
 * @param {import('../../../types').RemoteCommand} action
 * @returns {Promise<{ success: boolean; result?: any }>}
 */
export async function sendRemoteCommand(ip, action) {
  // Trigger short tactile haptic feedback if supported by browser/device
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(15);
  }

  const res = await fetch('/api/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip: ip.trim(), action })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Command ${action} failed (${res.status})`);
    // @ts-ignore
    error.status = res.status;
    throw error;
  }
  return data;
}

/**
 * Retrieves the catalog of supported streaming applications.
 * @returns {Promise<import('../../../types').VizioApp[]>}
 */
export async function fetchApps() {
  const res = await fetch('/api/apps');
  if (!res.ok) {
    throw new Error(`Failed to fetch apps (${res.status})`);
  }
  return await res.json();
}

/**
 * Launches an application on the TV.
 * @param {string} ip
 * @param {string} appId
 * @param {number} [nameSpace=2]
 * @param {string} [message='']
 * @returns {Promise<{ success: boolean }>}
 */
export async function launchTvApp(ip, appId, nameSpace = 2, message = '') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(20);
  }

  const res = await fetch('/api/apps/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ip: ip.trim(),
      appId,
      nameSpace,
      message
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `App launch failed (${res.status})`);
    // @ts-ignore
    error.status = res.status;
    throw error;
  }
  return data;
}
