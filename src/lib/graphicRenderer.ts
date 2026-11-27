export type EditorialTemplateId = "breaking" | "general" | "text-first";
export type GraphicPlatformVariant = "instagram" | "tiktok";

export interface GraphicRenderInput {
  template: EditorialTemplateId;
  platformVariant?: GraphicPlatformVariant;
  categoryLabel: string;
  headline: string;
  supportingText: string;
  dateLabel: string;
  photoDataUrl?: string | null;
  photoCredit?: string | null;
}

export interface GeneratedGraphicResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  mimeType: "image/png" | "image/jpeg";
  platformVariant: GraphicPlatformVariant;
}

const WIDTH = 1080;
const HEIGHT = 1350;

const COLORS = {
  black: "#0B0B0D",
  white: "#FFFFFF",
  mutedLight: "#A1A1AA",
  iomRed: "#C81E1E",
};

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif";

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const words = cleaned.split(" ");
  const lines: string[] = [];
  let current = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
        current = word;
      } else {
        lines.push(word);
        current = "";
      }
      if (lines.length === maxLines) {
        let last = lines[maxLines - 1];
        while (
          last.length > 3 &&
          ctx.measureText(`${last}…`).width > maxWidth
        ) {
          last = last.slice(0, -1);
        }
        lines[maxLines - 1] = `${last.trimEnd()}…`;
        return lines;
      }
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for canvas."));
    img.src = src;
  });
}

function drawCurvedArcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  inward: boolean
) {
  const chars = text.split("");
  if (chars.length === 0) return;
  const step =
    chars.length > 1 ? (endAngle - startAngle) / (chars.length - 1) : 0;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < chars.length; i++) {
    const angle = startAngle + step * i;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.rotate(inward ? angle - Math.PI / 2 : angle + Math.PI / 2);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function drawCircularSeal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  logoImg: HTMLImageElement
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.black;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = COLORS.white;
  ctx.font = `700 12px ${FONT_STACK}`;
  drawCurvedArcText(
    ctx,
    "INSIDE THE",
    cx,
    cy,
    radius - 17,
    -Math.PI * 0.78,
    -Math.PI * 0.22,
    false
  );
  drawCurvedArcText(
    ctx,
    "ISLE OF MAN",
    cx,
    cy,
    radius - 17,
    Math.PI * 0.8,
    Math.PI * 0.2,
    true
  );

  const logoSize = radius * 1.04;
  ctx.drawImage(
    logoImg,
    cx - logoSize / 2,
    cy - logoSize / 2,
    logoSize,
    logoSize
  );
  ctx.restore();
}

function drawDomainPill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number
) {
  const label = "insidetheiom.com";
  ctx.save();
  ctx.font = `700 22px ${FONT_STACK}`;
  const textW = ctx.measureText(label).width;
  const pillW = textW + 52;
  const pillH = 48;
  const x = cx - pillW / 2;
  const y = cy - pillH / 2;
  const r = pillH / 2;

  ctx.beginPath();
  ctx.roundRect(x, y, pillW, pillH, r);
  ctx.fillStyle = COLORS.iomRed;
  ctx.fill();

  ctx.fillStyle = COLORS.white;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, cy + 1);
  ctx.restore();
}

