import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SafeAreaTopScrim } from "@hatch/space-sdk/client";
import { api, type ApiResponse } from "./api";

type Movie = ApiResponse<typeof api, "searchMovies">["results"][number];
type Poster = ApiResponse<typeof api, "getPoster">;

const GRID_SIZES = [9, 12, 15] as const;

interface BgOption {
  id: string;
  label: string;
  color: string;
  light: boolean;
}

const BACKGROUNDS: BgOption[] = [
  { id: "abyss", label: "Black", color: "#101013", light: false },
  { id: "slate", label: "Charcoal", color: "#23262b", light: false },
  { id: "pine", label: "Slate", color: "#334155", light: false },
  { id: "glacier", label: "White", color: "#f4f4f5", light: true },
];

function bgOption(id: string): BgOption {
  return BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0]!;
}

function resizeSlots(
  slots: (Movie | null)[],
  size: number,
): (Movie | null)[] {
  const out = slots.slice(0, size);
  while (out.length < size) out.push(null);
  return out;
}

function movieSubline(m: Movie): string {
  const parts: string[] = [];
  if (m.year != null) parts.push(String(m.year));
  if (m.cast) parts.push(m.cast);
  return parts.join(" · ");
}

/* ---------------------------------- icons --------------------------------- */

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.8-3.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v11m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TypeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 6V4h14v2M12 4v16m-3 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------ poster export ----------------------------- */

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function clipRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

