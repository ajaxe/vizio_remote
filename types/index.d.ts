import * as smartcast from "vizio-smart-cast";
/**
 * @file Type definitions for Vizio SmartCast Remote Control
 */

export type RemoteCommand =
  | "up"
  | "down"
  | "left"
  | "right"
  | "ok"
  | "back"
  | "home"
  | "vol_up"
  | "vol_down"
  | "mute"
  | "power";

export interface VizioApp {
  id: string;
  name: string;
  appId: string;
  nameSpace: number;
  color: string;
}

export interface StatusResponse {
  ip: string;
  paired: boolean;
}

export interface PairingInitiateResponse {
  STATUS: {
    RESULT: "SUCCESS" | "BLOCKED" | "FAILED" | string;
    DETAIL?: string;
  };
  ITEM?: {
    PAIRING_REQ_TOKEN: number;
  };
}

export interface PairingConfirmResponse {
  STATUS: {
    RESULT: "SUCCESS" | "FAILED" | string;
    DETAIL?: string;
  };
  ITEM?: {
    AUTH_TOKEN: string;
  };
}

export interface ServerConfig {
  port: number;
  redisUrl: string;
  tokenTtlSeconds: number;
  defaultTvIp: string;
}

export interface JsonLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  method: string;
  path: string;
  status: number;
  durationMs: number;
  requestId?: string;
  query?: Record<string, string | string[]>;
  ip?: string;
  userAgent?: string;
  headers?: Record<string, string | undefined>;
  error?: string;
  stack?: string;
}

export type MacAddressType = "rj45_mac_address" | "wlan_mac_address";

export interface TvRemoteData {
  ip: string;
  mac: Record<MacAddressType, string>;
  token: string;
  deviceId: string;
  deviceName: string;
  status: "paired" | "unpaired";
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module 'vizio-smart-cast' {
  interface Device {
    app: {
      launch: (appId: string, nameSpace: number, appName?: string) => Promise<void>;
    };
  }
}
