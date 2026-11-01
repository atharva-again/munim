<p align="center">
  <img src="apps/web/public/munim-logo.png" alt="Munim logo" width="240" />
</p>

<h1 align="center">munim</h1>

<p align="center">A voice-first financial assistant for Indian shopkeepers.</p>

Munim turns spoken or typed conversations into bookkeeping entries. It remembers shop conventions across conversations, keeps the original words intact, and lets shopkeepers choose whether to approve each entry or save complete entries automatically. The app supports English, Hindi, and mixed Hindi-English speech.

## Features

- **Record by voice or text:** Describe a sale, purchase, expense, or other transaction. Munim asks for missing details and prepares a validated entry.
- **Understand the ledger:** Search transactions and ask about recorded activity or outstanding balances. Insights shows payment movement and dues by person.
- **Remember the shop:** Meko recalls shop terminology and conventions. Business Memory lets users inspect, search, correct, or forget returned facts.
- **Keep control of saving:** Ask for Approval requires a reviewed confirmation. Full Autonomy saves complete, validated proposals directly.
- **Work in your language:** Use the app in English or Hindi, while retaining original transaction descriptions and conversation text.
- **Review past conversations:** Browse saved finance conversations without reopening a draft or changing the ledger.

YugabyteDB holds the financial ledger. Meko provides context, never proof of a payment, amount, or authorization.

## How it works

```mermaid
flowchart LR
    User[Shopkeeper] -->|Voice| LiveKit[LiveKit and Sarvam speech]
    User -->|Text| API[Munim API]
    LiveKit --> API
    API -->|Recall context| Meko[Meko memory]
    API <-->|Interpret and answer| Groq[Groq]
    API -->|Validate and save| DB[(YugabyteDB ledger)]
    API -->|Queue eligible exchanges| Meko
    API -->|Text reply| User
    API -->|Voice reply| Speech[Sarvam speech and LiveKit]
    Speech --> User
```

The API retrieves bounded shop context before interpretation. Groq proposes an action or a read; the backend validates it, applies the account's saving policy, and writes the ledger. Eligible exchanges are sent to Meko in the background. Each account has its own runtime datapack.

See [architecture](docs/architecture.md) for the voice, memory, and approval flows.

## Run locally

Use Node.js 22+, the pnpm version pinned in `package.json`, and a **new development YugabyteDB database**. Set up your provider credentials before running the setup command.

```sh
cp .env.example .env
pnpm install
pnpm setup:local
pnpm dev:all
```

After the first command, edit `.env`. The required settings are:

| Service | Variables |
| --- | --- |
| YugabyteDB | `DATABASE_URL` |
| Google sign-in | `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| LiveKit | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| Sarvam and Groq | `SARVAM_API_KEY`, `GROQ_API_KEY` |
| Meko | `MEKO_API_KEY` and `MEKO_PROVISIONING_DATAPACK_ID` or `MEKO_DATAPACK_ID` |

Register `http://localhost:5173/api/auth/callback/google` in Google Cloud. Open [localhost:5173](http://localhost:5173); the API runs on port `3001`. The setup command initializes the schema and downloads voice resources. It includes `db:push`, so use it only with a new development database. For an existing database, use `pnpm db:migrate` instead.

Keep provider keys server-side and never commit `.env`. In production, serve the website and `/api` from the same HTTPS origin. Voice also requires a persistent worker, a reachable `MUNIM_API_URL`, and microphone permission.

## Future scope

- Apply payments to existing outstanding balances.
- Correct or reverse saved entries with a clear audit trail.
- Restore unfinished drafts across sessions.
- Improve mobile and offline support.
- Validate voice accuracy and reliability in real shop environments.

## Verification

- `pnpm build` builds the contracts, API, voice worker, and web app.
- `pnpm --filter @munim/api test` runs focused regression tests. The dues test uses temporary tables and skips without `DATABASE_URL`.
