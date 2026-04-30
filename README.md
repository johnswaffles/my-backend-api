# Game Workspace + Legacy 618FOOD

This repository is a **multi-product workspace**.

## Current focus

- `cozy-builder-godot/` and `rpg-adventure-godot/` are the active game source projects.
- `618FOOD.COM` is retired for now and should be treated as legacy/reference code unless you explicitly ask to work on it again.
- `johnny-chat/` is kept in-tree for possible future chatbot/game integration, but it is not a required dependency for either game.

The `johnny-chat` area is still present in the tree, but this repo is no longer hosted there for the cost reasons you mentioned.
We’re keeping it because you may want to re-integrate chatbot pieces into the games later.

## What this workspace contains today

- `cozy-builder-godot/`
  - Main Godot project for the Cozy Builder game.
- `rpg-adventure-godot/`
  - Godot project for Tiny Hero Quest.
- `src/`, `services/`, `public/`, `server.js`, `package.json`
  - Legacy/retired 618FOOD.com web app runtime and service code.
  - Keep available as reference, but do not treat it as the active product surface by default.
- `johnny-chat/`
  - Separate service for chat widgets and conversation surfaces.
  - Kept for future chatbot integration, not required for current deployment.
- `dist/`
  - Built output for the primary web app.
- `public/*` (e.g. `public/godot-playtest`, `public/tiny-hero-quest`)
  - Built web exports currently used by in-browser game links.
- `cozy-builder-godot/` exports in `johnny-chat/public/`
  - Deployment artifacts that were mirrored for an earlier host setup.

## Notes on cleanup

- We can keep everything needed for future integrations, but separate it clearly so day-to-day work stays simple.
- The safest path is to treat this as an organizational cleanup, not a migration:
  1. Keep chatbot code where it is.
  2. Make ownership clear through documentation.
  3. Keep build artifacts grouped with the service that owns them.
  4. Prune only clearly stale files once you confirm they are no longer used.

## Quick run/build (legacy web app only)

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Environment

Copy [`.env.example`](./.env.example) and provide:

- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-5.4`
- `GEMINI_API_KEY`
- `GEMINI_TTS=gemini-3.1-flash-tts-preview`
- `GEMINI_TTS_VOICE=Orus`
- `GOOGLE_PLACES_API_KEY` (or `GOOGLE_PLACES_KEY` / `GOOGLE_MAPS_KEY`)

## Deployment target

The old 618FOOD app is retired. Current game work should focus on the Godot projects and their web export folders unless you explicitly ask to revive the web app.

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
- If API keys are missing, the page still renders and explains what is not connected.
- Existing public-facing branding in the legacy web app still uses `618FOOD.COM`.
