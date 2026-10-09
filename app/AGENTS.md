# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## User decisions

- Selected redesign reference: `../docs/selected-redesign.png` (October 9 user attachment, exploration option 6). Use cool off-white, black, lilac, Inter light/bold contrast, asymmetric editorial hero, overlapping sample conversation, compact carousel, and full-width woodland reflection. Supersedes the previous lime theme in `../docs/selected-design.png`. Preserve actual avatar/backend behavior. Carry the new visual system through inner screens and modals.
- Keep the supplied Dawid image and identity. A temporary stock voice is authorized; Andrew is selected.
- Preserve all 27 supplied system-prompt sections unchanged. Test competing hypotheses and report behavior concerns separately.
- Until image training is possible, use explicit portrait mode: original photo plus live Tavus voice/text. Never render the temporary provider stock face. Animated Dawid requires an accessible image source; the provided Slack files-pri URL returns 403 without authentication.
- The Express API is required for live functionality. The template's static Sites output alone cannot host it.
- Expand the landing page with modern carousels, additional purposeful sections, and subtle animations. Preserve the minimal off-white/charcoal/lime style and original Dawid portrait. Support touch, keyboard navigation, and reduced motion; conversation starters may prefill the composer but must never automatically start a paid call or send a message.
- Latest landing feedback: reduce excessive whitespace, add richer explanatory copy, and make animations more noticeable. Use tighter section spacing, visible starter questions, a clearly labeled illustrative conversation, and progressive text reveals while keeping reduced-motion support.
- Add editorial images and show how the avatar interacts. Keep the supplied Dawid portrait unchanged. Landing demonstrations must clearly identify scripted samples/portrait previews, explain voice, text, pause, and reflection, and let visitors explore reply choices or draft their own thought without starting a paid call automatically.
- Redesign selection October 9: user selected the attached lilac editorial concept (exploration option 6). Exact exploration images, prompts, and motion plans are in `../docs/theme-exploration-2026-10-09/prompts-and-motion.json`. Selection authorizes replacing the previous landing design while preserving Dawid's identity and existing integration.
