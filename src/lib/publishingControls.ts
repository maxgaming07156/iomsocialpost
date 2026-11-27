import { cookies } from "next/headers";
import {
  DEFAULT_PUBLISHING_CONTROLS,
  PublishingControls,
} from "@/types/publishing";
import {
  buildSessionCookieOptions,
  decryptJsonPayload,
  encryptJsonPayload,
  isTokenEncryptionConfigured,
} from "@/lib/oauthVault";

export const PUBLISHING_CONTROLS_COOKIE = "iom_pub_controls_v1";

export async function readPublishingControls(): Promise<PublishingControls> {
  const store = await cookies();
  const raw = store.get(PUBLISHING_CONTROLS_COOKIE)?.value;
  if (!raw) return { ...DEFAULT_PUBLISHING_CONTROLS };

  if (isTokenEncryptionConfigured()) {
    const decrypted = decryptJsonPayload<Partial<PublishingControls>>(raw);
    if (decrypted) {
      return {
        publishingEnabled: Boolean(decrypted.publishingEnabled),
        instagramPublishingEnabled: Boolean(
          decrypted.instagramPublishingEnabled
        ),
        tiktokPublishingEnabled: Boolean(decrypted.tiktokPublishingEnabled),
        manualConfirmationRequired:
          decrypted.manualConfirmationRequired !== false,
        testMode: decrypted.testMode !== false,
      };
    }
  } else {
    try {
      const parsed = JSON.parse(raw) as Partial<PublishingControls>;
      return {
        publishingEnabled: Boolean(parsed.publishingEnabled),
        instagramPublishingEnabled: Boolean(parsed.instagramPublishingEnabled),
        tiktokPublishingEnabled: Boolean(parsed.tiktokPublishingEnabled),
        manualConfirmationRequired: parsed.manualConfirmationRequired !== false,
        testMode: parsed.testMode !== false,
      };
    } catch {
      return { ...DEFAULT_PUBLISHING_CONTROLS };
    }
  }

  return { ...DEFAULT_PUBLISHING_CONTROLS };
}

export function serializePublishingControls(
  controls: PublishingControls
): { value: string; options: ReturnType<typeof buildSessionCookieOptions> } {
  const value = isTokenEncryptionConfigured()
    ? encryptJsonPayload(controls)
    : JSON.stringify(controls);

  return {
    value,
    options: buildSessionCookieOptions(60 * 60 * 24 * 30),
  };
}
