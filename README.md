# Aura Notes — Write without limits.
Offline-first, S Pen-first notebook. No accounts, no AI, no subscriptions. Plain HTML/CSS/JS, no build step.

## Deploy on GitHub Pages
1. Create a GitHub repo and push these files to `main`.
2. Settings → Pages → Source: **GitHub Actions**. The workflow in `.github/workflows/pages.yml` deploys on every push.
3. Open the Pages URL on the tablet in Chrome → menu → *Install app* (works offline afterwards).

## Controls
- Pen / Samsung S Pen: draws. Finger: scrolls pages (never draws or drags them). Pinch: zoom 1x–2.5x.
- Scroll past the last page to add a page.
- Ruler: one finger moves it, two fingers rotate it. Pen strokes near its edge snap straight.

## Structure
`index.html`, `css/styles.css`, `js/app.js`, `sw.js` (offline cache), `manifest.webmanifest`, `icons/`.

## Not yet built
Protractor, set square, lasso, tables, text tool, images, PDF import/export, tags, bookmarks, search, thumbnails.
