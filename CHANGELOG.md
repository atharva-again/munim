# Changelog

## Unreleased

- Clear an existing payment status when a proposed change lacks evidence, filter agent totals by the requested person, and preserve legacy payment records during database setup.
- Prepare Groq schemas using Zod's schema hook, accept validated calendar dates for transaction proposals, reject ungrounded negated payment interpretations, and expose provider rate limits as HTTP 429.
- Accept calendar dates for agent reads in India time, honor requested periods in summaries, and report invalid model output without labeling server errors as connection failures.
- Retry a Groq `json_validate_failed` response once within the existing deadline, and clarify credit-sale and Hindi display examples in the prompt.
- Replace retry-prone Groq tool-call responses with strict structured actions; bound conversation, memory, and completion context and log quota headers for rate-limit diagnosis.
- Preserve fields named `description` when preparing Groq structured-output schemas and convert literal constraints to single-value enums.
- Put Overview before Agent in navigation. Let the Agent workspace use the full main area, remove nested frames, hide the unused Shop Context column, and stretch the text composer across the available width.
- Keep ledger Q&A in finance history while excluding volatile calculated balances from durable memory extraction.
- Unified recording and general finance questions in the Agent voice/text workspace; Record Transaction starts a fresh capture in place. Added bounded account-owned read tools without bypassing transaction approval.
- Added full-history, paginated Dues by Person from transaction/settlement SQL, with multilingual record names and oldest-entry dates.
- Cached bounded recent Meko recall per conversation with mutation invalidation; route shop teaching through explicit memory adds and distinguish delivery from extraction. Explicit uncertain writes require manual reconciliation.
- Persist the latest conversational reply so polling/retries do not replay an older reply; bare confirmations only commit when the current reply is a transaction review.
- Added hackathon demo/feature-proposal guidance. Live voice quality and provider latency remain unmeasured for these changes.

- Removed hosted payment collection and webhook processing; manual settlement tracking and legacy provider records remain.
- Corrected and forgotten memories now refresh in place without hiding an edited fact; Overview labels the preview as recent without claiming an exact rank.
- Signed-in visits to `/` now redirect to Overview while signed-out visitors still see the landing page.
- Restored the root changelog location and readable formatting for the Past Conversations screen.
- Added compact, real-data Insights and recent Business Memory previews to Overview, each linking to its full page; hide the memory preview when no saved fact is available.
- Automatically cycle the landing page examples with a progress timeline and reduced-motion support; place the language switch beside the theme control in the footer.
- Keep example autoplay running while the pointer hovers or a selector remains focused; animate the timeline fill directly and pause only for hidden tabs or reduced motion.

- Added a public English/Hindi homepage with monochrome editorial imagery, an interactive local transaction example, product explanations and FAQs, and conversion links into Google sign-in/onboarding. The app and voice bundle remain separate from the landing page.

- Added bilingual record display text separate from original transcripts/fields, app-language switching for record cards, Transactions and Insights, a durable read-only finance conversation archive with a Past Conversations route, and shared incoming/outgoing chat bubbles.

- Added a separate shop-name onboarding step, account-persisted name editing in Settings, and shop identity in navigation/Overview. Added browser routes for every screen, real navigation links, direct-link preservation through sign-in, and Back/Forward support.

- Aligned the spoken connection greeting with the text prompt: “What would you like to record?” / “क्या हिसाब लिखना है?” in the selected app language.

- Business Memory loads up to 20 recent saved memories automatically, with visible loading/empty/unavailable states, correction/forget actions, and a way back from search results.

- Text recording now shows chat messages above a follow-up composer. Shop Context sits beside recording on wide screens and above it on smaller screens, stays expanded across voice revisions, and retains the latest entry context through transient chatter.

- Removed the saving-policy caption beneath the microphone. Choose spoken reply language from the current turn, retain established draft facts, validate payment evidence with one bounded repair, and ask only for missing material details.

- Removed the 20-minute voice-call cutoff and added bounded recovery after unexpected room or worker disconnects. Preserved microphone pause state during reconnection and added session-close reason logging.
- Start a fresh recording session after leaving the page; make the microphone action, connection cancellation, and voice-mute control easier to find.

## 2026-11-01

### Added

- Authenticated per-account runtime Meko datapacks, recoverable provisioning, and scoped provider conversations.
- Durable finance capture outbox with asynchronous Meko extraction, retry status, and explicit retry controls.
- Bounded recall before interpretation, real fact provenance, and a visible recent-window limitation.
- Shop Context disclosure with actual correction/forget actions and invalidation of affected unsaved drafts.
- Correlated stage timings, token/cache observations, account-scoped p50/p95 summaries, readiness, API concurrency limits, and graceful shutdown.
- Configurable speech/endpointing/reasoning settings, prewarmed voice resources, worker capacity/drain settings, and combined local startup.
- Independent agent-side VAD threshold and speech/silence settings for noisy-environment calibration.

### Changed

- Recording now offers Voice and Text. Removed the Form tab/component and its recording endpoint/client contract.
- The voice circle connects/cancels/ends; temporary speech previews appear in an open area beside it with activity dots. Pause/Resume and red End controls remain available during a call.
- Finance-related exchanges alone enter newly saved conversation history and the extraction queue. Greetings and unrelated replies remain transient.
- Groq output uses strict tool schemas, nullable unknowns, validated memory IDs, bounded repair attempts, and a configurable low-reasoning default.
- Reduced configured endpointing baseline from 800+200 ms to 600+100 ms; this is not a measured acoustic speedup.
- Removed the regular GET-before-turn round trip and retained request identity across a network-only retry.
- Business Memory now displays typed facts and actual update state instead of raw provider JSON.
- README and agent architecture document describe the current flow, setup, deployment controls, and remaining work.

### Preserved

- English/Hindi UI and mixed-language speech, monochrome Geist/Tailwind design, semantic call-control colors.
- Exact-revision approval, explicit account autonomy preference, payment-evidence checks, and atomic/idempotent ledger writes.
- No raw audio recording, automatic paid voice-isolation add-on, automated test files, or repository push.

### Validation and Limits

- Builds and manual structured-output/provider checks use synthetic data. Memory scope isolation, extraction, recall, correction, forgetting, and disabled-memory behaviour are checked separately from browser audio.
- Shop-noise robustness, microphone UX, end-to-end p50/p95 latency, broad model accuracy, deployment/load capacity, and final hackathon demonstration still require live validation.

## Earlier Work

- Added Google-only Better Auth; per-account ledger, preferences, and bilingual onboarding/settings.
- Added continuous LiveKit/Sarvam voice capture, text entry, approval/autonomous recording, and finance Insights.
- Simplified Vercel-style navigation, regular Geist typography, monochrome light/dark theme, and professional geometric branding.
