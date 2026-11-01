# Track A Demo and Feature Proposal

## Five-Minute Demo

1. Establish the shop persona and problem: familiar names and shop shorthand get lost across sessions.
2. Explicitly teach a convention, such as a real demo supplier alias. Wait until the actual Meko fact appears; show its returned ID through Shop Context. Use clean demo accounts and explicitly entered demo events, never seed records into another account.
3. Compare identical input with Meko enabled and disabled in separate prewarmed API configurations. Keep all current transaction facts identical. Verify the outputs really differ before the presentation. A memory miss or provider failure must not be presented as successful recall.
4. Record an entry that states the total and part payment in the current utterance. Show the resulting ledger entry and exact remaining balance. Meko resolves terminology; SQL supplies financial totals. No old-due payment allocation is claimed.
5. Ask the Agent who owes the shop or what is still owed to a supplier. Inspect Dues by Person. Show a real remembered convention, then correct/forget it and demonstrate fresh recall.

Keep a recorded backup and the equivalent text path. Use no customer secrets in public demos. Do not claim noisy-shop robustness or a latency win without representative measurements.

## Evidence Still Required from the Team

- Keep the coding/build datapack separate from per-account runtime packs.
- Preserve at least ten promoted build decisions from at least two teammates' coding agents, with the required live cross-agent recall (Check T).
- Confirm judge Viewer access, submission links, feature proposal, build-in-public requirements and event eligibility with organizers. Invites/posts require explicit team authorization.
- README setup stays within five commands. Capture the final demo within five minutes.

## Meko Feature Proposal: Extraction Receipts

Observed friction: an accepted conversation turn is not proof that every durable shop fact was extracted. Recent-memory listing covers only a bounded window. The app must distinguish delivery, extraction and retrieval.

Proposed API: conversation_add_message returns a stable capture_id. A capture-status operation reports pending, completed (actual created/updated memory IDs), no durable fact, or failed. A memory includes the source message/span and enough provenance for an owner to inspect, correct or forget it. Replays use the capture identity rather than duplicate writes.

Before: the app can say only that context was delivered, then search for actual facts. After: the owner sees precisely which shop convention was retained, or why none was retained. This also lets the app measure extraction completion separately from voice latency.

Confirm that no equivalent public API already exists with the Meko team before submitting. Minimize source excerpts, preserve datapack authorization, expire capture metadata, limit polling, and avoid exposing a financial transcript to other datapack members. Source deletion/correction must update receipt links without resurrecting forgotten facts.

## Manual Measurement Plan

Use representative English/Hindi/mixed utterances including amounts, credit, part payments, supplier aliases, corrections, unrelated speech, real background chatter and interruptions. Record correctness of person/amount/status, repeated-question count, false saves and first-played-audio timing. Compare p50/p95 under the same devices, regions, noise and warmed/cold conditions. Existing voice telemetry is a transport proxy; it is not calibrated acoustic latency. No automated tests or recorded raw audio are added by this plan.
