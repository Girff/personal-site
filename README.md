# advay's personal site

A personal portfolio styled after **Balatro** — swirling paint shader background, draggable
playing cards, CRT filter, the works. Built with vanilla HTML/CSS/JS. No frameworks, no build step.

The skills section is a playable blind: skills are cards (suit = category, ranks reshuffle every
deal), and you play real poker hands against an endless ladder of CS-themed boss blinds
("The Segfault", "The Merge Conflict", …). 4 hands and 4 discards per blind, played cards leave
the table, scores persist in localStorage.

## Run it locally

The movie pages load data with `fetch()`, which browsers block on `file://` URLs. Serve it instead:

```bash
cd personal-site
python3 -m http.server
# open http://localhost:8000
```

## Publish on GitHub Pages

1. Create a repo on GitHub (e.g. `personal-site`, or `<username>.github.io` for a root-domain site)
2. Push this folder to it:
   ```bash
   git add -A
   git commit -m "Balatro-style personal site"
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**
4. Your site appears at `https://<username>.github.io/<repo>/` after a minute or two

All paths in the site are relative, so it works at a subpath or a root domain.

## Customize checklist (do these!)

- [ ] **Spelunking Penguin screenshot** → `assets/img/spelunking-penguin.png`
- [ ] **GitHub links** → set `githubUser` (and the repo name) in the `CONFIG` block at the top of `js/main.js`
- [ ] **About-me copy** → tweak the paragraphs in `index.html` (search for `TODO`) so they sound like you
- [ ] **Project description** → replace the placeholder blurb on the Spelunking Penguin card
- [ ] **Resume details** → fill in the `[bracketed]` placeholders in `resume.html` and the resume
      section of `index.html` (school, grad year, last name, dates), then regenerate the PDF (below)
- [ ] Skim `js/game.js` → the `SKILLS` array is where you add/remove skill cards; boss names live
      in `BOSS_NAMES`

## Regenerating the resume PDF

`assets/resume.pdf` is rendered from `resume.html`. After editing the HTML, either open
`resume.html` in a browser and "Print → Save as PDF", or run:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --no-pdf-header-footer --print-to-pdf="assets/resume.pdf" "file://$PWD/resume.html"
```

## The movie corner (Letterboxd)

The MOVIES section on the homepage shows the four favorites and the two latest reviews from
[letterboxd.com/Girff](https://letterboxd.com/Girff/); `movies.html` is the full page — the exact
rating histogram (click a bar to see the films in it), this month's reviews (5 per page), and the
watchlist. Everything reads `assets/data/letterboxd.json`, refreshed by
`scripts/fetch_letterboxd.py`:

- **Automatically:** `.github/workflows/letterboxd.yml` runs daily (and via the
  "Run workflow" button under the repo's Actions tab) and commits the JSON when it changes.
  GitHub Pages redeploys automatically after the commit.
- **Manually:** `python3 scripts/fetch_letterboxd.py` locally, then commit.

Data comes from Letterboxd's public RSS feed (reviews) and public profile pages (favorites,
rating distribution, recently rated films, watchlist). Letterboxd bot-blocks paginated sub-pages,
so the histogram drill-down lists cover the ~72 most recently rated films (the bar *counts* are
always exact) and each bar links out to the full list on Letterboxd. To change the account, set
the username in `scripts/fetch_letterboxd.py` (or the `LETTERBOXD_USER` env var). Note: GitHub
disables cron schedules on repos with no activity for ~60 days — pushing anything re-enables it.

## Adding a project

Copy the `.project-row` block in `index.html`, swap the name/description/chips/links, and add a
screenshot in `assets/img/`. Delete the "empty joker slot" once you've got a few.

## Structure

```
index.html          main page (hero, about, skills game, projects, achievements, movies, resume)
movies.html         the movie corner: rating histogram, monthly reviews, watchlist
resume.html         traditional print-ready resume (source of assets/resume.pdf)
scripts/fetch_letterboxd.py   pulls Letterboxd data into assets/data/letterboxd.json
.github/workflows/letterboxd.yml  daily auto-refresh of the Letterboxd data
css/style.css       all styling (Balatro look recreated in CSS, incl. pixel-corner UI)
js/background.js    WebGL swirling-paint shader background
js/cards.js         card physics: fan layout, hover tilt, drag to reorder, snap-back, sfx
js/game.js          skills mini-game: deals, poker scoring, discards, boss blinds
js/main.js          page wiring + CONFIG
js/letterboxd.js    renders the homepage movies section from the fetched JSON
js/movies.js        renders movies.html (histogram, monthly reviews, watchlist)
assets/fonts/       m6x11.ttf
assets/img/         your photo + screenshots go here
assets/resume.pdf   the downloadable resume
```

## Credits & licenses

- Font: [m6x11](https://managore.itch.io/m6x11) by **Daniel Linssen** — free to use with attribution
  (attributed in the site footer; keep it there)
- Visual style inspired by [Balatro](https://www.playbalatro.com) by **LocalThunk** — this is a
  fan-made homage; it is not affiliated with or endorsed by LocalThunk/Playstack, and it uses **no
  assets from the game**. The background shader, cards, editions, and UI are recreated from scratch
  in CSS/WebGL. (Deliberate choice: extracted game sprites are copyrighted, and "non-commercial"
  doesn't make redistributing them safe — recreations keep this site publishable.)
- Markdown rendering: [marked](https://github.com/markedjs/marked) via CDN
