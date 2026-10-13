# Films That Made Me

**I've got too much personality to fit into nine choices.**

So there's room for twelve. Or fifteen. Pick the favorites that rewired your brain,
rearrange them until the order feels spiritually correct, and make a poster.

For the movies that altered my brain chemistry and made "what's your favorite film?" an unreasonable question.

[Try the app](https://films.snackdriven.com/) · [Report a bug](https://github.com/snackdriven/movies-poster-builder/issues)

## Features

- Search films by title and optional year, with real poster art.
- Arrange 9, 12, or 15 picks; customize backgrounds, captions, and a name subtitle.
- Export 4:5 posters and 9:16 stories as PNGs.
- Share links, JSON backups, manual entries, local image uploads, and undo.

No account required. Built with React, TypeScript, and Vite; IMDb supplies search and artwork without an API key.

## Development

Requires Node.js 22.19+ and npm.

```sh
git clone https://github.com/snackdriven/movies-poster-builder.git
cd movies-poster-builder
npm ci
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm test` | Board and share-link tests |
| `npm run test:e2e` | Desktop/mobile browser tests |
| `npm run build` | Type-check and build |
| `npm run preview` | Preview the build |

Run `npx playwright install chromium` before browser tests.

## Privacy

Boards save in this browser and do not sync across devices. Use JSON backups to transfer them. Anyone with a share link can view its board snapshot; uploaded image bytes stay local and in backups, and are excluded from share links.

The last generated poster is cached for the current editing session only.

## Deployment

[GitHub Actions](.github/workflows/pages.yml) validates changes and deploys `main` to GitHub Pages. For your own deployment, select **GitHub Actions** in Pages settings and update [client/public/CNAME](client/public/CNAME) for your domain.

For a repository Pages URL, remove the CNAME file, clear the custom domain, and build with `PAGES_BASE_PATH=/movies-poster-builder/`.

Bugs and suggestions welcome via Issues; include reproduction steps and relevant checks with pull requests.
