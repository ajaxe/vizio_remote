import { Hono } from "hono";
import { getCurrentTvRemote } from "../tokenStore.js";
import { serverLogger } from "../middleware/logger.js";
import { isTvOn } from "../vizioService.js";

export const statusRoute = new Hono();

statusRoute.get("/", async (c) => {
  try {
    const remote = await getCurrentTvRemote();
    const onStatus = await isTvOn();

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
