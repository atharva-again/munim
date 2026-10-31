# Munim

Munim is a mobile-first financial operator for small businesses. The current vertical slice records and reconciles business transactions, keeps durable business context in Meko, and can create Razorpay **test-mode** payment links. YugabyteDB is the source of truth for transactions and settlements; Meko is contextual memory, not a ledger.

## Stack

- React, Vite, TypeScript, and Tailwind CSS v4
- Hono and LiveKit Agents on Node.js
- Better Auth with Google-only sign-in
- Sarvam realtime speech and Groq tool calling
- YugabyteDB YSQL through `pg` and Drizzle ORM
- Meko MCP for business memory
- Razorpay Test Mode for payment links and webhook-driven settlement

## Run locally

Use Node.js 22+ and pnpm 10+.

```sh
cp .env.example .env
pnpm install
```

Set `DATABASE_URL` to a **development/test** YugabyteDB YSQL connection string in `.env`, then create the schema:

```sh
pnpm db:push
pnpm db:migrate
pnpm dev
```

The web app is served at `http://localhost:5173`; the API is at `http://localhost:3001`. The UI does not seed or display sample transactions: it remains empty until connected to a database and given real entries.

## Google Sign-In

The app requires Google sign-in through Better Auth. There is no password login or development authentication bypass.

Set `BETTER_AUTH_URL` to the browser origin (`http://localhost:5173` in development), generate a random `BETTER_AUTH_SECRET` of at least 32 characters, and set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Register this redirect URI in Google Cloud:

```
http://localhost:5173/api/auth/callback/google
```

For production use the HTTPS app origin and its corresponding callback URL. Keep the frontend and `/api` on the same origin.

Each Google account owns a separate ledger through its immutable Better Auth user ID. No owner-email setting or special account role is needed. Existing prototype data stays under its original business ID until it is explicitly migrated to an authenticated account. The existing `MUNIM_BUSINESS_ID` scopes the server-configured Meko and Razorpay integrations; those credentials are not shared with unrelated accounts.

Run `pnpm db:migrate` to create the namespaced Better Auth, conversation, and language and saving-preference tables. This additive migration preserves ledger records. `pnpm db:push` is only for initial ledger setup; use the migration command when upgrading this build.

## Voice, Text, and Form

Record Transaction is a full page with Voice first, followed by Text and Form. All three update the same backend draft. Voice is a continuous, interruptible session after the user starts it once. Leaving voice mode or navigating away from the recording page disconnects the microphone. The form works without speech or language-model credentials; no financial choices are preselected.

After Google sign-in, accounts choose English or Hindi on the first onboarding screen, then Ask for Approval or Full Autonomy on the second. The language applies to the whole interface and default spoken replies. Hindi-English code-switching remains supported in speech; it is not a separate app language. Both preferences are stored per account and editable in Settings. The migration maps older Hinglish preferences to Hindi and preserves their saving policy. Full Autonomy is never enabled by default. Reconnect voice to use a changed greeting. Switching the language spoken during a conversation does not change the saved app language. The model has a separate conversational reply tool for greetings, questions, and unclear speech; these do not alter the draft. Missing transaction details are requested one at a time.

The voice view keeps the current user utterance and Munim reply visible, with compact call controls and a clear listening, processing, or speaking state. Full conversation history, extra audio controls, and secondary entry details are expandable. Finalized speech captions reach the page before transaction interpretation finishes; provisional transcripts remain inside the speech pipeline so text does not change script mid-sentence. A newer finalized utterance suppresses an older delayed readback. Connection errors use plain language and offer retry or text entry. Playback failures leave the reply readable and do not complete a spoken review.

Set the LiveKit, Sarvam, and Groq variables in `.env.example`, then run:

```sh
pnpm voice:download
pnpm dev
# In another terminal:
pnpm voice:dev
```

Production: run the web/API deployment and the persistent Node voice worker separately (`pnpm voice:start` after `pnpm build`). The worker must reach `MUNIM_API_URL`; LiveKit requires its own Cloud project. Each connection receives a fresh room, dispatch, and short-lived room-scoped token. The worker is explicitly dispatched as `munim`; it cannot access unrelated ledgers. The microphone is published only when the worker is ready. Leaving ends that worker session; a job whose caller never joins times out. Microphone capture requires HTTPS or localhost. Sessions end after 20 minutes. Restart `pnpm voice:dev` after worker changes; it does not hot-reload.

The pipeline uses Sarvam `saaras:v4` realtime STT with partial transcripts, Groq `openai/gpt-oss-120b` with narrowly scoped proposal and memory tools, and streaming Sarvam `bulbul:v4-flash` TTS. The LLM uses `GROQ_API_KEY`; no Gemini account or key is required. Start with Groq’s free plan and confirm your account limits in its console. There is no automatic paid-provider fallback. Models and the TTS persona are environment-configurable. These are integration defaults, not measured winners on shop audio. The Sarvam account needs realtime STT access. A small TypeScript adapter uses Sarvam's new endpoint because the current LiveKit Node plugin only exposes legacy STT. The official plugin also lacks the current TTS model in its types.

