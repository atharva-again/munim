# Changelog

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
- The voice circle connects/cancels/ends; temporary speech previews appear in a neighbouring pill with activity dots. Pause/Resume and red End controls remain available during a call.
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
- Added Razorpay Test Mode integration; live payment onboarding remains outside the current build.
