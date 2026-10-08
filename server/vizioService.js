import smartcast from 'vizio-smart-cast';
import * as defaultTokenStore from './tokenStore.js';

/** @type {Map<string, any>} */
const clients = new Map();

/**
 * Factory for creating or getting a cached SmartCast client.
 * @param {string} ip
 * @param {string} [tokenOverride]
 * @param {typeof defaultTokenStore} [tokenStore=defaultTokenStore]
 * @returns {Promise<{ client: any, token: string | null }>}
 */
export async function getClient(ip, tokenOverride, tokenStore = defaultTokenStore) {
  const token = tokenOverride || (await tokenStore.getAuthToken(ip));
  const key = `${ip}:${token || ''}`;

  if (!clients.has(key)) {
    // vizio-smart-cast constructor expects host IP and optional auth token
    const client = new smartcast(ip, token || undefined);
    clients.set(key, client);
  }

  return { client: clients.get(key), token };
}

/**
 * Initiates the pairing handshake with a Vizio TV.
 * The TV will display a 4-digit PIN on the screen.
 * @param {string} ip
 * @param {string} [deviceName='VizioWebRemote']
 * @param {string} [deviceId]
 * @returns {Promise<import('../types').PairingInitiateResponse>}
 */
export async function initiatePairing(ip, deviceName = 'VizioWebRemote', deviceId) {
  const client = new smartcast(ip);
  return await client.pairing.initiate(deviceName, deviceId);
}

/**
 * Submits the PIN displayed on the TV to finalize pairing.
 * Persists the resulting AUTH_TOKEN to Redis.
 * @param {string} ip
 * @param {string} pin
 * @param {number|string} [pairingReqToken]
 * @param {string|typeof defaultTokenStore} [deviceIdOrTokenStore]
 * @param {typeof defaultTokenStore} [maybeTokenStore]
 * @returns {Promise<import('../types').PairingConfirmResponse>}
 */
export async function confirmPairing(ip, pin, pairingReqToken = undefined, deviceIdOrTokenStore = undefined, maybeTokenStore = defaultTokenStore) {
  let deviceId;
  let tokenStore;
  if (deviceIdOrTokenStore && typeof deviceIdOrTokenStore === 'object' && typeof deviceIdOrTokenStore.setAuthToken === 'function') {
    tokenStore = deviceIdOrTokenStore;
    deviceId = undefined;
  } else {
    deviceId = typeof deviceIdOrTokenStore === 'string' ? deviceIdOrTokenStore : undefined;
    tokenStore = maybeTokenStore || defaultTokenStore;
  }

  const { client } = await getClient(ip, undefined, tokenStore);
  // @ts-ignore - vizio-smart-cast pair method accepts pairing token in some versions
  const result = await client.pairing.pair(pin, deviceId, pairingReqToken);

  if (result && result.ITEM && result.ITEM.AUTH_TOKEN) {
    await tokenStore.setAuthToken(ip, result.ITEM.AUTH_TOKEN);
    // Refresh cached client instance with new token
    const key = `${ip}:${result.ITEM.AUTH_TOKEN}`;
    clients.set(key, new smartcast(ip, result.ITEM.AUTH_TOKEN));
  }

  return result;
}

/**
 * Executes a remote control command on the target Vizio TV.
 * @param {string} ip
 * @param {import('../types').RemoteCommand} action
 * @param {string} [tokenOverride]
 * @param {typeof defaultTokenStore} [tokenStore=defaultTokenStore]
 * @returns {Promise<any>}
 */
export async function executeCommand(ip, action, tokenOverride, tokenStore = defaultTokenStore) {
  const { client, token } = await getClient(ip, tokenOverride, tokenStore);

  if (!token) {
    throw new Error('NO_AUTH_TOKEN');
  }

  switch (action) {
    case 'up':
      return await client.control.navigate.up();
    case 'down':
      return await client.control.navigate.down();
    case 'left':
      return await client.control.navigate.left();
    case 'right':
      return await client.control.navigate.right();
    case 'ok':
      return await client.control.navigate.ok();
    case 'back':
      return await client.control.navigate.back();
    case 'home':
      // NAV codeset 4, code 3 is HOME
      return await client.control.keyCommand(4, 3);
    case 'vol_up':
      return await client.control.volume.up();
    case 'vol_down':
      return await client.control.volume.down();
    case 'mute':
      return await client.control.volume.mute();
    case 'power':
      // Power toggle: codeset 11, code 2
      return await client.control.keyCommand(11, 2);
    default:
      throw new Error(`Unknown command: ${action}`);
  }
}

/**
 * Launches an application on the Vizio TV.
 * @param {string} ip
 * @param {string} appId
 * @param {number} [nameSpace=2]
 * @param {string} [message='']
 * @param {string} [tokenOverride]
 * @param {typeof defaultTokenStore} [tokenStore=defaultTokenStore]
 * @returns {Promise<any>}
 */
export async function launchApp(ip, appId, nameSpace = 2, message = '', tokenOverride, tokenStore = defaultTokenStore) {
  const { client, token } = await getClient(ip, tokenOverride, tokenStore);

  if (!token) {
    throw new Error('NO_AUTH_TOKEN');
  }

  if (client.app && typeof client.app.launch === 'function') {
    return await client.app.launch(appId, appId, nameSpace);
  }

  // Fallback to direct SmartCast REST PUT /app/launch
  const response = await fetch(`https://${ip}:7345/app/launch`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      AUTH: token
    },
    body: JSON.stringify({
      VALUE: {
        APP_ID: appId,
        NAME_SPACE: nameSpace,
        MESSAGE: message
      }
    })
  });

  return await response.json();
}
