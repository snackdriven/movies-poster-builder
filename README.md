# Films That Made Me

Build a ranked grid of 9, 12, or 15 films and download a high-resolution poster or vertical story. Runs in the browser with no account required.

**I've got too much personality to fit into nine choices.**

So there's room for twelve. Or fifteen. Pick the favorites that rewired your brain,
rearrange them until the order feels spiritually correct, and make a poster.

For the movies that altered my brain chemistry and made "what's your favorite film?" an unreasonable question.

[Try the app](https://films.snackdriven.com/) · [Report a bug](https://github.com/snackdriven/movies-poster-builder/issues)

## Features

- Search films by title, with optional release-year filtering such as `Dune 1984` using real poster art.
- Choose 9, 12, or 15 slots; reorder with drag-and-drop, arrows, or tap-to-swap.
- Customize the background, name subtitle, and title/year captions.
- Create PNG posters and 1080 × 1920 stories once every slot is filled.
- Share a board by URL, or transfer it with a JSON backup.
- Add entries manually and upload local images.
- Undo edits, prevent duplicates, and save automatically on the current device.
- View the last generated poster and share its board snapshot during the editing session.

## Quick start

### Requirements

- Node.js 22.19 or newer
- npm, included with Node.js

```sh
git clone https://github.com/snackdriven/movies-poster-builder.git
cd movies-poster-builder
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run typecheck` | Check TypeScript |
| `npm test` | Run board and share-link tests |
| `npm run test:e2e` | Run desktop and mobile browser tests |
| `npm run build` | Check types and create `dist/` |
| `npm run preview` | Preview the production build |

Install the test browser before running browser tests:

```sh
npx playwright install chromium
```

## How it works

React and TypeScript provide the editor; Vite builds the static site.
IMDb supplies film search and poster art through its JSONP suggestions endpoint. No API key is required.
Search and artwork availability depend on that external service. Manual entry and local image uploads provide a fallback. Google Fonts supplies Inter.

The app has no server, database, or Muse runtime.

| File | Responsibility |
| --- | --- |
| [App.tsx](client/src/App.tsx) | Editor and dialogs |
| [api.ts](client/src/api.ts) | Search integration |
| [poster.ts](client/src/poster.ts) | Board validation, storage, and sharing |
| [export.ts](client/src/export.ts) | Image processing and PNG export |
| [pages.yml](.github/workflows/pages.yml) | CI and GitHub Pages deployment |

## Data and privacy

- Boards stay in this browser's local storage and do not sync between devices.
- Use **Back up board** and **Restore board** to transfer or preserve a board.
- Share links include a copy of the board's metadata, order, name, background, and caption preference in the URL fragment. Anyone with the link can view that copy.
- Uploaded images remain on the device and in JSON backups. Share links exclude their image bytes and show placeholders instead.
- Storage failures are shown in the editor; use a JSON backup if browser storage is unavailable.
- The last rendered image is cached only for the current editing session; reloading clears it while keeping the saved board.

## Export sizes

Standard posters are 1800 × 2250 (4:5) for all board sizes. Larger boards scale the film images to fit.
Stories are 1080 × 1920 (9:16) for all board sizes.

## Deployment

GitHub Actions validates pushes and pull requests. Successful builds of `main` deploy to GitHub Pages.

1. Use a repository and GitHub plan that support Pages.
2. Set **Settings → Pages → Source** to **GitHub Actions**.
3. For a custom domain, point a DNS-only CNAME at `<github-username>.github.io`.
4. Set the domain in Pages and update [client/public/CNAME](client/public/CNAME) to match.
5. Enable **Enforce HTTPS** after certificate provisioning.

To use the repository's Pages URL, remove `client/public/CNAME`, clear the custom domain in Pages, and set `PAGES_BASE_PATH=/movies-poster-builder/` during the build.

### Optional API integrations

The current IMDb search does not use TMDB or OMDb keys. If a future server-side integration or Actions data job needs them, store `TMDB_API_KEY` and/or `OMDB_API_KEY` as secrets in a `movie-api` GitHub environment. The job must select `environment: movie-api`.

Keep private keys out of source code and Vite browser bundles.

## Help and contributions

Use [GitHub Issues](https://github.com/snackdriven/movies-poster-builder/issues) for bugs and feature requests. For bugs, include the browser, reproduction steps, and expected behavior; leave private board data and credentials out of reports.

Pull requests should describe the change and relevant validation. Run the applicable commands above before submitting changes to the editor, board format, or export behavior.
