# Films That Made Me

**I've got too much personality to fit into nine choices.**

So there's room for twelve. Or fifteen. Pick the favorites that rewired your brain,
rearrange them until the order feels spiritually correct, and make a poster.

For the movies that altered my brain chemistry and made "what's your favorite film?"
an unreasonable question.

Choose 9, 12 or 15 films, arrange their posters, and export a 4:5 poster or 9:16 story. Hosted on GitHub Pages at https://films.snackdriven.com/. No Muse runtime, database or account is required.

## Development

Use Node 22.19 or newer: `npm ci`, `npm run dev`. Validate with `npm test`, `npm run test:e2e`, and `npm run build`. GitHub Actions verifies pull requests and deploys successful main builds to Pages.

IMDb supplies live film search and poster art through its JSONP suggestions endpoint. It needs no API key. Queries can end with a release year, such as `Dune 1984`. Film suggestions and poster availability depend on IMDb. Manual entry and local poster uploads are available as a fallback.

Boards are saved in this browser, not synced across devices. Back up and restore JSON to transfer them. URL-fragment share links contain a copy of the board; anyone with the link can view it. Uploaded image bytes remain local and in JSON backups, and are excluded from share links.

Standard PNGs are 1800×2250 for all board sizes; stories are 1080×1920. Larger boards scale film images to fit. The last generated poster is retained during this editing session, with a View link and a share link to its snapshot. Reloading clears the cached image but retains the saved board.

## Hosting

Use a public repo for GitHub Free Pages. Set Pages source to GitHub Actions. For a custom domain, add a DNS-only CNAME pointing your chosen subdomain to `<github-username>.github.io`, configure it in Pages, and update `client/public/CNAME` to match. Enable HTTPS after certificate provisioning. For the repository URL instead, remove the CNAME and set `PAGES_BASE_PATH=/movies-poster-builder/` during the build.

## Optional movie API credentials

For optional API integrations, use a GitHub environment named `movie-api`. Under Settings → Environments → movie-api → Environment secrets, add `TMDB_API_KEY` and/or `OMDB_API_KEY`. Enter the real values directly in GitHub; do not commit them.

These are reserved for server-side API integrations or Actions data jobs. This app's current IMDb search does not consume them. Never inject private API keys into a Vite browser bundle: GitHub secrets cease to be private when compiled into public JavaScript. An Actions job that uses these environment secrets must select `environment: movie-api`.

## Features

Includes drag and neighbor reordering, title/year captions, name subtitle, full-board generation gating, cached last render, 4:5 and story exports, portable share links, duplicate prevention/removal, picker slot context, suggestions, auto-advance, year narrowing, undo and feedback. Nine named backgrounds are available. There is no most-picked chart. Share links use a static URL fragment rather than a database `/s/{id}` route.
