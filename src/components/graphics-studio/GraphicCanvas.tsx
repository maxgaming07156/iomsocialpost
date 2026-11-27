"use client";

import React from "react";
import {
  EditorialTemplateId,
  GraphicPlatformVariant,
} from "@/lib/graphicRenderer";

interface GraphicCanvasProps {
  template: EditorialTemplateId;
  platformVariant?: GraphicPlatformVariant;
  categoryLabel: string;
  headline: string;
  supportingText: string;
  dateLabel: string;
  photoUrl?: string | null;
  photoCredit?: string | null;
}

function CircularSealPreview() {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/25 bg-[#0B0B0D] shadow-xs">
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <path id="seal-top" d="M 16,50 A 34,34 0 1,1 84,50" />
          <path id="seal-bottom" d="M 84,50 A 34,34 0 1,1 16,50" />
        </defs>
        <text
          fill="#FFFFFF"
          fontSize="10.5"
          fontWeight="700"
          letterSpacing="1.6"
        >
          <textPath href="#seal-top" startOffset="50%" textAnchor="middle">
            INSIDE THE
          </textPath>
        </text>
        <text
          fill="#FFFFFF"
          fontSize="10"
          fontWeight="700"
          letterSpacing="1.4"
        >
          <textPath href="#seal-bottom" startOffset="50%" textAnchor="middle">
            ISLE OF MAN
          </textPath>
        </text>
      </svg>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/triskelion-white.png"
        alt="InsideTheIOM official logo"
        className="h-6 w-6 object-contain"
      />
    </div>
  );
}

