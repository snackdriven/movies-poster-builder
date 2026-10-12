// Actions for the Movies Poster Builder.
//
// - searchMovies: live movie search against the IMDb suggestion endpoint
//   (no key), returning real poster art URLs hosted on m.media-amazon.com.
//   Results are never stored.
// - getPoster / savePoster: the user's one saved poster (grid size, title,
//   background, ordered slots). Starts completely empty; the user fills
//   every slot themselves via search.

import { defineAction, z, type ActionsModule } from "@hatch/space-sdk";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

const movieSchema = z.object({
  imdbId: z.string(),
  title: z.string(),
  year: z.number().nullable(),
  cast: z.string(),
  posterMd: z.string(),
  posterLg: z.string(),
});

type Movie = z.infer<typeof movieSchema>;

const posterResponse = z.object({
  gridSize: z.number(),
  title: z.string(),
  background: z.string(),
  slots: z.array(movieSchema.nullable()),
});

type PosterState = z.infer<typeof posterResponse>;

const GRID_SIZES = [9, 12, 15] as const;

const BACKGROUND_IDS = ["abyss", "slate", "pine", "glacier"] as const;

function normalizeBackground(value: string): string {
  return (BACKGROUND_IDS as readonly string[]).includes(value)
    ? value
    : "abyss";
}

function emptyPoster(): PosterState {
  return {
    gridSize: 9,
    title: "",
    background: "abyss",
    slots: Array<Movie | null>(9).fill(null),
  };
}

function normalizeSlots(
  slots: (Movie | null)[],
  gridSize: number,
): (Movie | null)[] {
  const out = slots.slice(0, gridSize);
  while (out.length < gridSize) out.push(null);
  return out;
}

/** Derive a sized poster variant from IMDb's `._V1_.jpg` URL form. */
function sizedPoster(url: string, w: number, h: number): string {
  if (!url.includes("._V1_")) return url;
  return url.replace(
    /\._V1_.*(\.(?:jpg|jpeg|png))$/i,
    `._V1_UX${w}_CR0,0,${w},${h}_AL_$1`,
  );
}

interface ImdbSuggestionRaw {
  id?: unknown;
  l?: unknown;
  y?: unknown;
  qid?: unknown;
  s?: unknown;
  i?: { imageUrl?: unknown } | null;
}

export const Actions = {
  searchMovies: defineAction({
    request: z.object({
      query: z.string().trim().min(1).max(120),
    }),
    response: z.object({
      results: z.array(movieSchema),
    }),
    async handler(_ctx, args): Promise<{ results: Movie[] }> {
      const q = args.query.toLowerCase();
      const bucket = q.charAt(0);
      if (!bucket) return { results: [] };
      const url =
        "https://v2.sg.media-imdb.com/suggestion/" +
        encodeURIComponent(bucket) +
        "/" +
        encodeURIComponent(q) +
        ".json";
      let data: { d?: ImdbSuggestionRaw[] };
      try {
        const res = await fetch(url, {
          headers: {
            accept: "application/json",
            "user-agent": "Mozilla/5.0",
          },
        });
        if (!res.ok) return { results: [] };
        data = (await res.json()) as { d?: ImdbSuggestionRaw[] };
      } catch {
        return { results: [] };
      }
      const seen = new Set<string>();
      const results: Movie[] = [];
      for (const raw of data.d ?? []) {
        const id = typeof raw.id === "string" ? raw.id : null;
        const title = typeof raw.l === "string" ? raw.l : null;
        const imageUrl =
          raw.i && typeof raw.i.imageUrl === "string" ? raw.i.imageUrl : null;
        if (
          id == null ||
          !id.startsWith("tt") ||
          raw.qid !== "movie" ||
          !title ||
          !imageUrl ||
          seen.has(id)
        ) {
          continue;
        }
        seen.add(id);
        results.push({
          imdbId: id,
          title,
          year: typeof raw.y === "number" ? raw.y : null,
          cast: typeof raw.s === "string" ? raw.s : "",
          posterMd: sizedPoster(imageUrl, 400, 593),
          posterLg: sizedPoster(imageUrl, 800, 1186),
        });
      }
      return { results };
    },
  }),

  getPoster: defineAction({
    request: z.object({}),
    response: posterResponse,
    async handler(ctx): Promise<PosterState> {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.poster)
        .where(eq(schema.poster.id, 1))
        .limit(1);
      const row = rows[0];
      if (!row) return emptyPoster();
      const gridSize = (GRID_SIZES as readonly number[]).includes(row.gridSize)
        ? row.gridSize
        : 9;
      let slots: (Movie | null)[] = [];
      try {
        const parsed: unknown = JSON.parse(row.slots);
        if (Array.isArray(parsed)) {
          slots = parsed.map((s) => {
            const p = movieSchema.safeParse(s);
            return p.success ? p.data : null;
          });
        }
      } catch {
        slots = [];
      }
      return {
        gridSize,
        title: row.title,
        background: normalizeBackground(row.background),
        slots: normalizeSlots(slots, gridSize),
      };
    },
  }),

  savePoster: defineAction({
    request: z.object({
      gridSize: z.number().int(),
      title: z.string().max(90),
      background: z.string().max(30),
      slots: z.array(movieSchema.nullable()).max(15),
    }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const gridSize = (GRID_SIZES as readonly number[]).includes(args.gridSize)
        ? args.gridSize
        : 9;
      const background = normalizeBackground(args.background);
      const slots = normalizeSlots(args.slots, gridSize);
      const db = ctx.db<typeof schema>();
      const values = {
        id: 1,
        gridSize,
        title: args.title,
        background,
        slots: JSON.stringify(slots),
        updatedAt: new Date(),
      };
      await db
        .insert(schema.poster)
        .values(values)
        .onConflictDoUpdate({
          target: schema.poster.id,
          set: {
            gridSize: values.gridSize,
            title: values.title,
            background: values.background,
            slots: values.slots,
            updatedAt: values.updatedAt,
          },
        });
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),
} satisfies ActionsModule;
