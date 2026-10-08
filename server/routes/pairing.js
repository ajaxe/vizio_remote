import { Hono } from "hono";
import { initiatePairing, confirmPairing } from "../vizioService.js";
import { serverLogger } from "../middleware/logger.js";
import { getCurrentTvRemote, setCurrentTvRemote } from "../tokenStore.js";

export const pairingRoute = new Hono();

pairingRoute.post("/initiate", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (err) {
    serverLogger.error("Invalid JSON payload in POST /api/pair/initiate", {
      path: c.req.path,
      error: err?.message || String(err),
    });
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  const { ip } = body || {};
  const deviceName = "Vizio Remote (Home)";
  const deviceId = crypto.randomUUID();

  if (!ip) {
    serverLogger.error("Missing TV IP in POST /api/pair/initiate", {
      path: c.req.path,
    });
    return c.json({ error: "Missing TV IP" }, 400);
  }

  try {
    const result = await initiatePairing(ip, deviceName, deviceId);
    await setCurrentTvRemote({
      ip,
      mac: "",
      token: "",
      deviceId,
      deviceName,
      status: "unpaired",
    });
    return c.json(result);
  } catch (err) {
    serverLogger.error(
      `Failed to initiate pairing for ${ip} in POST /api/pair/initiate`,
      {
        ip,
        error: err?.message || String(err),
      },
    );
    return c.json(
      {
        error: err && err.message ? err.message : "Failed to initiate pairing",
        details: err,
      },
      500,
    );
  }
});

pairingRoute.post("/confirm", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (err) {
    serverLogger.error("Invalid JSON payload in POST /api/pair/confirm", {
      path: c.req.path,
      error: err?.message || String(err),
    });
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  const { ip, pin, pairingReqToken } = body || {};
  if (!ip || !pin) {
    serverLogger.error("Missing TV IP or PIN in POST /api/pair/confirm", {
      path: c.req.path,
      ip: ip || null,
      pinProvided: Boolean(pin),
    });
    return c.json({ error: "Missing TV IP or PIN" }, 400);
  }

  const remoteData = await getCurrentTvRemote();
  if (!remoteData || remoteData.ip !== ip) {
    serverLogger.error(
      `No matching remote data found for ${ip} in POST /api/pair/confirm`,
      {
        ip,
      },
    );
    return c.json({ error: "Invalid TV IP" }, 400);
  }

  try {
    const deviceId = remoteData.deviceId;
    const result = await confirmPairing(
      ip,
      String(pin),
      pairingReqToken,
      deviceId,
    );
    return c.json(result);
  } catch (err) {
    serverLogger.error(
      `Failed to confirm pairing for ${ip} in POST /api/pair/confirm`,
      {
        ip,
        error: err?.message || String(err),
      },
    );
    return c.json(
      {
        error: err && err.message ? err.message : "Failed to confirm pairing",
        details: err,
      },
      500,
    );
  }
});
