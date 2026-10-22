import { safeCover, type Movie } from "./poster";
const pending = new Map<string, Promise<Movie[]>>();
export function searchMovies(
  input: string,
  signal?: AbortSignal,
): Promise<Movie[]> {
  const match = input.match(/\s+(18\d{2}|19\d{2}|20\d{2})\s*$/);
  const year = match ? Number(match[1]) : null;
  const title = match ? input.slice(0, match.index).trim() : input;
  const query = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
  if (!query)
    return Promise.reject(
      new Error("Try an English title or add the film manually."),
    );
  let request = pending.get(query);
  if (!request) {
    request = new Promise<Movie[]>((resolve, reject) => {
      const callback = "imdb$" + query,
        globals = window as unknown as Record<string, unknown>,
        script = document.createElement("script");
      const cleanup = () => {
        clearTimeout(timer);
        script.remove();
        pending.delete(query);
        globals[callback] = () => {};
        const noop = globals[callback];
        setTimeout(() => {
          if (globals[callback] === noop) delete globals[callback];
        }, 30000);
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(
          new Error("Search timed out. Try again or add the film manually."),
        );
      }, 12000);
      globals[callback] = (data: { d?: Record<string, unknown>[] }) => {
        cleanup();
        if (!Array.isArray(data?.d)) {
          reject(new Error("Film search is unavailable."));
          return;
        }
        const seen = new Set<string>(),
          results: Movie[] = [];
        for (const item of data.d) {
          if (!item || typeof item !== "object") continue;
          const src = Array.isArray(item.i)
            ? item.i[0]
            : item.i && typeof item.i === "object" && "imageUrl" in item.i
              ? item.i.imageUrl
              : undefined;
          const image = typeof src === "string" ? safeCover(src) : "";
          if (
            typeof item.id !== "string" ||
            !/^tt\d+$/.test(item.id) ||
            item.qid !== "movie" ||
            typeof item.l !== "string" ||
            !image ||
            seen.has(item.id)
          )
            continue;
          seen.add(item.id);
          const sized = (w: number) =>
            image.replace(
              /\._V1_.*(\.(?:jpg|jpeg|png))$/i,
              "._V1_UX" + w + "_AL_$1",
            );
          results.push({
            imdbId: item.id,
            title: item.l.slice(0, 200),
            year:
              typeof item.y === "number" && Number.isInteger(item.y)
                ? item.y
                : null,
            cast: typeof item.s === "string" ? item.s.slice(0, 200) : "",
            posterMd: sized(400),
            posterLg: sized(800),
          });
        }
        resolve(results);
      };
      script.onerror = () => {
        cleanup();
        reject(
          new Error(
            "Search failed. Check your connection or add the film manually.",
          ),
        );
      };
      script.src =
        "https://v2.sg.media-imdb.com/suggests/" +
        query[0] +
        "/" +
        query +
        ".json";
      document.head.append(script);
    });
    pending.set(query, request);
  }
  return new Promise((resolve, reject) => {
    const abort = () =>
      reject(new DOMException("Search cancelled", "AbortError"));
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    request!
      .then(
        (results) =>
          resolve(
            year === null
              ? results
              : results.filter((movie) => movie.year === year),
          ),
        reject,
      )
      .finally(() => signal?.removeEventListener("abort", abort));
  });
}
