# Data Plan

## Context provenance
- `do the same thing w a top movies please` (verbatim build request — a direct remake of the Albums Poster Builder the user already has, swapping albums for movies)
- Parent agent's accepted framing, relayed in the conversation: `same deal as the albums one: empty grid to start, 9/12/15 sizes, search by title with real poster art, ranked slots, PNG export, same neutral professional look` (assistant proposal the current request builds on; defines the feature parity target)
- The existing Albums Poster Builder at `~/workspace/ts-spaces/albums-poster-builder/` was read in full (App.tsx, actions.ts, schema.ts, theme.css, drizzle) and is the structural template: one saved poster row (id=1), grid sizes 9/12/15, 3-column grid, background picker (Black/Charcoal/Slate/White), optional poster title, tap-to-search slots, replace/swap/remove, autosave, canvas PNG export.
- User visual preferences from standing context: dark mode, Inter for body text, clean sans-serif — the albums builder already encodes exactly this (zinc neutrals, standard blue accent, Inter), so it carries over unchanged.

## Tested sources
### IMDb suggestion API (v2.sg.media-imdb.com) — movie search + poster art
**Used by**: `searchMovies` server action (server-side fetch; results never stored, only user-picked movies persist in the poster slots)
**Test command**: `curl -s -A "Mozilla/5.0" 'https://v2.sg.media-imdb.com/suggestion/a/alien.json'` and the same pattern for `t/the%20shawshank%20redemption`, `s/shawshank`, `h/heat`, `p/pulp%20fiction`, `t/toy%20story%203`
**Sample output**: JSON `d[]` entries with `id` (tt0078748), `l` ("Alien"), `y` (1979), `qid` ("movie"), `s` (cast string "Sigourney Weaver, Tom Skerritt"), and `i.imageUrl` = `https://m.media-amazon.com/images/M/MV5BN2NhMDk2MmEtZDQzOC00MmY5LThhYzAtMDdjZGFjOGZjMjdjXkEyXkFqcGc@._V1_.jpg` (full-res poster). Multi-word and partial-title queries all returned the correct feature film as the top hit.
**Processing**: Bucket path is `<first letter of query>/<url-encoded query>.json`. Filter to `qid === "movie"` with a poster image present; dedupe by IMDb id. Derive sized variants by replacing `._V1_.jpg` with `._V1_UX400_CR0,0,400,593_AL_.jpg` (grid/search thumbnails) and `._V1_UX800_CR0,0,800,1186_AL_.jpg` (poster display + PNG export) — both variants verified HTTP 200. Fall back to the original URL when the pattern does not match.

### m.media-amazon.com image CDN — poster bytes
**Used by**: client `<img>` rendering and the canvas PNG export (loaded with `crossOrigin="anonymous"`, same as the albums builder's Deezer covers)
**Test command**: `curl -sI -H "Origin: https://example.com" 'https://m.media-amazon.com/images/M/MV5BN2NhMDk2MmEtZDQzOC00MmY5LThhYzAtMDdjZGFjOGZjMjdjXkEyXkFqcGc@._V1_.jpg'`
**Sample output**: HTTP 200, `Content-Type: image/jpeg`, `Access-Control-Allow-Origin: *` — canvas export will not be tainted.
**Processing**: URLs stored per picked movie in the poster slot JSON (posterMd / posterLg), exactly like album coverMd/coverLg.

## Rejected approaches
- **Tried**: iTunes Search API (`https://itunes.apple.com/search?term=...&media=movie&entity=movie`) — the standard no-key movie source.
  **Why rejected**: Returned `{"resultCount":0,"results":[]}` for every query tried (Alien, Star Wars, Shawshank, with/without country=US and browser UA) from this environment. The IMDb suggestion API returned rich, correct results on the first try.
- **Tried**: TMDB / OMDb APIs.
  **Why rejected**: Both require an API key this artifact does not have; the IMDb suggestion endpoint needs none and returns poster art, year, and cast in one call.
- **Imagery**: No build-time or generated imagery. All imagery is real movie poster art fetched at runtime from the tested source above — that is the product's core content, same as album covers in the sister artifact.

## Long-term data behavior
- **Refresh policy**: None — search is live per keystroke (debounced) against the IMDb endpoint; the saved poster is user-owned state that changes only when the user edits it. No cron/refresh triggers.
- **Growth**: Single-row poster table (id=1, upserted), capped at 15 slots. Search results are never persisted.
- **Ordering**: Slots are strictly rank-ordered 1..N by position; swap/replace/remove preserve the user's ranking.
- **Time semantics**: Only `updated_at` on the poster row (a save instant, viewer-local if ever shown); movie years are release years from the source, not datetimes.
