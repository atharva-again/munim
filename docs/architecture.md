# Agent Architecture

## Ownership

The React app captures microphone audio and renders temporary captions, the current draft, financial history, and recalled shop context. LiveKit carries audio/data to a TypeScript Agents worker. The worker owns speech lifecycle, interruption handling, and playback, but delegates interpretation and all financial decisions to the Hono API.

The API owns authenticated account boundaries, current draft/revisions, strict Groq tool decisions, approval policy, and atomic ledger writes. YugabyteDB stores financial truth. Meko supplies durable contextual facts, never authoritative payment evidence.

| Module | Responsibility |
| --- | --- |
| `apps/web/src/VoiceSession.tsx` | Connect/end circle, preview pill, call controls, cleanup, client activity timing |
| `apps/voice/src/agent.ts` | Warm process resources, finalized turns, backend requests, speech and review completion |
| `apps/voice/src/sarvam.ts` | Sarvam realtime recognition and one-request streaming synthesis |
| `apps/voice/src/config.ts` | Validated voice tuning and worker capacity settings |
| `apps/api/src/conversations.ts` | Capability/session authorization, revisions, finance history, approval and save |
| `apps/api/src/services/interpreter.ts` | Bounded memory-before-reasoning and strict Groq tool validation |
| `apps/api/src/services/shop-memory.ts` | Account datapack mapping, recall, extraction queue, correction and forgetting |
| `apps/api/src/services/meko.ts` | Reused MCP transport and provider-result validation |
| `packages/contracts/src/index.ts` | Shared validated state, captions, memory facts and transaction contracts |

## One Turn

1. The browser requests a short-lived room token for its authenticated conversation. It publishes the microphone only when the worker is ready.
2. Browser echo/noise controls and the included agent-side noise filter clean incoming audio. Sarvam emits provisional captions to the pill; only finalized speech enters interpretation. No raw audio is recorded.
3. The worker sends a stable turn request ID and its last validated draft revision. A network retry reuses the same request body, never a new transaction identity.
4. The API checks the original active auth session and account, reserves the revision, and marks it processing. Unclassified text is not appended to persisted history.
5. Outside the SQL transaction, it recalls bounded shop context and calls Groq. An exact greeting fast path bypasses both. Groq can propose a transaction or reply with an explicit intent; schemas have strict, all-required fields and nullable unknowns.
6. The API relocks the conversation, confirms the reserved revision/session/current saving policy, and validates the model result. Only financial exchanges enter history. Their extraction outbox rows commit in the same transaction as the corresponding state, alongside any financial write.
7. Ordinary replies remain transient. Complete proposals enter review or save under Full Autonomy. A model cannot announce a save before backend commit. New financial events get their own entry identity.
8. The worker publishes reply text and synthesizes the short reply as one request. Audio streams in 20 ms frames. Only successful uninterrupted playback of an actual review can enable spoken confirmation. Screen confirmation uses the same backend validation and may interrupt an old readback after save verification.

```mermaid
sequenceDiagram
    participant UI as Browser
    participant W as LiveKit Worker
    participant A as Munim API
    participant M as Meko
    participant L as Groq
    participant D as YugabyteDB
    UI->>W: Continuous audio
    W-->>UI: Temporary captions
    W->>A: Final turn + request ID + revision
    A->>D: Reserve revision (no unclassified text)
    A->>M: Scoped recent-memory recall
    M-->>A: Actual facts or unavailable
    A->>L: Current utterance, draft, finance context, recalled facts
    L-->>A: Strict proposal or reply
    A->>D: Validate revision/policy; save financial state + capture outbox
    A-->>W: Validated state + reply
    W-->>UI: Text + streamed speech
    A->>M: Background finance exchange capture
    Note over M: Asynchronous durable-fact extraction
```

## Memory Boundaries

An authenticated account maps to a separate runtime datapack through `munim_memory_scopes`. Provisioning names include a stable deployment/account hash. A lease claims work; exact owned-name lookup reconciles a creation interrupted before the local mapping was saved. The bootstrap datapack contains empty administrative traces only. Neither browser input nor the model selects a datapack.

`munim_memory_captures` is a durable, leased outbox. Provider conversations/messages use stable identifiers for retry deduplication. Remote work stays outside financial transactions. Capture succeeds independently of a voice response; failures are visible and retryable. Meko extracts facts from eligible saved exchanges. This classification is not a comprehensive content-safety system.

Voice recall uses the recent Meko memory window (roughly 20 provider memories), ranks overlap with the current utterance, and passes at most five facts into interpretation. It does not imply exhaustive historical search. The Business Memory page can perform slower semantic recall. Source time and retrieval mode accompany real provider IDs/text. The model's `usedMemoryIds` must belong to the returned set; no guessed source cards are shown.

Mutations check both the account's previously observed memory and its provider ownership. Changing/forgetting a cited memory clears affected unsaved drafts and review state, requiring another description; saved financial entries are immutable in this flow. Promotion, staff sharing, and cross-shop learning are excluded. Application context and memory cannot override current payment evidence or the saving policy.

Meko uses the server's credential. Separate datapacks plus the server-owned account mapping form the tenant boundary; per-agent metadata is not an authorization mechanism. The team build datapack remains separate from runtime account packs.

## Persistence and Recovery

- **Ledger:** durable account-scoped entries and settlements, atomically committed and idempotent by entry identity.
- **Conversation:** current draft, bounded finance messages, receipts, and 12-hour expiry tied to the original Better Auth session. Refresh restoration is not implemented.
- **Preferences:** durable account language and saving policy.
- **Memory:** remote Meko conventions, local scope/provenance indexes, and pending capture jobs.
- **Audio/UI captions:** temporary; SDK recording is disabled. Independent provider retention still applies.
- **Metrics:** scalar-only worker logs and bounded in-process API timing samples; client activity gaps are approximate rather than calibrated acoustic measurements.

API SIGTERM/SIGINT drains requests/queue work before closing the pool. SDK worker health and drain behaviour are separate. Warm processes and load-based capacity reduce cold-start work, but managed deployment capacity and regions still need operator configuration. Provider quota exhaustion or memory outages must never turn into invented context or a repeated ledger write.

## Design Decision

Two independent design sketches considered synchronous Meko writes and a durable extraction outbox. Both selected scoped pre-reasoning recall plus asynchronous capture: financial safety, crash recovery, and speech latency have clearer boundaries. The parent reviewed the converged designs; the skill's requested cross-family judge models were unavailable.

Live retrieval evidence changed the recall choice: semantic searches took about 11 seconds in a small synthetic check, while recent-window retrieval completed inside the configured budget. These are limited provider observations, not an end-to-end benchmark. A complete semantic memory search on every voice turn was rejected for this build; the limitation is visible to users.