async function exportPosterPng(poster: Poster): Promise<void> {
  const bg = bgOption(poster.background);
  const cols = 3;
  const rows = poster.gridSize / cols;
  const cellW = 400;
  const cellH = 593;
  const gap = 22;
  const pad = 64;
  const radius = 20;
  const titleText = poster.title.trim();
  const titleH = titleText ? 132 : 0;
  const footerH = 64;
  const width = pad * 2 + cols * cellW + (cols - 1) * gap;
  const height = pad * 2 + titleH + rows * cellH + (rows - 1) * gap + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");

  ctx.fillStyle = bg.color;
  ctx.fillRect(0, 0, width, height);

  if (titleText) {
    ctx.fillStyle = bg.light ? "#171717" : "#fafafa";
    ctx.font = "800 62px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(titleText, width / 2, pad + titleH / 2 - 14, width - pad * 2);
    ctx.fillStyle = "#3b82f6";
    const lineW = 120;
    clipRoundedRect(ctx, width / 2 - lineW / 2, pad + titleH - 26, lineW, 5, 3);
    ctx.fill();
  }

  const images = await Promise.all(
    poster.slots.map((s) => (s ? loadImage(s.posterLg) : Promise.resolve(null))),
  );

  for (let i = 0; i < poster.gridSize; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (cellW + gap);
    const y = pad + titleH + row * (cellH + gap);
    const img = images[i] ?? null;
    if (img) {
      ctx.save();
      clipRoundedRect(ctx, x, y, cellW, cellH, radius);
      ctx.clip();
      ctx.drawImage(img, x, y, cellW, cellH);
      ctx.restore();
    } else {
      ctx.fillStyle = bg.light ? "#d4d4d8" : "#26262a";
      clipRoundedRect(ctx, x, y, cellW, cellH, radius);
      ctx.fill();
      ctx.fillStyle = bg.light ? "#737373" : "#a3a3a3";
      ctx.font = "700 72px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), x + cellW / 2, y + cellH / 2);
    }
  }

  const filledCount = poster.slots.filter((s) => s != null).length;
  const gridBottom = pad + titleH + rows * cellH + (rows - 1) * gap;
  ctx.fillStyle = bg.light ? "#737373" : "#8e8e93";
  ctx.font = "700 27px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      "6px";
  } catch {
    /* letterSpacing unsupported — footer still renders */
  }
  ctx.fillText(
    `${poster.gridSize} MOVIES · RANKED ${filledCount} OF ${poster.gridSize}`,
    width / 2,
    gridBottom + footerH / 2 + 6,
    width - pad * 2,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("Could not render the poster image.");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "movies-poster.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* --------------------------------- editor --------------------------------- */

function Editor({ initial }: { initial: Poster }) {
  const [poster, setPoster] = useState<Poster>(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const [swapFrom, setSwapFrom] = useState<number | null>(null);
  const [searchSlot, setSearchSlot] = useState<number | null>(null);
  const [pendingSize, setPendingSize] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useMutation({
    mutationFn: (p: Poster) =>
      api.savePoster({
        gridSize: p.gridSize,
        title: p.title,
        background: p.background,
        slots: p.slots,
      }),
  });

  function commit(next: Poster) {
    setPoster(next);
    save.mutate(next);
  }

  const filled = poster.slots.filter((s) => s != null).length;
  const progress = poster.gridSize > 0 ? (filled / poster.gridSize) * 100 : 0;
  const bg = bgOption(poster.background);
  const selectedMovie =
    selected != null ? (poster.slots[selected] ?? null) : null;

  function onSlotTap(i: number) {
    if (swapFrom != null) {
      if (i !== swapFrom) {
        const slots = [...poster.slots];
        const tmp = slots[swapFrom] ?? null;
        slots[swapFrom] = slots[i] ?? null;
        slots[i] = tmp;
        commit({ ...poster, slots });
      }
      setSwapFrom(null);
      setSelected(null);
      return;
    }
    if (poster.slots[i] == null) {
      setSelected(null);
      setSearchSlot(i);
    } else {
      setSelected(selected === i ? null : i);
    }
  }

  function requestSize(size: number) {
    if (size === poster.gridSize) return;
    const dropped = poster.slots
      .slice(size)
      .filter((s) => s != null).length;
    if (dropped > 0) {
      setPendingSize(size);
    } else {
      applySize(size);
    }
  }

  function applySize(size: number) {
    setPendingSize(null);
    setSelected(null);
    setSwapFrom(null);
    commit({
      ...poster,
      gridSize: size,
      slots: resizeSlots(poster.slots, size),
    });
  }

  function pickMovie(movie: Movie) {
    if (searchSlot == null) return;
    const slots = [...poster.slots];
    slots[searchSlot] = movie;
    commit({ ...poster, slots });
    setSearchSlot(null);
    setSelected(null);
  }

  function removeSelected() {
    if (selected == null) return;
    const slots = [...poster.slots];
    slots[selected] = null;
    commit({ ...poster, slots });
    setSelected(null);
  }

  function clearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    setSelected(null);
    setSwapFrom(null);
    commit({
      ...poster,
      slots: Array<Movie | null>(poster.gridSize).fill(null),
    });
  }

  async function onDownload() {
    setExportError(null);
    setDownloading(true);
    try {
      await exportPosterPng(poster);
    } catch (e) {
      setExportError(
        e instanceof Error ? e.message : "Poster download failed.",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-14 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pt-6">
        <div>
          <h1 className="text-2xl leading-tight font-bold tracking-tight text-[var(--text)]">
            Build your poster
          </h1>
          <p className="mt-1 text-sm text-[var(--dim)]">
            Pick 9, 12, or 15 movies, arrange them in order, and export a
            high-resolution poster.
          </p>
        </div>
        <p
          className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--dim)]"
          aria-live="polite"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              save.isPending
                ? "animate-pulse bg-[var(--accent-2)]"
                : save.isError
                  ? "bg-red-400"
                  : "bg-[var(--accent-3)]"
            }`}
          />
          {save.isPending ? "Saving…" : save.isError ? "Save failed" : "Autosaved"}
        </p>
      </div>

      {/* Controls */}
      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-[0_14px_36px_-20px_rgba(0,0,0,0.85)]">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex rounded-full border border-[var(--border)] bg-[var(--bg-deep)] p-1"
            role="group"
            aria-label="Grid size"
          >
            {GRID_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                aria-label={`${size} movies`}
                aria-pressed={poster.gridSize === size}
                onClick={() => requestSize(size)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  poster.gridSize === size
                    ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-[0_4px_14px_-4px_rgba(59,130,246,0.6)]"
                    : "text-[var(--dim)] hover:text-[var(--text)]"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          <span
            className="ml-auto flex items-center gap-2 text-sm font-medium text-[var(--dim)] tabular-nums"
            aria-live="polite"
          >
            {filled === poster.gridSize && filled > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                <CheckIcon />
                Complete
              </span>
            )}
            <span>
              <span className="font-bold text-[var(--text)]">{filled}</span> of{" "}
              {poster.gridSize} movies
            </span>
          </span>
        </div>
        <div
          className="mt-3.5 h-2 overflow-hidden rounded-full bg-[var(--bg-deep)]"
          role="progressbar"
          aria-valuenow={filled}
          aria-valuemin={0}
          aria-valuemax={poster.gridSize}
          aria-label="Poster progress"
        >
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {pendingSize != null && (
        <div className="animate-pop-in mt-3 rounded-2xl border border-[var(--accent)]/40 bg-[var(--surface)] p-3.5 shadow-lg">
          <p className="text-sm text-[var(--text)]">
            Shrinking to {pendingSize} removes the movies ranked past slot{" "}
            {pendingSize}. Keep going?
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => applySize(pendingSize)}
              className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--on-accent)] transition hover:brightness-105 active:scale-[0.98]"
            >
              Change to {pendingSize}
            </button>
            <button
              type="button"
              onClick={() => setPendingSize(null)}
              className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--text)] transition hover:bg-white/5 active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      <label
        htmlFor="poster-title"
        className="mt-7 block text-sm font-semibold text-[var(--text)]"
      >
        Poster title{" "}
        <span className="font-normal text-[var(--dim)]">(optional)</span>
      </label>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--dim-2)]">
          <TypeIcon />
        </span>
        <input
          id="poster-title"
          type="text"
          value={poster.title}
          maxLength={90}
          placeholder="e.g. My favorite movies"
          onChange={(e) => {
            const next = { ...poster, title: e.target.value };
            setPoster(next);
            if (titleTimer.current) clearTimeout(titleTimer.current);
            titleTimer.current = setTimeout(() => save.mutate(next), 600);
          }}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pr-3 pl-10 text-base text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition placeholder:text-[var(--dim-2)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30 focus:outline-none"
        />
      </div>

      {/* Poster */}
      <div
        className="animate-poster-in mt-5 rounded-[24px] p-3 shadow-[0_32px_70px_-24px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.07)] transition-colors duration-500 sm:p-4"
        style={{ backgroundColor: bg.color }}
      >
        {poster.title.trim() && (
          <div className="px-1 pt-1.5 pb-4">
            <p
              className="text-center text-[22px] leading-tight font-extrabold tracking-tight"
              style={{ color: bg.light ? "#171717" : "#fafafa" }}
            >
              {poster.title.trim()}
            </p>
            <div
              className="mx-auto mt-3 h-[3px] w-14 rounded-full"
              style={{ backgroundColor: "#3b82f6" }}
            />
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {poster.slots.map((slot, i) => {
            const isSelected = selected === i;
            const isSwapSource = swapFrom === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSlotTap(i)}
                aria-label={
                  slot
                    ? `Slot ${i + 1}: ${slot.title}${slot.year != null ? ` (${slot.year})` : ""}`
                    : `Slot ${i + 1}: empty — tap to search for a movie`
                }
                className={`group relative aspect-[2/3] w-full overflow-hidden rounded-lg transition-all duration-200 focus-visible:ring-3 focus-visible:ring-[var(--accent)] focus-visible:outline-none active:scale-[0.98] ${
                  isSelected || isSwapSource
                    ? "ring-3 ring-[var(--accent)]"
                    : slot
                      ? "hover:ring-2 hover:ring-white/40"
                      : ""
                }`}
                style={{
                  backgroundColor: bg.light ? "#d4d4d8" : "#26262a",
                }}
              >
                {slot ? (
                  <>
                    <img
                      src={slot.posterMd}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-1.5 pt-6 pb-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <span className="block truncate text-left text-[10px] leading-tight font-semibold text-white">
                        {slot.title}
                      </span>
                      <span className="block truncate text-left text-[10px] leading-tight text-white/75">
                        {movieSubline(slot)}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-1.5 rounded-md border border-dashed"
                      style={{
                        borderColor: bg.light
                          ? "rgba(23,23,23,0.28)"
                          : "rgba(163,163,163,0.35)",
                      }}
                    />
                    <span
                      className="relative flex h-full w-full flex-col items-center justify-center gap-2"
                      style={{ color: bg.light ? "#525252" : "#a3a3a3" }}
                    >
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 group-hover:scale-110 group-hover:text-[var(--accent)]"
                        style={{
                          backgroundColor: bg.light
                            ? "rgba(23,23,23,0.06)"
                            : "rgba(255,255,255,0.05)",
                          boxShadow: `inset 0 0 0 1.5px ${bg.light ? "rgba(23,23,23,0.16)" : "rgba(255,255,255,0.14)"}`,
                        }}
                      >
                        <PlusIcon />
                      </span>
                      <span className="text-xs font-medium">Add movie</span>
                    </span>
                  </>
                )}
                <span
                  className={`absolute top-1.5 left-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[11px] font-bold ring-1 backdrop-blur-sm ${
                    i < 3 && slot
                      ? "bg-[#3b82f6] text-white ring-blue-200/50"
                      : "bg-black/55 text-white ring-white/20"
                  }`}
                >
                  {i + 1}
                </span>
                {isSwapSource && (
                  <span className="absolute right-1.5 bottom-1.5 z-10 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--on-accent)]">
                    Swapping
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p
          className="pt-3.5 pb-0.5 text-center text-[10px] font-bold tracking-[0.22em] uppercase"
          style={{ color: bg.light ? "#737373" : "#8e8e93" }}
        >
          {poster.gridSize} movies · ranked {filled} of {poster.gridSize}
        </p>
      </div>

      <p className="mt-3.5 text-center text-sm text-[var(--dim)]" aria-live="polite">
        {swapFrom != null
          ? `Swapping slot ${swapFrom + 1} — tap another slot to swap, or tap it again to cancel.`
          : "Tap an empty slot to search for a movie. Tap a filled slot to replace, swap, or remove it."}
      </p>

      {/* Selected movie actions */}
      {selected != null && selectedMovie && (
        <div className="animate-pop-in mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-3">
            <img
              src={selectedMovie.posterMd}
              alt=""
              className="h-16 w-11 shrink-0 rounded-md object-cover shadow-md ring-1 ring-white/10"
            />
            <p className="min-w-0 text-sm text-[var(--text)]">
              <span className="font-bold text-[var(--accent)]">
                #{selected + 1}
              </span>{" "}
              <span className="font-semibold">{selectedMovie.title}</span>
              <span className="block truncate text-[var(--dim)]">
                {movieSubline(selectedMovie)}
              </span>
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSearchSlot(selected)}
              className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-[var(--on-accent)] transition hover:brightness-105 active:scale-[0.98]"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => {
                setSwapFrom(selected);
                setSelected(null);
              }}
              className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--text)] transition hover:bg-white/5 active:scale-[0.98]"
            >
              Swap…
            </button>
            <button
              type="button"
              onClick={removeSelected}
              className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--text)] transition hover:bg-white/5 active:scale-[0.98]"
            >
              Remove
            </button>
            <button
              type="button"
              aria-label="Close slot actions"
              onClick={() => setSelected(null)}
              className="ml-auto rounded-full px-3 py-1.5 text-sm font-medium text-[var(--dim)] transition hover:text-[var(--text)]"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Background picker */}
      <div className="mt-7">
        <p className="text-sm font-semibold text-[var(--text)]">
          Poster background
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {BACKGROUNDS.map((b) => {
            const active = poster.background === b.id;
            return (
              <button
                key={b.id}
                type="button"
                aria-label={`Background: ${b.label}`}
                aria-pressed={active}
                onClick={() => commit({ ...poster, background: b.id })}
                className={`group flex items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-1.5 transition-all duration-200 active:scale-[0.98] ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                }`}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-white/20"
                  style={{
                    backgroundColor: b.color,
                    color: b.light ? "#171717" : "#fafafa",
                  }}
                >
                  {active && <CheckIcon />}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    active ? "text-[var(--text)]" : "text-[var(--dim)]"
                  }`}
                >
                  {b.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Download + clear */}
      <div className="mt-7 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--on-accent)] shadow-[0_10px_24px_-10px_rgba(59,130,246,0.7)] transition hover:bg-[var(--accent-strong)] active:scale-[0.99] disabled:opacity-60 sm:flex-none sm:px-6"
        >
          <DownloadIcon />
          {downloading ? "Rendering…" : "Download poster (PNG)"}
        </button>
        <button
          type="button"
          onClick={clearAll}
          className={`rounded-full border px-4 py-3 text-sm font-medium transition active:scale-[0.98] ${
            confirmClear
              ? "border-red-400/70 bg-red-400/10 text-red-300"
              : "border-[var(--border)] text-[var(--dim)] hover:text-[var(--text)]"
          }`}
        >
          {confirmClear ? "Tap again to clear everything" : "Clear all"}
        </button>
      </div>
      <p className="mt-2.5 text-xs text-[var(--dim-2)]">
        High-resolution PNG, ready to print or share.
      </p>
      {exportError && (
        <p className="mt-2 text-sm text-red-300" role="alert">
          {exportError}
        </p>
      )}
      {save.isError && (
        <p className="mt-2 text-sm text-red-300" role="alert">
          Saving failed — your latest change may not be kept.
        </p>
      )}

      <p className="mt-10 text-center text-xs text-[var(--dim-2)]">
        Autosaves as you go · Poster art via IMDb
      </p>

      {searchSlot != null && (
        <SearchSheet
          slot={searchSlot}
          onPick={pickMovie}
          onClose={() => setSearchSlot(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------- search sheet ------------------------------ */

function SearchSheet({
  slot,
  onPick,
  onClose,
}: {
  slot: number;
  onPick: (movie: Movie) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQuery(input.trim()), 350);
    return () => clearTimeout(t);
  }, [input]);

  const search = useQuery({
    queryKey: ["movie-search", query],
    queryFn: () => api.searchMovies({ query }),
    enabled: query.length >= 2,
  });

  const results = search.data?.results ?? [];

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Search for a movie for slot ${slot + 1}`}
      onClick={onClose}
    >
      <div
        className="animate-sheet-in flex max-h-[86vh] w-full max-w-xl flex-col rounded-t-[22px] bg-[#17171a] p-4 pb-safe shadow-2xl ring-1 ring-white/10 sm:rounded-[22px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-white/15 sm:hidden" />
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold tracking-tight text-[var(--text)]">
            <span className="text-[var(--accent)]">#{slot + 1}</span> — find a
            movie
          </h2>
          <button
            type="button"
            aria-label="Close search"
            onClick={onClose}
            className="ml-auto rounded-full border border-[var(--border)] p-1.5 text-[var(--dim)] transition hover:bg-white/5 hover:text-[var(--text)]"
          >
            <CloseIcon />
          </button>
        </div>

        <label htmlFor="movie-search-input" className="sr-only">
          Search movies by title
        </label>
        <div className="relative mt-3">
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--dim-2)]">
            <SearchIcon />
          </span>
          <input
            id="movie-search-input"
            type="search"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Movie title — e.g. Alien"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3 pr-3 pl-10 text-base text-[var(--text)] transition placeholder:text-[var(--dim-2)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30 focus:outline-none"
          />
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {query.length < 2 && (
            <p className="py-8 text-center text-sm text-[var(--dim)]">
              Start typing to search for a movie.
            </p>
          )}
          {query.length >= 2 && search.isPending && (
            <div
              className="grid grid-cols-3 gap-2"
              aria-label="Searching"
              role="status"
            >
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[2/3] w-full rounded-lg bg-[var(--surface-2)]" />
                  <div className="mt-1.5 h-3 w-4/5 rounded bg-[var(--surface-2)]" />
                  <div className="mt-1 h-3 w-3/5 rounded bg-[var(--surface-2)]" />
                </div>
              ))}
            </div>
          )}
          {query.length >= 2 && search.isError && (
            <p className="py-8 text-center text-sm text-red-300">
              Search failed. Check your connection and try again.
            </p>
          )}
          {query.length >= 2 &&
            search.isSuccess &&
            results.length === 0 && (
              <p className="py-8 text-center text-sm text-[var(--dim)]">
                No movies found for “{query}”. Check the spelling and try
                again.
              </p>
            )}
          {results.length > 0 && (
            <ul className="grid grid-cols-3 gap-2.5 pb-1">
              {results.map((r) => (
                <li key={r.imdbId}>
                  <button
                    type="button"
                    onClick={() => onPick(r)}
                    aria-label={`Pick ${r.title}${r.year != null ? ` (${r.year})` : ""} for slot ${slot + 1}`}
                    className="group w-full text-left transition active:scale-[0.98]"
                  >
                    <img
                      src={r.posterMd}
                      alt=""
                      className="aspect-[2/3] w-full rounded-lg object-cover shadow-md ring-1 ring-white/10 transition group-hover:ring-2 group-hover:ring-[var(--accent)]"
                      loading="lazy"
                    />
                    <span className="mt-1.5 block truncate text-xs font-semibold text-[var(--text)] transition group-hover:text-[var(--accent)]">
                      {r.title}
                    </span>
                    <span className="block truncate text-xs text-[var(--dim)]">
                      {r.year != null ? r.year : r.cast}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="pt-2.5 text-center text-xs text-[var(--dim-2)]">
          Movie search and poster art via IMDb.
        </p>
      </div>
    </div>
  );
}

/* ----------------------------------- app ----------------------------------- */

export function App() {
  const posterQuery = useQuery({
    queryKey: ["poster"],
    queryFn: () => api.getPoster({}),
  });

  return (
    <div className="min-h-screen text-[var(--text)]">
      <SafeAreaTopScrim backgroundColor="var(--bg)" />
      <main>
        {posterQuery.isPending && (
          <div className="flex flex-col items-center gap-3 py-20" role="status">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--surface-alt)] border-t-[var(--accent)]" />
            <p className="text-sm text-[var(--dim)]">Loading your poster…</p>
          </div>
        )}
        {posterQuery.isError && (
          <div className="mx-auto max-w-xl px-4 py-16 text-center">
            <p className="text-sm text-red-300">
              Couldn't load your saved poster.
            </p>
            <button
              type="button"
              onClick={() => posterQuery.refetch()}
              className="mt-3 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] transition hover:brightness-105 active:scale-[0.98]"
            >
              Retry
            </button>
          </div>
        )}
        {posterQuery.isSuccess && <Editor initial={posterQuery.data} />}
      </main>
    </div>
  );
}
