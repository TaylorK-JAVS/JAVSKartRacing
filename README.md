# JAVS Kart Racing

A lightweight office kart race app with shared racer profiles, saved photos, and persistent win and lead stats.

## Run

1. Install Node.js if it is not already available.
2. From the repo root, run `npm start`.
3. Open `http://localhost:3000`.

Do not open `index.html` directly for the shared-data version. The app now needs the local server so it can read and write racer data.

## Shared Data

- Racer profiles and stats are stored in `data/racers.json`.
- Default seed data lives in `data/racers.seed.json`.
- Uploaded racer photos are stored in `assets/racers/`.

## Team Workflow

1. `git pull`
2. `npm start`
3. Run your races and update racers
4. Commit `data/racers.json` and any new or changed files in `assets/racers/`
5. `git push`

## Features

- Up to 10 racers in a race at one time
- Saved racer garage with photos
- Persistent wins and total lead time
- Shared JSON-based roster and stats
- Coffee boosts and CEO issue slowdowns
- Live race feed and announcer commentary
