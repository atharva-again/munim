# Munim

Munim is a mobile-first financial operator for small businesses. The current vertical slice records and reconciles business transactions, keeps durable business context in Meko, and can create Razorpay **test-mode** payment links. YugabyteDB is the source of truth for transactions and settlements; Meko is contextual memory, not a ledger.

## Stack

- React, Vite, TypeScript, Tailwind CSS v4, and Base UI
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

Run `pnpm db:migrate` to create the namespaced Better Auth and conversation tables. This additive migration preserves ledger records. `pnpm db:push` is only for initial ledger setup; use the migration command when upgrading this build.

## Voice, Text, and Form

Record Transaction opens with Voice first, followed by Text and Form. All three update the same backend draft. Voice is a continuous, interruptible session after the user starts it once. Leaving voice mode or closing the dialog disconnects the microphone. The form works without speech or language-model credentials; no financial choices are preselected.

Set the LiveKit, Sarvam, and Groq variables in `.env.example`, then run:

```sh
pnpm voice:download
pnpm dev
# In another terminal:
pnpm voice:dev
```

Production: run the web/API deployment and the persistent Node voice worker separately (`pnpm voice:start` after `pnpm build`). The worker must reach `MUNIM_API_URL`; LiveKit requires its own Cloud project. A short-lived, room-scoped token is issued by the authenticated API. The worker is explicitly dispatched as `munim`; it cannot access unrelated ledgers. Microphone capture requires HTTPS or localhost. Sessions end after 20 minutes.

The pipeline uses Sarvam `saaras:v4` realtime STT with partial transcripts, Groq `openai/gpt-oss-120b` with narrowly scoped proposal and memory tools, and streaming Sarvam `bulbul:v4-flash` TTS. The LLM uses `GROQ_API_KEY`; no Gemini account or key is required. Start with Groq’s free plan and confirm your account limits in its console. There is no automatic paid-provider fallback. Models and the TTS persona are environment-configurable. These are integration defaults, not measured winners on shop audio. The Sarvam account needs realtime STT access. A small TypeScript adapter uses Sarvam's new endpoint because the current LiveKit Node plugin only exposes legacy STT. The official plugin also lacks the current TTS model in its types.

The model proposes drafts and asks clarifying questions. It has no ledger-write tool. The backend validates direction, integer paise, paid amounts, and counterparty for credit. Part payments create a matching settlement for the paid portion. Payment method is optional. Applying a new payment to an older due is not implemented; the assistant must explain that limitation rather than invent a second sale.

Before saving, Munim reads back the exact draft. Spoken confirmation is accepted only for a complete, current review whose audio finished without interruption. On-screen confirmation requires the displayed review. Edits invalidate that review. An exact short affirmative such as “yes” or “हाँ” can confirm; a correction such as “haan lekin 550” cannot. Unsupported or ambiguous confirmation wording triggers clarification. Completed user turns are processed once; speculative generation is disabled around these financial actions.

Drafts and original finalized transcripts are stored in the database for 12 hours; expired conversations are removed when a new entry starts. Ledger entries remain. Raw microphone audio is not stored by Munim and LiveKit session recording is disabled; provider processing/retention policies still apply. Conversation capabilities expire and are checked against the original Better Auth session, so signing out revokes access. A transaction and its settlement commit atomically; concurrent confirmations reuse one transaction identity. Language-model requests run outside database transactions; the draft revision is reserved first and checked again before applying the result. A newer edit supersedes an older interpretation. Speech playback failure cannot repeat the ledger write.

Text and form requests preserve the draft when switching modes within the dialog. Closing and reopening starts a new entry. If a response is lost, the current session state can be refreshed; no automatic claim of success is made before database commit.

## Other Integrations

- **YugabyteDB:** `DATABASE_URL` must point to a development/test YSQL cluster. Ledgers and conversations are scoped to the authenticated account.
- **Meko:** Set `MEKO_API_KEY`, `MEKO_DATAPACK_ID`, and optionally `MEKO_MCP_URL`. Business memory is scoped to the configured business. Tool results are context, never payment evidence.
- **Razorpay:** Test Mode only. Live key IDs remain blocked. Set `RAZORPAY_WEBHOOK_SECRET` and subscribe the public `POST /api/webhooks/razorpay` endpoint to `payment_link.paid`. A signed event updates the linked business transaction; it does not verify unrelated QR, cash or bank payments. Production onboarding and payment matching are separate work.

## Verification

`pnpm build` checks contracts, API, voice worker and web. No automated test suite is included.

Live STT accuracy, Hindi/Hinglish conversation, interrupted audio, TTS voices, provider latency, and real Google OAuth still require configured accounts and a browser with microphone access. A successful build does not establish speech accuracy or latency. Never commit `.env` or use live payment credentials in this build.
