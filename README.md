# 618FOOD.COM

618FOOD.COM is a rural-first restaurant discovery app for Southern Illinois. It uses Google Places as the canonical source of restaurant identity and OpenAI as a verifier, ranker, explainer, and audio narrator.

## What it does

- Searches verified restaurants near you or near a destination
- Prioritizes local favorites, hidden gems, and real-world signals over raw star ratings
- Surfaces explainable results with confidence labels and evidence notes
- Reads the short shortlist aloud with `gpt-4o-mini-tts` and the `nova` voice when configured

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Express API routes

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Environment

Copy [.env.example](/Users/johnshopinski/Documents/New%20project/.env.example) and provide:

- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-5.4`
- `OPENAI_TTS_MODEL=gpt-4o-mini-tts`
- `OPENAI_TTS_VOICE=nova`
- `GOOGLE_PLACES_API_KEY` (or `GOOGLE_PLACES_KEY` / `GOOGLE_MAPS_KEY`)

## Feature layout

```text
src/
  features/local-eats/
    components/
    lib/
    mock/
    schemas.ts
    types.ts
services/
  food/
    audio.js
    corroboration.js
    google-places.js
    prompts.js
    ranking.js
    schemas.js
```

## Notes

- The app never invents restaurants or contact details.
- If live keys are missing, the page still renders cleanly and explains what needs to be connected.
- All public-facing branding uses `618FOOD.COM`.