function SocialIconsFooter({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center gap-4 ${
        light ? "text-zinc-400" : "text-zinc-500"
      }`}
    >
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
      <span className="text-sm font-extrabold leading-none">f</span>
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="9" cy="17" r="3.5" />
        <path d="M12.5 17V5c1.5 2 3.5 3 6 3" />
      </svg>
    </div>
  );
}

function PhotoBackdrop({ photoUrl }: { photoUrl?: string | null }) {
  return (
    <>
      {photoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={photoUrl}
          alt="Background visual"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, #23232B 0%, #0B0B0D 75%)",
          }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(11,11,13,0.28) 0%, rgba(11,11,13,0.20) 38%, rgba(11,11,13,0.88) 58%, #0B0B0D 80%)",
        }}
      />
    </>
  );
}

export function GraphicCanvas({
  template,
  platformVariant = "instagram",
  categoryLabel,
  headline,
  supportingText,
  dateLabel,
  photoUrl,
  photoCredit,
}: GraphicCanvasProps) {
  const isTikTok = platformVariant === "tiktok";
  if (template === "breaking") {
    return (
      <div
        className="relative mx-auto flex aspect-[4/5] w-full max-w-[432px] flex-col justify-between overflow-hidden border border-zinc-800 bg-[#0B0B0D] text-white select-none"
        aria-label="Live editorial 4:5 layout preview"
      >
        <PhotoBackdrop photoUrl={photoUrl} />

        <div className="relative z-10 flex flex-1 flex-col justify-between p-6">
          <div className="flex items-center justify-between gap-2">
            {!isTikTok ? <CircularSealPreview /> : <span />}
            {dateLabel && (
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/75">
                {dateLabel}
              </p>
            )}
          </div>

          <div className="mt-auto flex flex-col items-center pt-6 text-center">
            <div className="mb-4 flex items-start justify-center">
              <span className="-skew-x-12 bg-[#C81E1E] px-3.5 py-1 text-[11px] font-extrabold italic tracking-wider text-white">
                BREAKING
              </span>
              <span className="-ml-1.5 mt-1.5 -skew-x-12 bg-white px-3.5 py-1 text-[11px] font-extrabold italic tracking-wider text-black">
                NEWS
              </span>
            </div>

            <h2 className="line-clamp-4 text-[21px] font-extrabold leading-[1.16] tracking-tight text-white">
              {headline || "Enter a headline to preview"}
            </h2>

            {supportingText && (
              <p className="mt-2.5 line-clamp-3 text-[11px] font-medium leading-relaxed text-zinc-200">
                {supportingText}
              </p>
            )}

            {!isTikTok && (
              <div className="mt-5 flex flex-col items-center gap-2.5">
                <span className="rounded-full bg-[#C81E1E] px-4 py-1 text-[10px] font-bold tracking-wide text-white">
                  insidetheiom.com
                </span>
                <SocialIconsFooter />
                {photoCredit && (
                  <p className="max-w-full truncate text-[8px] text-white/45">
                    {photoCredit}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (template === "general") {
    // Template B — Editorial Spotlight
    const words = (headline || "Enter a headline to preview").trim().split(/\s+/);
    const firstPart = words.slice(0, Math.min(4, words.length)).join(" ");
    const restPart = words.slice(Math.min(4, words.length)).join(" ");

    return (
      <div
        className="relative mx-auto flex aspect-[4/5] w-full max-w-[432px] flex-col justify-between overflow-hidden border border-zinc-800 bg-[#0B0B0D] text-white select-none"
        aria-label="Live editorial 4:5 layout preview"
      >
        <PhotoBackdrop photoUrl={photoUrl} />

        <div className="relative z-10 flex flex-1 flex-col justify-between p-6">
          <div className="flex items-center justify-between gap-2">
            {!isTikTok ? <CircularSealPreview /> : <span />}
            <span className="rounded border border-white/30 bg-black/60 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-white">
              {categoryLabel || "ISLE OF MAN"}
            </span>
          </div>

          <div className="mt-auto flex flex-col items-center pt-6 text-center">
            <h2 className="text-[21px] font-extrabold leading-[1.25] tracking-tight text-white">
              <span className="bg-[#C81E1E] px-2 py-0.5 box-decoration-clone">
                {firstPart}
              </span>
              {restPart ? ` ${restPart}` : ""}
            </h2>

            {supportingText && (
              <p className="mt-3 line-clamp-2 text-[11px] font-medium leading-relaxed text-zinc-300">
                {supportingText}
              </p>
            )}

            {!isTikTok && (
              <div className="mt-5 flex flex-col items-center gap-2.5">
                <span className="rounded-full bg-[#C81E1E] px-4 py-1 text-[10px] font-bold tracking-wide text-white">
                  insidetheiom.com
                </span>
                <SocialIconsFooter />
                {photoCredit && (
                  <p className="max-w-full truncate text-[8px] text-white/45">
                    {photoCredit}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Template C — Clean Feature Card
  return (
    <div
      className="relative mx-auto flex aspect-[4/5] w-full max-w-[432px] flex-col justify-between overflow-hidden border border-zinc-800 bg-[#0B0B0D] text-white select-none"
      aria-label="Live editorial 4:5 layout preview"
    >
      <PhotoBackdrop photoUrl={photoUrl} />

      <div className="relative z-10 flex flex-1 flex-col justify-between p-6">
        <div className="flex items-center justify-between gap-2">
          {!isTikTok ? (
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/triskelion-white.png"
                alt="InsideTheIOM official logo"
                className="h-7 w-7 object-contain"
              />
              <div>
                <p className="text-[11px] font-extrabold tracking-tight text-white">
                  InsideThe<span className="text-[#C81E1E]">IOM</span>
                </p>
                <p className="text-[7px] font-bold uppercase tracking-[0.14em] text-white/70">
                  THE ISLE OF MAN ALL IN ONE PLACE
                </p>
              </div>
            </div>
          ) : (
            <span />
          )}
          {dateLabel && (
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/75">
              {dateLabel}
            </span>
          )}
        </div>

        <div className="mt-auto pt-6">
          <div className="mb-2 h-[3px] w-7 bg-[#C81E1E]" />
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-red-300">
            {categoryLabel || "ISLE OF MAN"}
          </p>
          <h2 className="line-clamp-4 text-[21px] font-extrabold leading-[1.16] tracking-tight text-white">
            {headline || "Enter a headline to preview"}
          </h2>

          {supportingText && (
            <p className="mt-2.5 line-clamp-3 text-[11px] leading-relaxed text-zinc-300">
              {supportingText}
            </p>
          )}

          {!isTikTok && (
            <>
              <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
                <span className="rounded-full bg-[#C81E1E] px-3.5 py-1 text-[9px] font-bold text-white">
                  insidetheiom.com
                </span>
                <SocialIconsFooter light />
              </div>
              {photoCredit && (
                <p className="mt-1.5 truncate text-center text-[8px] text-white/45">
                  {photoCredit}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
