# 618FOOD.COM

618FOOD.COM is a rural-first restaurant discovery app for Southern Illinois. It uses Google Places as the canonical source of restaurant identity and OpenAI as a verifier, ranker, explainer, and Gemini-powered audio narrator.

## What it does

- Searches verified restaurants near you or near a destination
- Prioritizes local favorites, hidden gems, and real-world signals over raw star ratings
- Surfaces explainable results with confidence labels and evidence notes
- Reads the short shortlist aloud with Gemini 3.1 Flash TTS and a prebuilt Gemini voice when configured

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
- `GEMINI_API_KEY`
- `GEMINI_TTS=gemini-3.1-flash-tts-preview`
- `GEMINI_TTS_VOICE=Orus`
- `GOOGLE_PLACES_API_KEY` (or `GOOGLE_PLACES_KEY` / `GOOGLE_MAPS_KEY`)

## Render + Domain

The live `618FOOD.COM` app is intended to run on Render and be pointed to `618food.com` through Cloudflare DNS.

If you are wiring the deployment in Render, make sure these values are present on the service:

- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-5.4`
- `GEMINI_API_KEY`
- `GEMINI_TTS=gemini-3.1-flash-tts-preview`
- `GEMINI_TTS_VOICE=Orus`
- `GOOGLE_PLACES_API_KEY` or the fallback aliases `GOOGLE_PLACES_KEY` / `GOOGLE_MAPS_KEY`

After the Render service is live, attach `618food.com` as the custom domain in Cloudflare and set `www.618food.com` to redirect to the root domain.

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
