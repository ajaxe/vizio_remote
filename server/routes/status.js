import { Hono } from "hono";
import { getCurrentTvRemote } from "../tokenStore.js";
import { serverLogger } from "../middleware/logger.js";
import { isTvOn } from "../vizioService.js";
import { withTimeout } from "../utils.js";

export const statusRoute = new Hono();

statusRoute.get("/", async (c) => {
  try {
    const remote = await getCurrentTvRemote();
    const onStatus = await tryTvStatus(); // Timeout after 5 seconds;

    return c.json({
      ip: remote.ip,
      paired: remote.status === "paired",
      isOn: onStatus.isOn,
      message: onStatus.message,
    });
  } catch (err) {
    serverLogger.error("Failed to get TV status", {
      error: err?.message || String(err),
    });
    return c.json(
      { error: "Failed to get TV status", details: err?.message },
      500,
    );
  }
});
async function tryTvStatus() {
  try {
  return await withTimeout(isTvOn(), 5000); // Timeout after 5 seconds;
  } catch (err) {
    serverLogger.error("Failed to get TV status", {
      error: err?.message || String(err),
    });
    return { isOn: false, message: "Failed to get TV status" };
  }
}