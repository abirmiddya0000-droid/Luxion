# LUXION

LUXION is a clean, modern, standalone AI chat and developer platform founded and created by Abir.

LUXION runs entirely on its own autonomous native intelligence and speech synthesis engine. It requires zero third-party AI keys (no OpenAI, no Gemini, no Claude, no Grok) and operates with complete data privacy, speed, and reliability.

## Features
- **LUXION Native Core**: Autonomous reasoning, mathematics/unit calculations, code generation, architectural analysis, and contextual conversation tracking.
- **Built-in Interactive Code Previewer**: Live browser sandboxing for generated apps (games, calculators, tools).
- **LUXION Voice & TTS**: Tuned, responsive speech synthesis matching LUXION's calm, confident personality.
- **Microphone STT**: Real-time voice-to-text dictation.
- **File & Image Attachments**: Document inspection, metrics, code reviews, and visual assets.
- **Slash Commands**: `/build <request>`, `/clear`, `/help`.
- **Session History & Export**: Local persistence with Markdown conversation export.

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the application:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000`.

## Production & Deployment (Render / Cloud)
- **Zero AI API Keys Required**: The core AI engine runs out of the box with zero external configuration.
- Optional: Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` if you wish to enable live email OTP verification.
- Start command: `node server.ts` or `npm run build && npm start`.
