import {
  BACKGROUNDS,
  posterDimensions,
  type Format,
  type Poster,
} from "./poster";

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const timeout = setTimeout(() => {
      image.src = "";
      reject(
        new Error(
          "A cover timed out. Try again, replace it, or use a local upload.",
        ),
      );
    }, 15000);
    image.onload = () => {
      clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timeout);
      reject(
        new Error(
          "A cover could not be loaded. Replace it or use a local upload before exporting.",
        ),
      );
    };
    image.src = src;
  });
}
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  max: number,
): string {
  if (ctx.measureText(text).width <= max) return text;
  let end = text.length;
  while (end > 0 && ctx.measureText(text.slice(0, end) + "…").width > max)
    end--;
  return text.slice(0, end) + "…";
}
export async function exportPosterPng(poster: Poster, format: Format) {
  if (poster.slots.some((a) => !a))
    throw new Error("Fill every slot before creating a poster.");
  await document.fonts.ready;
  const [width, height] = posterDimensions(poster.gridSize, format);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  const bg =
    BACKGROUNDS.find((b) => b.id === poster.background) ?? BACKGROUNDS[0]!;
  ctx.fillStyle = bg.color;
  ctx.fillRect(0, 0, width, height);
  const pad = Math.round(width * 0.04),
    rows = poster.gridSize / 3,
    gap = Math.round(width * 0.012);
  const header = format === "story" ? 180 : 200,
    footer = 80;
  const caption = poster.showCaptions ? (format === "story" ? 66 : 72) : 0;
  const cell = Math.floor(
    Math.min(
      (width - 2 * pad - 2 * gap) / 3,
      (((height - header - footer - (rows - 1) * gap) / rows - caption) * 2) /
        3,
    ),
  );
  const cellH = cell * 1.5;
  const gridWidth = cell * 3 + gap * 2,
    startX = (width - gridWidth) / 2;
  const gridHeight = rows * (cellH + caption) + (rows - 1) * gap,
    startY = header + (height - header - footer - gridHeight) / 2;
  const ink = bg.light ? "#171717" : "#fafafa";
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${format === "story" ? 42 : 64}px Inter, system-ui, sans-serif`;
  ctx.fillText(
    `${poster.gridSize} films that made me`,
    width / 2,
    format === "story" ? 85 : 85,
    width - 2 * pad,
  );
  if (poster.title.trim()) {
    ctx.font = `500 ${format === "story" ? 27 : 36}px Inter, system-ui, sans-serif`;
    ctx.fillText(
      `The films that made ${poster.title.trim()}`,
      width / 2,
      format === "story" ? 137 : 145,
      width - 2 * pad,
    );
  }
  const images = await Promise.all(
    poster.slots.map((a) => loadImage(a!.posterLg || a!.posterMd)),
  );
  poster.slots.forEach((movie, i) => {
    const a = movie!,
      x = startX + (i % 3) * (cell + gap),
      y = startY + Math.floor(i / 3) * (cellH + caption + gap),
      image = images[i];
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cell, cellH);
    ctx.clip();
    if (image) ctx.drawImage(image, x, y, cell, cellH);
    else {
      ctx.fillStyle = bg.light ? "#d4d4d8" : "#26262a";
      ctx.fillRect(x, y, cell, cellH);
      ctx.fillStyle = ink;
      ctx.font = `600 ${Math.round(cell * 0.07)}px Inter, system-ui, sans-serif`;
      ctx.fillText(
        fitText(ctx, a.title, cell * 0.88),
        x + cell / 2,
        y + cellH / 2,
        cell * 0.88,
      );
    }
    ctx.restore();
    if (poster.showCaptions) {
      ctx.fillStyle = ink;
      ctx.font = `600 ${format === "story" ? 17 : 24}px Inter, system-ui, sans-serif`;
      ctx.fillText(
        fitText(ctx, a.title, cell),
        x + cell / 2,
        y + cellH + caption * 0.35,
      );
      ctx.font = `400 ${format === "story" ? 15 : 21}px Inter, system-ui, sans-serif`;
      ctx.fillText(
        String(a.year ?? ""),
        x + cell / 2,
        y + cellH + caption * 0.72,
      );
    }
  });
  ctx.fillStyle = ink;
  ctx.font = `500 ${format === "story" ? 20 : 26}px Inter, system-ui, sans-serif`;
  ctx.fillText(
    `${poster.gridSize} movies • In my order`,
    width / 2,
    height - footer / 2,
    width - 2 * pad,
  );
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Could not render the poster image.");
  downloadBlob(
    blob,
    format === "story" ? "movies-story.png" : "movies-poster.png",
  );
  return blob;
}
export async function readCover(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a PNG, JPEG or WebP image.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose an image smaller than 10 MB.");
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (!img) throw new Error("This image could not be read.");
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 750;
    const ctx = canvas.getContext("2d")!;
    const cropW = Math.min(img.naturalWidth, (img.naturalHeight * 2) / 3);
    const cropH = cropW * 1.5;
    ctx.drawImage(
      img,
      (img.naturalWidth - cropW) / 2,
      (img.naturalHeight - cropH) / 2,
      cropW,
      cropH,
      0,
      0,
      500,
      750,
    );
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

