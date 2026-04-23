# 2026 NFL Mock Draft Simulator

A browser-only, single-page simulator for the 2026 NFL Draft. GM one team (or all 32), make picks, propose trades, watch AI teams draft around you, and get graded at the end.

No build step, no server, no npm. Just open `index.html` in a modern browser.

## Quick start

```
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

Or host the folder with any static server (`python3 -m http.server`, etc.).

## Data cutoff

**April 21, 2026.** The actual 2026 NFL Draft begins April 23, 2026 in Pittsburgh. Within a day of release, the seed data drifts from reality fast. Two mitigations ship with the tool:

1. **Persistent banner** at the top of every screen calls out the cutoff.
2. **Live Draft Mode** — open it from the banner, search for a prospect, and mark them as already taken IRL. They'll be struck through in the prospect board and removed from the pool.

## Sources

- **Draft order (257 picks)** — NBC Sports NY, Sharp Football Analysis (Apr 20-21, 2026). Includes every pre-draft trade wrinkle (NYG via CIN Dexter Lawrence, DAL via GB Micah Parsons, NYJ via IND Sauce Gardner, plus ATL/DEN/JAX R1 recipients).
- **Prospect rankings** — Daniel Jeremiah's Top 150 (NFL.com, Apr 20), blended with NFL Mock Draft Database consensus, Dane Brugler Top 300 (The Athletic), PFF, Mel Kiper (ESPN), and Bleacher Report.
- **Team needs** — CBS Sports and Yahoo Sports team-needs trackers (Apr 18-20). Fantasy Alarm and SI draft guides for edge cases.
- **Trade chart** — Jimmy Johnson values for picks 1-224 (as published by the Cowboys), extrapolated linearly to ~0 for picks 225-257.

## Features

- **Setup** — pick one or more teams to control. Select all 32 for full manual mode (AI disabled). Configure rounds, optional pick timer (R1 / R2-3 / R4-7 seconds), AI randomness, and AI-to-AI trades.
- **Draft screen** — three-column layout: draft order, prospect board (filters by position + search), and your team (needs, remaining picks, roster drafted).
- **AI pick engine** — scores each remaining prospect with 0.55 × BPA + 0.35 × need + 0.10 × noise, with a QB premium for QB-needy teams and a 3% reach chance per pick. Teams roll their drafted position to the back of their needs list so later rounds fill secondary needs.
- **Trades** — propose a trade to any AI team using the Jimmy Johnson chart. The AI evaluates with real-GM-ish rules: fair value at ratio ≥ 0.95, won't move down 10+ slots at a discount, QB-needy teams accept an 0.88 discount for a top QB, tanking teams favor quantity. Optional AI-to-AI trades toggle in setup.
- **Live Draft Mode** — mark prospects as already taken IRL so the sim stays in sync with the live draft.
- **Grades & recap** — per-team letter grade (curved across the league) from a value + need-fit + construction penalty formula, plus league-wide steals, reaches, and surprises.
- **Persistence** — auto-saves to `localStorage` as you draft. Reload the page and you'll get a Resume banner. "New draft" wipes it.
- **Export** — text export (markdown, copied to clipboard, with a download fallback) and image export (PNG of the results screen via `html2canvas`, loaded from CDN on demand).

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Auto-pick (BPA) for whoever is on the clock |
| `N`     | Jump to your next pick (AI fast-picks intervening slots) |
| `S`     | Skip to end of draft (AI finishes everything) |
| `U`     | Undo most recent pick |
| `T`     | Open trade modal |
| `Esc`   | Close any open modal |
| `?`     | Show shortcut cheat-sheet |

## Known caveats

- **Prospect count is ~220.** If the pool runs dry before the draft ends (possible in late R7 with a 257-pick draft), remaining picks are recorded as "(skipped)" and ignored in the grades. The sim doesn't fabricate UDFA-grade names.
- **Heights/weights** for prospects past the top 30 are position-typical estimates, marked with an asterisk in the UI.
- **Hypothetical trades.** The pre-draft trade ownership (Lawrence/Parsons/Gardner, etc.) is drawn from public reporting as of Apr 21, 2026. Real-time trades on draft day are not reflected in seed data — use Live Draft Mode to reconcile if needed.
- **No real logos ship.** Abbreviation badges in team colors are used as a fallback. Drop SVG files into `assets/logos/<ABBR>.svg` and they'll be picked up automatically via CSS (logo rendering is background-image-ready).

## File layout

```
index.html                 — shell with three screens
styles.css                 — dark ESPN/NFL.com-style theme, responsive
data/teams.js              — 32 NFL teams with colors and 2026 needs
data/draftOrder.js         — 257 picks (all 7 rounds + 33 comp)
data/prospects.js          — ~220 prospects
data/tradeChart.js         — Jimmy Johnson values + future-year discount
js/persistence.js          — localStorage auto-save, text + image export
js/ai.js                   — pick engine
js/trades.js               — trade evaluation + AI-to-AI trades
js/grades.js               — letter grades, steals, reaches, surprises, recap
js/app.js                  — controller, rendering, event wiring, shortcuts
```

## Tested on

Chrome, Firefox, Safari (Mac). Mobile Safari / Chrome responsive down to 375px.