The model proposes drafts and asks clarifying questions. Its output includes every field as a value or explicit unknown, with one named field for a clarification. A field being clarified is removed from the draft instead of prefilled with a guess. Introducing or changing payment status also requires a matching quote from the current utterance; an unsupported status is cleared and gets a clarification. It has no ledger-write tool. The application derives money direction from known transaction types; only Other needs a proposed direction. The backend validates direction, integer paise, paid amounts, and counterparty for credit. Part payments create a matching settlement for the paid portion. Payment method is optional. Applying a new payment to an older due is not implemented; the assistant must explain that limitation rather than invent a second sale.

Browser capture enables noise suppression, echo cancellation, and automatic gain control. LiveKit Cloud's included NoiseCancellation filter cleans inbound audio before STT and VAD. Sarvam uses balanced partial recognition, and interruptions require at least one recognized word as well as sustained speech; false interruptions can resume playback. Short replies use one synthesis request across sentences and 20 ms PCM frames for playback. These changes do not establish shop-noise robustness: VAD and environmental noise suppression cannot identify the shopkeeper among other speakers. No paid voice-isolation add-on is enabled. Tune the balance between false triggers and missed quiet speech with real audio before making accuracy or latency claims.

Ask for Approval presents a short, natural summary of the amount, counterparty and payment status, with secondary details behind disclosure. Spoken confirmation is accepted only for the current review after uninterrupted audio playback. The on-screen Save button can confirm during the call; the worker checks the committed state before interrupting the old readback and acknowledging the save. Both modes can continue to the next entry in the same call. Edits invalidate the review. An exact short affirmative such as “yes” or “हाँ” can confirm; a correction such as “haan lekin 550” cannot.

Full Autonomy saves complete, validated voice or text proposals without a readback or extra confirmation, then acknowledges the saved entry. Missing details still trigger a question. The user can describe the next event in the same voice/text session; each entry has its own identity, so an earlier entry is not overwritten. The form waits for an explicit Save Entry click. Switching modes, reconnecting voice, or changing a preference never saves an existing draft. The backend rechecks and locks the account’s current policy at the write boundary; a client or model flag cannot grant autonomy. Each transaction records the policy active when saved. Saved entries cannot be edited in this capture flow; a correction must not become a second sale. Completed turns are processed once and speculative generation remains disabled.

Drafts and original finalized transcripts are stored in the database for 12 hours; expired conversations are removed when a new entry starts. Ledger entries remain. Raw microphone audio is not stored by Munim and LiveKit session recording is disabled; provider processing/retention policies still apply. Conversation capabilities expire and are checked against the original Better Auth session, so signing out revokes access. A transaction and its settlement commit atomically; concurrent confirmations reuse one transaction identity. Language-model requests run outside database transactions; the draft revision is reserved first and checked again before applying the result. A newer edit supersedes an older interpretation. Speech playback failure cannot repeat the ledger write.

Text and form requests preserve the draft when switching modes. The recording page retains its draft when visiting other pages in the same browser session. Reloading the app starts a new recording session. If a response is lost, the current session state can be refreshed; no automatic claim of success is made before database commit.

## Insights

Insights calculates across the full authenticated ledger, independent of the Transactions page's loaded subset. Choose 7, 30, or 90 days to compare recorded incoming and outgoing payments with the preceding period. Payment amounts and dates come from settlements, including part payments; transfers are excluded. The current period includes today, which is still in progress.

Outstanding Now covers all recorded history, lists the largest remaining amounts first, and supports direction, entry-age filters, and pagination. Expand an entry to see its original amount, payments, remaining balance, and a reminder or payment note to copy and share manually. The age breakdown is time since the entry, not a claim that payment is overdue. Where Money Went groups actual outgoing payments by transaction type. These calculations do not claim profit, a bank balance, forecasts, or verified payments outside the ledger.

## Other Integrations

- **YugabyteDB:** `DATABASE_URL` must point to a development/test YSQL cluster. Ledgers and conversations are scoped to the authenticated account.
- **Meko:** Set `MEKO_API_KEY`, `MEKO_DATAPACK_ID`, and optionally `MEKO_MCP_URL`. Business memory is scoped to the configured business. Tool results are context, never payment evidence.
- **Razorpay:** Test Mode only. Live key IDs remain blocked. Set `RAZORPAY_WEBHOOK_SECRET` and subscribe the public `POST /api/webhooks/razorpay` endpoint to `payment_link.paid`. A signed event updates the linked business transaction; it does not verify unrelated QR, cash or bank payments. Production onboarding and payment matching are separate work.

## Verification

`pnpm build` checks contracts, API, voice worker and web. No automated test suite is included.

Live STT accuracy, Hindi/Hinglish conversation, interrupted audio, TTS voices, provider latency, and real Google OAuth still require configured accounts and a browser with microphone access. A successful build does not establish speech accuracy or latency. Never commit `.env` or use live payment credentials in this build.
