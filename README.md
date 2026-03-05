# World Builder (City Focus)

This project replaces the chatbot site with a browser game prototype focused on city-building inside a larger world map.

## Features
- Paint terrain (`grass`, `water`, `forest`)
- Build city tiles (`road`, `residential`, `commercial`, `industrial`)
- Simulated economy and growth loop
- Stats: money, population, jobs, happiness, day progression
- Local save/load via browser `localStorage`

## Run Locally
```bash
npm install
npm start
```
Open [http://localhost:3000](http://localhost:3000)

## Deploy on Render
1. Push this repo to GitHub.
2. In Render, create a new **Web Service** from the repo.
3. Use:
- Build Command: `npm install`
- Start Command: `npm start`
4. Deploy.

## Tech
- Node + Express (static hosting)
- Vanilla HTML/CSS/JS frontend with Canvas rendering
