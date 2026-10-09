# Dawid avatar companion

Local app preview: http://127.0.0.1:4173/

The selected off-white, charcoal, and lime design is implemented with a landing page, live conversation, reflection sheet, one-minute practice, device-local saved actions, preferences, and profile information. Dawid's supplied photograph is used unchanged.

## Current live mode

Tavus provides live AI conversation and the Andrew stock voice. The app displays Dawid's original photo in **portrait mode**. The temporary provider stock face is never rendered. This mode is explicit in the interface; it is not an animated clone of Dawid.

The uploaded Awakened Guide prompt is copied byte-for-byte into `app/server/system-prompt.txt`, including all 27 sections. Tavus accepted and returned the full 35,653 characters unchanged. SHA-256: `7200113a2053b2e59295e596e180c10d58b22fe4ff6898b1fd627f467c26a84c`.

Animating Dawid requires an accessible image-training URL. The supplied Slack files-pri URL returns HTTP 403 to an unauthenticated request. No face-training job has been submitted. The existing portrait is 466 × 496; the training script enables Tavus's image fixer. [Tavus image requirements and fixer](https://docs.tavus.io/sections/faces/phoenix-45-image-requirements).

## Development

The application lives in `app/`, with React/Vite on the frontend and Express on the server. `npm run dev` serves both frontend and `/api` on loopback. `npm run build` builds the frontend; `npm start` serves that build with the Express API. Both default to `127.0.0.1:4173`.

The local API key is in ignored `app/.env.local`. No key is passed to the browser. See `app/.env.example` for environment names. Generated resource IDs are saved in ignored `app/.private/tavus-state.json`.

The template's Sites packaging remains intact. Its static Worker output does **not** host this Express API. A public deployment needs a backend deployment, user authentication, shared session/rate-limit storage, and the appropriate proxy/cookie configuration. This handoff is a local app, not a public production deployment.

## Training and verification utilities

From `app/`:

- `npm run check:tavus`: read-only authentication, configuration, and resource checks.
- `npm run setup:media`: resumes existing training IDs; otherwise creates a voice from `TAVUS_TRAINING_AUDIO_URL`, then a face from `TAVUS_TRAINING_IMAGE_URL`. The currently selected stock voice skips voice cloning. Once the face is completed, it creates a separate guide using the exact prompt and switches to animated video after the app reloads. Submit only media you have permission to use. Do not blindly retry an ambiguous provider creation response; inspect the account first.
- `npm test`: provider failures, room ownership, concurrent starts, transcript deduplication, exact prompt integrity, and Sites packaging.
- `npm run eval:prepare`: creates or verifies an isolated text-only prompt-evaluation PAL. It never replaces the app guide.
- `npm run eval:start`, `npm run eval:browser`, `npm run eval:end`: create a bounded evaluation room, serve the loopback-only browser harness, and end the room/remove its local meeting token. Live evaluation uses Tavus account usage. The browser harness has an explicit join and run button; cases run sequentially in one conversation.

## Evidence and limits

See [verification report](docs/verification.md), [saved model replies](docs/prompt-evaluation-results.json), and [design QA](docs/design-qa.md).

Verified: real private Tavus room creation, live greeting, text input, returned reply, browser audio playback, pause/resume, reflection pause/resume, and room end. All created test rooms were confirmed ended by Tavus.

Not verified: microphone hardware/input, animated Dawid video, cloned Dawid voice, or public deployment. Ten live text probes are an initial regression sample, not an exhaustive behavior guarantee. The crisis reply needs a wording review; the original prompt has been preserved.
