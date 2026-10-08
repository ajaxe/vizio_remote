import smartcast from "vizio-smart-cast";
import * as defaultTokenStore from "./tokenStore.js";
import * as dgram from "dgram";
import { exec } from "child_process";
import * as https from "https";
import { serverLogger } from "./middleware/logger.js";

/** @type {Map<string, smartcast.Device>} */
const clients = new Map();

/**
 * Factory for creating or getting a cached SmartCast client.
 * @param {string} ip
 * @param {string} [tokenOverride]
 * @param {typeof defaultTokenStore} [tokenStore=defaultTokenStore]
 * @returns {Promise<{ client: smartcast.Device, token: string | null }>}
 */
export async function getClient(
  ip,
  tokenOverride,
  tokenStore = defaultTokenStore,
) {
  const token = tokenOverride || (await tokenStore.getAuthToken());
  const key = `${ip}:${token || ""}`;

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
export async function initiatePairing(
  ip,
  deviceName = "VizioWebRemote",
  deviceId,
) {
  const client = new smartcast(ip);
  return await client.pairing.initiate(deviceName, deviceId);
}

/**
 * Submits the PIN displayed on the TV to finalize pairing.
 * Persists the resulting AUTH_TOKEN to Redis.
 * @param {string} ip
 * @param {string} pin
 * @param {number|string} [pairingReqToken]
 * @param {string} [deviceId]
 * @param {typeof defaultTokenStore} [tokenStore]
 * @returns {Promise<import('../types').PairingConfirmResponse>}
 */
export async function confirmPairing(
  ip,
  pin,
  pairingReqToken,
  deviceId,
  tokenStore = defaultTokenStore,
) {
  const { client } = await getClient(ip, undefined, tokenStore);
  // @ts-ignore - vizio-smart-cast pair method accepts pairing token in some versions
  const result = await client.pairing.pair(pin, deviceId, pairingReqToken);

  if (result && result.ITEM && result.ITEM.AUTH_TOKEN) {
    const remoteData = await tokenStore.getCurrentTvRemote();
    if (
      !remoteData ||
      remoteData.ip !== ip ||
      remoteData.deviceId !== deviceId
    ) {
      throw new Error(
        `Remote data mismatch: expected IP ${ip} and deviceId ${deviceId}, but got ${remoteData?.ip} and ${remoteData?.deviceId}`,
      );
    }

    remoteData.mac = await getSystemInfoMACAddress(client);

    remoteData.token = result.ITEM.AUTH_TOKEN;
    remoteData.status = "paired";

    await tokenStore.setCurrentTvRemote(remoteData);
    // Refresh cached client instance with new token
    const key = `${ip}:${result.ITEM.AUTH_TOKEN}`;
    clients.set(key, new smartcast(ip, result.ITEM.AUTH_TOKEN));
  }

  return result;
}

/**
 * Executes a remote control command on the target Vizio TV.
 * @param {import('../types').TvRemoteData} remoteData
 * @param {import('../types').RemoteCommand} action
 * @param {typeof defaultTokenStore} [tokenStore=defaultTokenStore]
 * @returns {Promise<any>}
 */
export async function executeCommand(
  remoteData,
  action,
  tokenStore = defaultTokenStore,
) {
  const { client, token } = await getClient(
    remoteData.ip,
    remoteData.token,
    tokenStore,
  );

  if (!token) {
    throw new Error("NO_AUTH_TOKEN");
  }

  switch (action) {
    case "up":
      return await client.control.navigate.up();
    case "down":
      return await client.control.navigate.down();
    case "left":
      return await client.control.navigate.left();
    case "right":
      return await client.control.navigate.right();
    case "ok":
      return await client.control.navigate.ok();
    case "back":
      return await client.control.navigate.back();
    case "home":
      // NAV codeset 4, code 3 is HOME
      return await client.control.keyCommand(4, 3);
    case "vol_up":
      return await client.control.volume.up();
    case "vol_down":
      return await client.control.volume.down();
    case "mute":
      return await client.control.volume.mute();
    case "power":
      // Power toggle: codeset 11, code 2
      // return await client.control.keyCommand(11, 2);
      return await toggleOnOffVizioTv({
        remoteData,
        client,
      });
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
export async function launchApp(
  ip,
  appId,
  nameSpace = 2,
  message = "",
  tokenOverride,
  tokenStore = defaultTokenStore,
) {
  const { client, token } = await getClient(ip, tokenOverride, tokenStore);

  if (!token) {
    throw new Error("NO_AUTH_TOKEN");
  }

  if (client.app && typeof client.app.launch === "function") {
    return await client.app.launch(appId, nameSpace);
  }

  // Fallback to direct SmartCast REST PUT /app/launch
  const response = await fetch(`https://${ip}:7345/app/launch`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      AUTH: token,
    },
    body: JSON.stringify({
      VALUE: {
        APP_ID: appId,
        NAME_SPACE: nameSpace,
        MESSAGE: message,
      },
    }),
  });

  return await response.json();
}

/**
 * Sends a UDP WoL Magic Packet to the broadcast address using a known MAC.
 * @param {string} macAddress - e.g. "AA:BB:CC:DD:EE:FF" or "aabbccddeeff"
 * @param {string} [broadcastIp='255.255.255.255']
 */
function sendWolPacket(macAddress, broadcastIp = "255.255.255.255") {
  return new Promise((resolve, reject) => {
    const cleanMac = macAddress.replace(/[:-]/g, "").toLowerCase();
    if (cleanMac.length !== 12) {
      return reject(new Error(`Invalid MAC address: ${macAddress}`));
    }

    const syncStream = Buffer.alloc(6, 0xff);
    const macBuffer = Buffer.from(cleanMac, "hex");
    const macChain = Array(16).fill(macBuffer);
    const magicPacket = Buffer.concat([syncStream, ...macChain]);

    const socket = dgram.createSocket("udp4");
    socket.bind(() => {
      socket.setBroadcast(true);
      socket.send(magicPacket, 0, magicPacket.length, 9, broadcastIp, (err) => {
        socket.close();
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

/**
 * Sends a SmartCast key command over HTTPS.
 * Vizio uses a self-signed certificate, so rejectUnauthorized must be false.
 */
function sendSmartCastKey(ip, authToken, codeSet, code, port = 7345) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      KEYLIST: [
        {
          CODESET: codeSet,
          CODE: code,
          ACTION: "KEYPRESS",
        },
      ],
    });

    const options = {
      hostname: ip,
      port: port,
      path: "/key_command/",
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Auth: authToken,
        "Content-Length": Buffer.byteLength(payload),
      },
      rejectUnauthorized: false, // SmartCast uses internal self-signed TLS certs
      timeout: 3000,
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });

    req.on("error", (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

/**
 * Robust Power-On Sequence:
 * 1. Fires WoL to ensure the NIC wakes up.
 * 2. Attempts the SmartCast REST Power-On command with retries.
 * @param {object} options
 * @param {import('../types').TvRemoteData} options.remoteData
 * @param {smartcast.Device} options.client
 * @param {number} [options.maxRetries=5]
 * @param {number} [options.retryDelayMs=1500]
 * @returns {Promise<{ success: boolean, attempts: number }>}
 */
export async function toggleOnOffVizioTv({
  remoteData,
  client,
  maxRetries = 5,
  retryDelayMs = 1500,
}) {
  // Step 1: Send raw WoL magic packet if MAC is available
  if (remoteData.mac) {
    for (const t of Object.keys(remoteData.mac)) {
      try {
        await sendWolPacket(remoteData.mac[t]);
      } catch (err) {
        console.warn(
          `WoL packet send warning: type-${t}: mac-${remoteData.mac[t]}: ${err.message}`,
          {
            error: err.message,
            macAddrType: t,
            macAddr: remoteData.mac[t],
          },
        );
      }
    }
  }

  // Step 2: Retry the HTTPS Power On command (CODESET 11, CODE 1)
  // CODE 1 = POWER ON, CODE 2 = POWER TOGGLE
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const v = await client.control.power.toggle()
      return { success: true, attempts: attempt };
    } catch (err) {
      if (attempt === maxRetries) {
        throw new Error(
          `Failed to turn on TV after ${maxRetries} attempts: ${err.message}`,
        );
      }
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
}

/**
 * Returns a map of MAC addresses from the TV's system information.
 * Keys expected are 'rj45_mac_address' and 'wlan_mac_address'.
 * @param {smartcast.Device} client
 * @returns {Promise<Record<string, string>>}
 */
async function getSystemInfoMACAddress(client) {
  const macAddressType = "T_MAC_ADDRESS_V1";

  const response = await client.settings.system.information.network.get();
  if (!response || response.STATUS?.RESULT !== "SUCCESS") {
    throw new Error("Failed to retrieve MAC address from TV settings.");
  }
  /**
   * @type {Record<string, string>}
   */
  const mac = {};
  response.ITEMS?.filter((item) => item.TYPE === macAddressType)?.forEach(
    (item) => {
      mac[item.CNAME] = item.VALUE?.toLowerCase().trim() || null;
    },
  );

  serverLogger.info("Fetching system information MAC addresses...", mac);

  return mac;
}
