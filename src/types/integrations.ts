export type IntegrationConnectionStatus =
  | "NOT_CONNECTED"
  | "CONNECTED"
  | "ACTION_REQUIRED"
  | "CONNECTION_ERROR";

export interface ReadinessCheckItem {
  id: string;
  label: string;
  complete: boolean;
  detail: string;
  requiresManualAction: boolean;
}

export interface PlatformIntegrationSummary {
  platform: "instagram" | "tiktok";
  status: IntegrationConnectionStatus;
  credentialsConfigured: boolean;
  encryptionConfigured: boolean;
  accountName: string | null;
  accountType: string | null;
  grantedScopes: string[];
  requiredPermissions: string[];
  apiEligibility: string;
  publishingAvailability: "DISABLED_PHASE_5";
  lastCheckedAt: string | null;
  tokenExpiresAt: string | null;
  statusMessage: string;
  docsUrl: string;
  checklist: ReadinessCheckItem[];
}

export interface IntegrationsStatusPayload {
  ok: boolean;
  publishingEnabled: false;
  instagram: PlatformIntegrationSummary;
  tiktok: PlatformIntegrationSummary;
}
