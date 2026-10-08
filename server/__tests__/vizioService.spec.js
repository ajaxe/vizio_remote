import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeCommand, confirmPairing, getClient } from "../vizioService.js";

describe("VizioService", () => {
  let mockTokenStore;
  let tokens;
  /**
   * @type {import('../../types').TvRemoteData}
   */
  let mockRemoteData;

  beforeEach(() => {
    tokens = new Map();
    mockRemoteData = {
      ip: "192.168.1.100",
      token: "valid-test-token",
      mac: {
        rj45_mac_address: "AA:BB:CC:DD:EE:FF",
        wlan_mac_address: "11:22:33:44:55:66",
      },
      deviceId: "test-device-id",
      deviceName: "Test Device",
      status: "paired",
    };
    mockTokenStore = {
      getAuthToken: vi.fn(async (ip) => tokens.get(ip) || null),
      setAuthToken: vi.fn(async (ip, token) => {
        tokens.set(ip, token);
      }),
      deleteAuthToken: vi.fn(async (ip) => {
        tokens.delete(ip);
      }),
    };
  });

  it("throws NO_AUTH_TOKEN if no token is stored in Redis", async () => {
    await expect(
      executeCommand(mockRemoteData, "up", mockTokenStore),
    ).rejects.toThrow("NO_AUTH_TOKEN");
  });

  it("dispatches commands when token is present", async () => {
    tokens.set("192.168.1.100", "valid-test-token");

    const { client } = await getClient(
      "192.168.1.100",
      "valid-test-token",
      mockTokenStore,
    );

    // Mock client control methods
    client.control = {
      navigate: {
        up: vi.fn(async () => ({ status: "success" })),
        down: vi.fn(async () => ({ status: "success" })),
        left: vi.fn(async () => ({ status: "success" })),
        right: vi.fn(async () => ({ status: "success" })),
        ok: vi.fn(async () => ({ status: "success" })),
        back: vi.fn(async () => ({ status: "success" })),
      },
      volume: {
        up: vi.fn(async () => ({ status: "success" })),
        down: vi.fn(async () => ({ status: "success" })),
        mute: vi.fn(async () => ({ status: "success" })),
      },
      keyCommand: vi.fn(async () => ({ status: "success" })),
    };

    // Test Navigation commands
    await executeCommand(mockRemoteData, "up", mockTokenStore);
    expect(client.control.navigate.up).toHaveBeenCalled();

    await executeCommand(mockRemoteData, "ok", mockTokenStore, mockTokenStore);
    expect(client.control.navigate.ok).toHaveBeenCalled();

    await executeCommand(mockRemoteData, "back", mockTokenStore);
    expect(client.control.navigate.back).toHaveBeenCalled();

    // Test Volume and Mute commands
    await executeCommand(mockRemoteData, "vol_up", mockTokenStore);
    expect(client.control.volume.up).toHaveBeenCalled();

    await executeCommand(mockRemoteData, "mute", mockTokenStore);
    expect(client.control.volume.mute).toHaveBeenCalled();

    // Test Home keyCommand (codeset 4, code 3)
    await executeCommand(mockRemoteData, "home", mockTokenStore);
    expect(client.control.keyCommand).toHaveBeenCalledWith(4, 3);
  });

  it("persists auth token to tokenStore upon confirmPairing success", async () => {
    const { client } = await getClient(
      "192.168.1.105",
      undefined,
      mockTokenStore,
    );
    client.pairing = {
      pair: vi.fn(async () => ({
        STATUS: { RESULT: "SUCCESS" },
        ITEM: { AUTH_TOKEN: "retrieved-new-token-456" },
      })),
    };

    const res = await confirmPairing(
      "192.168.1.105",
      "1234",
      999,
      mockTokenStore,
    );

    expect(res.STATUS.RESULT).toBe("SUCCESS");
    expect(mockTokenStore.setAuthToken).toHaveBeenCalledWith(
      "192.168.1.105",
      "retrieved-new-token-456",
    );
    expect(tokens.get("192.168.1.105")).toBe("retrieved-new-token-456");
  });
});
