export type AppsScriptAction =
  | "all"
  | "health"
  | "news"
  | "social_posts"
  | "sources"
  | "media"
  | "queue"
  | "settings"
  | "logs";

const ALLOWED_ACTIONS = new Set<AppsScriptAction>([
  "all",
  "health",
  "news",
  "social_posts",
  "sources",
  "media",
  "queue",
  "settings",
  "logs",
]);

export interface AppsScriptResult<T = unknown> {
  ok: boolean;
  configured: boolean;
  data?: T;
  timestamp?: string;
  error?: string;
}

export function isBackendConfigured(): boolean {
  const url = process.env.APPS_SCRIPT_URL?.trim();
  const secret = process.env.APPS_SCRIPT_SECRET?.trim();
  return Boolean(url && secret);
}

export async function callAppsScript<T = unknown>(
  action: AppsScriptAction,
  timeoutMs = 25000
): Promise<AppsScriptResult<T>> {
  if (!ALLOWED_ACTIONS.has(action)) {
    return {
      ok: false,
      configured: isBackendConfigured(),
      error: "Invalid backend action requested.",
    };
  }

  const baseUrl = process.env.APPS_SCRIPT_URL?.trim();
  const secret = process.env.APPS_SCRIPT_SECRET?.trim();

  if (!baseUrl || !secret) {
    return {
      ok: false,
      configured: false,
      error: "Backend credentials are not configured.",
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    return {
      ok: false,
      configured: true,
      error: "APPS_SCRIPT_URL is not a valid URL.",
    };
  }

  parsedUrl.searchParams.set("action", action);
  parsedUrl.searchParams.set("secret", secret);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    const rawText = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        configured: true,
        error: `Apps Script responded with HTTP ${response.status}.`,
      };
    }

    let json: unknown;
    try {
      json = JSON.parse(rawText);
    } catch {
      const looksLikeHtml =
        rawText.trimStart().startsWith("<") ||
        rawText.includes("<!DOCTYPE html");
      return {
        ok: false,
        configured: true,
        error: looksLikeHtml
          ? "Apps Script returned HTML instead of JSON. Check Web App deployment permissions (Who has access: Anyone)."
          : "Apps Script returned invalid JSON.",
      };
    }

    if (!json || typeof json !== "object") {
      return {
        ok: false,
        configured: true,
        error: "Apps Script returned an unexpected response shape.",
      };
    }

    const payload = json as {
      ok?: boolean;
      data?: T;
      timestamp?: string;
      error?: string;
    };

    if (payload.ok === false) {
      return {
        ok: false,
        configured: true,
        error: payload.error || "Apps Script rejected the request.",
      };
    }

    return {
      ok: true,
      configured: true,
      data: payload.data,
      timestamp: payload.timestamp,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        configured: true,
        error: `Apps Script request timed out after ${Math.round(timeoutMs / 1000)}s.`,
      };
    }
    return {
      ok: false,
      configured: true,
      error: "Unable to reach the Apps Script backend.",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function postToAppsScript<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown>,
  timeoutMs = 25000
): Promise<AppsScriptResult<T>> {
  const baseUrl = process.env.APPS_SCRIPT_URL?.trim();
  const secret = process.env.APPS_SCRIPT_SECRET?.trim();

  if (!baseUrl || !secret) {
    return {
      ok: false,
      configured: false,
      error: "Backend credentials are not configured.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        action,
        secret,
      }),
    });

    const rawText = await response.text();
    let json: { ok?: boolean; error?: string } & T;
    try {
      json = JSON.parse(rawText) as { ok?: boolean; error?: string } & T;
    } catch {
      const looksLikeHtml = rawText.trimStart().startsWith("<");
      return {
        ok: false,
        configured: true,
        error: looksLikeHtml
          ? "Apps Script doPost returned HTML. Ensure StudioGraphicsApi.gs is deployed as a New version."
          : "Apps Script returned invalid JSON.",
      };
    }

    if (!json.ok) {
      return {
        ok: false,
        configured: true,
        error: json.error || `Apps Script rejected action "${action}".`,
      };
    }

    return {
      ok: true,
      configured: true,
      data: json,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        configured: true,
        error: `Apps Script request timed out after ${Math.round(timeoutMs / 1000)}s.`,
      };
    }
    return {
      ok: false,
      configured: true,
      error: "Unable to reach the Apps Script backend.",
    };
  } finally {
    clearTimeout(timer);
  }
}