function drawSocialIconsStrip(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.6;

  // Instagram
  const igX = cx - 64;
  const igY = cy - 14;
  ctx.beginPath();
  ctx.roundRect(igX, igY, 28, 28, 7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(igX + 14, igY + 14, 6.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(igX + 21.5, igY + 6.5, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Facebook
  ctx.font = `800 30px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("f", cx, cy + 1);

  // TikTok
  const ttX = cx + 44;
  ctx.beginPath();
  ctx.arc(ttX + 7, cy + 8, 6.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ttX + 13.5, cy + 8);
  ctx.lineTo(ttX + 13.5, cy - 13);
  ctx.quadraticCurveTo(ttX + 19, cy - 7, ttX + 24, cy - 7);
  ctx.stroke();

  ctx.restore();
}

function drawSlantedBreakingBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  leftText: string,
  rightText: string
) {
  ctx.save();
  const skew = 16;
  ctx.font = `italic 800 28px ${FONT_STACK}`;
  const leftW = ctx.measureText(leftText).width + 52;
  const rightW = ctx.measureText(rightText).width + 52;
  const h = 54;

  const totalW = leftW + rightW - 8;
  const startX = cx - totalW / 2;

  ctx.beginPath();
  ctx.moveTo(startX + skew, y);
  ctx.lineTo(startX + leftW + skew, y);
  ctx.lineTo(startX + leftW, y + h);
  ctx.lineTo(startX, y + h);
  ctx.closePath();
  ctx.fillStyle = COLORS.iomRed;
  ctx.fill();

  ctx.fillStyle = COLORS.white;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(leftText, startX + leftW / 2 + skew / 2, y + h / 2 + 1);

  const rx = startX + leftW - 10;
  const ry = y + 10;
  ctx.beginPath();
  ctx.moveTo(rx + skew, ry);
  ctx.lineTo(rx + rightW + skew, ry);
  ctx.lineTo(rx + rightW, ry + h);
  ctx.lineTo(rx, ry + h);
  ctx.closePath();
  ctx.fillStyle = COLORS.white;
  ctx.fill();

  ctx.fillStyle = COLORS.black;
  ctx.fillText(rightText, rx + rightW / 2 + skew / 2, ry + h / 2 + 1);

  ctx.restore();
}

async function drawFullBleedPhotoWithScrim(
  ctx: CanvasRenderingContext2D,
  photoDataUrl: string | null | undefined,
  scrimStyle: "heavy" | "spotlight" | "editorial"
) {
  ctx.fillStyle = COLORS.black;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  if (photoDataUrl) {
    try {
      const photo = await loadImage(photoDataUrl);
      const scale = Math.max(WIDTH / photo.width, HEIGHT / photo.height);
      const dw = photo.width * scale;
      const dh = photo.height * scale;
      ctx.drawImage(photo, (WIDTH - dw) / 2, (HEIGHT - dh) / 2, dw, dh);
    } catch {
      // Fall back to dark atmospheric backdrop
    }
  } else {
    // Subtle dark editorial radial depth when no photo is loaded yet
    const bgGrad = ctx.createRadialGradient(
      WIDTH * 0.5,
      HEIGHT * 0.3,
      80,
      WIDTH * 0.5,
      HEIGHT * 0.4,
      820
    );
    bgGrad.addColorStop(0, "#1E1E24");
    bgGrad.addColorStop(1, "#0B0B0D");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  if (scrimStyle === "heavy") {
    grad.addColorStop(0, "rgba(11, 11, 13, 0.25)");
    grad.addColorStop(0.35, "rgba(11, 11, 13, 0.22)");
    grad.addColorStop(0.55, "rgba(11, 11, 13, 0.85)");
    grad.addColorStop(0.76, "rgba(11, 11, 13, 0.97)");
    grad.addColorStop(1, "#0B0B0D");
  } else if (scrimStyle === "spotlight") {
    grad.addColorStop(0, "rgba(11, 11, 13, 0.30)");
    grad.addColorStop(0.4, "rgba(11, 11, 13, 0.20)");
    grad.addColorStop(0.62, "rgba(11, 11, 13, 0.88)");
    grad.addColorStop(0.84, "rgba(11, 11, 13, 0.97)");
    grad.addColorStop(1, "#0B0B0D");
  } else {
    grad.addColorStop(0, "rgba(11, 11, 13, 0.35)");
    grad.addColorStop(0.38, "rgba(11, 11, 13, 0.22)");
    grad.addColorStop(0.58, "rgba(11, 11, 13, 0.88)");
    grad.addColorStop(1, "#0B0B0D");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

export async function renderEditorialGraphicPng(
  input: GraphicRenderInput
): Promise<GeneratedGraphicResult> {
  const variant: GraphicPlatformVariant = input.platformVariant || "instagram";
  const isTikTok = variant === "tiktok";

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is unavailable in this browser.");
  }

  const whiteLogo = isTikTok
    ? null
    : await loadImage("/brand/triskelion-white.png");
  const padX = 76;
  const contentWidth = WIDTH - padX * 2;

  if (input.template === "breaking") {
    // Template A — Breaking News (TikTok omits InsideTheIOM seal, insidetheiom.com pill, and social icons)
    await drawFullBleedPhotoWithScrim(ctx, input.photoDataUrl, "heavy");

    if (!isTikTok && whiteLogo) {
      drawCircularSeal(ctx, padX + 66, 128, 66, whiteLogo);
    }

    if (input.dateLabel) {
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.font = `700 17px ${FONT_STACK}`;
      ctx.fillText(input.dateLabel.toUpperCase(), WIDTH - padX, 128);
    }

    drawSlantedBreakingBadge(ctx, WIDTH / 2, isTikTok ? 620 : 575, "BREAKING", "NEWS");

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = COLORS.white;
    ctx.font = `800 54px ${FONT_STACK}`;
    const headlineLines = wrapLines(ctx, input.headline, contentWidth - 16, 4);
    let y = isTikTok ? 765 : 720;
    for (const line of headlineLines) {
      ctx.fillText(line, WIDTH / 2, y);
      y += 66;
    }

    if (input.supportingText.trim()) {
      y += 14;
      ctx.fillStyle = "#E4E4E7";
      ctx.font = `500 27px ${FONT_STACK}`;
      const bodyLines = wrapLines(
        ctx,
        input.supportingText,
        contentWidth - 36,
        3
      );
      for (const line of bodyLines) {
        ctx.fillText(line, WIDTH / 2, y);
        y += 38;
      }
    }

    if (!isTikTok) {
      drawDomainPill(ctx, WIDTH / 2, HEIGHT - 150);
      drawSocialIconsStrip(ctx, WIDTH / 2, HEIGHT - 82, "#71717A");
      if (input.photoCredit) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,0.42)";
        ctx.font = `500 13px ${FONT_STACK}`;
        ctx.fillText(input.photoCredit.slice(0, 72), WIDTH / 2, HEIGHT - 34);
        ctx.textAlign = "left";
      }
    }
  } else if (input.template === "general") {
    // Template B — Editorial Spotlight
    await drawFullBleedPhotoWithScrim(ctx, input.photoDataUrl, "spotlight");

    if (!isTikTok && whiteLogo) {
      drawCircularSeal(ctx, padX + 62, 124, 62, whiteLogo);
    }

    const cat = (input.categoryLabel || "ISLE OF MAN").toUpperCase();
    ctx.font = `700 15px ${FONT_STACK}`;
    const catW = ctx.measureText(cat).width + 32;
    ctx.fillStyle = "rgba(11,11,13,0.75)";
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(WIDTH - padX - catW, 106, catW, 36, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(cat, WIDTH - padX - catW / 2, 125);

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `800 56px ${FONT_STACK}`;
    const headlineLines = wrapLines(ctx, input.headline, contentWidth - 20, 4);
    let y = isTikTok ? 790 : 735;

    headlineLines.forEach((line, idx) => {
      if (idx === 0) {
        const tw = ctx.measureText(line).width + 28;
        ctx.fillStyle = COLORS.iomRed;
        ctx.fillRect(WIDTH / 2 - tw / 2, y - 50, tw, 64);
      }
      ctx.fillStyle = COLORS.white;
      ctx.fillText(line, WIDTH / 2, y);
      y += 72;
    });

    if (input.supportingText.trim()) {
      y += 12;
      ctx.fillStyle = "#D4D4D8";
      ctx.font = `500 26px ${FONT_STACK}`;
      const bodyLines = wrapLines(
        ctx,
        input.supportingText,
        contentWidth - 40,
        2
      );
      for (const line of bodyLines) {
        ctx.fillText(line, WIDTH / 2, y);
        y += 38;
      }
    }

    if (!isTikTok) {
      drawDomainPill(ctx, WIDTH / 2, HEIGHT - 150);
      drawSocialIconsStrip(ctx, WIDTH / 2, HEIGHT - 82, "#71717A");
      if (input.photoCredit) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,0.42)";
        ctx.font = `500 13px ${FONT_STACK}`;
        ctx.fillText(input.photoCredit.slice(0, 72), WIDTH / 2, HEIGHT - 34);
        ctx.textAlign = "left";
      }
    }
  } else {
    // Template C — Clean Feature Card
    await drawFullBleedPhotoWithScrim(ctx, input.photoDataUrl, "editorial");

    if (!isTikTok && whiteLogo) {
      const logoSize = 56;
      ctx.drawImage(whiteLogo, padX, 74, logoSize, logoSize);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = `800 24px ${FONT_STACK}`;
      const p1 = "InsideThe";
      const tx = padX + logoSize + 16;
      ctx.fillStyle = COLORS.white;
      ctx.fillText(p1, tx, 94);
      const p1w = ctx.measureText(p1).width;
      ctx.fillStyle = COLORS.iomRed;
      ctx.fillText("IOM", tx + p1w, 94);

      ctx.fillStyle = "rgba(255,255,255,0.68)";
      ctx.font = `700 11px ${FONT_STACK}`;
      ctx.fillText("THE ISLE OF MAN ALL IN ONE PLACE", tx, 118);
    }

    if (input.dateLabel) {
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = `600 16px ${FONT_STACK}`;
      ctx.fillText(input.dateLabel.toUpperCase(), WIDTH - padX, 102);
      ctx.textAlign = "left";
    }

    const cat = (input.categoryLabel || "ISLE OF MAN").toUpperCase();
    ctx.fillStyle = COLORS.iomRed;
    ctx.fillRect(padX, isTikTok ? 720 : 665, 64, 5);

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#FCA5A5";
    ctx.font = `700 18px ${FONT_STACK}`;
    ctx.fillText(cat, padX, isTikTok ? 759 : 704);

    ctx.fillStyle = COLORS.white;
    ctx.font = `800 56px ${FONT_STACK}`;
    const headlineLines = wrapLines(ctx, input.headline, contentWidth, 4);
    let y = isTikTok ? 829 : 774;
    for (const line of headlineLines) {
      ctx.fillText(line, padX, y);
      y += 68;
    }

    if (input.supportingText.trim()) {
      y += 14;
      ctx.fillStyle = "#D4D4D8";
      ctx.font = `400 27px ${FONT_STACK}`;
      const bodyLines = wrapLines(ctx, input.supportingText, contentWidth, 3);
      for (const line of bodyLines) {
        ctx.fillText(line, padX, y);
        y += 38;
      }
    }

    if (!isTikTok) {
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padX, HEIGHT - 134);
      ctx.lineTo(WIDTH - padX, HEIGHT - 134);
      ctx.stroke();

      drawDomainPill(ctx, padX + 122, HEIGHT - 78);
      drawSocialIconsStrip(ctx, WIDTH - padX - 80, HEIGHT - 78, "#A1A1AA");
      if (input.photoCredit) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,0.42)";
        ctx.font = `500 13px ${FONT_STACK}`;
        ctx.fillText(input.photoCredit.slice(0, 72), WIDTH / 2, HEIGHT - 28);
        ctx.textAlign = "left";
      }
    }
  }

  const mimeType: "image/png" | "image/jpeg" = isTikTok
    ? "image/jpeg"
    : "image/png";

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error(`Failed to encode ${mimeType} blob.`));
        else resolve(b);
      },
      mimeType,
      isTikTok ? 0.92 : undefined
    );
  });

  const dataUrl = canvas.toDataURL(mimeType, isTikTok ? 0.92 : undefined);

  return {
    blob,
    dataUrl,
    width: WIDTH,
    height: HEIGHT,
    mimeType,
    platformVariant: variant,
  };
}
