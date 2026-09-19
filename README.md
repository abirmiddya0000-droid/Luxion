<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/20a3789f-3444-493c-9cb6-4b4410f7442b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `OPENAI_API_KEY` in [.env.local](.env.local) to your OpenAI API key
3. Run the app:
   `npm run dev`


## Required production configuration
- `OPENAI_API_KEY` for AI chat and server-side TTS.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for real email OTP delivery. OTP codes are never returned to the browser.
- `/build`, `/clear`, and `/help` are handled as local slash commands.
