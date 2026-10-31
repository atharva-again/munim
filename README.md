# Munim

Munim is a mobile-first financial operator for small businesses. The current vertical slice records and reconciles business transactions, keeps durable business context in Meko, and can create Razorpay **test-mode** payment links. YugabyteDB is the source of truth for transactions and settlements; Meko is contextual memory, not a ledger.

## Stack

- React, Vite, TypeScript, custom CSS, and Base UI
- Hono on Node.js
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
pnpm dev
```

The web app is served at `http://localhost:5173`; the API is at `http://localhost:3001`. The UI does not seed or display sample transactions: it remains empty until connected to a database and given real entries.

## Integrations

- **YugabyteDB:** Set `DATABASE_URL`. `MUNIM_BUSINESS_ID` scopes this single-workspace MVP; there is no authentication or multi-user isolation yet. Do not expose this deployment publicly with real business data.
- **Meko:** Set server-side `MEKO_API_KEY` and `MEKO_DATAPACK_ID`. `MEKO_MCP_URL` defaults to `https://mcp.mekodata.ai/mcp`. The Memory page performs live searches and writes against that datapack; the transaction review can explicitly look up relevant shop context before confirmation.
- **Razorpay:** Use only Test Mode values for `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`; the API rejects key IDs that are not prefixed `rzp_test_`. Configure `RAZORPAY_WEBHOOK_SECRET` and point the Razorpay test webhook at `POST /api/webhooks/razorpay` for `payment_link.paid`. Settlement is recorded only after signature verification.
- **Voice:** STT is intentionally not enabled yet. `STT_PROVIDER` and `STT_API_KEY` alone do not activate capture; an actual provider adapter still needs to be selected and implemented.

Never commit `.env` or use live payment credentials in this hackathon build.
