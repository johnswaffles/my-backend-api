# My Backend API

This project is a small Express server that powers a voice-to-voice and chat assistant using OpenAI models. A simple front-end is served from the `public/` directory and provides microphone support so you can talk directly to the assistant.

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the required environment variable `OPENAI_API_KEY` and any optional overrides in a `.env` file or in your environment:
   - `OPENAI_API_KEY` – your OpenAI API key (**required**)
   - `PORT` – server port (defaults to `3000`)
   - `MODEL` – chat model (defaults to `gpt-4o-audio-preview`)
   - `S2T_MODEL` – speech‑to‑text model (defaults to `gpt-4o-mini-transcribe`)
   - `TTS_MODEL` – text‑to‑speech model (defaults to `gpt-4o-audio-preview`)

## Running the server

Start the server with:

```bash
npm start
```

During development you can use `npm run dev` to automatically restart on changes.

Once running, the front-end is available from [http://localhost:3000/](http://localhost:3000/) (or your configured `PORT`) and is served from the `/public` directory. The front-end includes a microphone button; hold the button to record audio which is sent to `/api/transcribe` before generating a response and playing it back using text‑to‑speech.
