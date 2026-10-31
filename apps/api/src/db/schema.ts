import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  paymentMethods,
  settlementStatuses,
  transactionDirections,
  transactionKinds,
} from "@munim/contracts";

export const transactionKindEnum = pgEnum(
  "munim_transaction_kind",
  transactionKinds,
);
export const transactionDirectionEnum = pgEnum(
  "munim_transaction_direction",
  transactionDirections,
);
export const settlementStatusEnum = pgEnum(
  "munim_settlement_status",
  settlementStatuses,
);
export const paymentMethodEnum = pgEnum("munim_payment_method", paymentMethods);
export const settlementSourceEnum = pgEnum("munim_settlement_source", [
  "manual",
  "razorpay",
]);

export const transactions = pgTable(
  "munim_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: text("business_id").notNull(),
    kind: transactionKindEnum("kind").notNull(),
    direction: transactionDirectionEnum("direction").notNull(),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    description: text("description").notNull(),
    counterparty: text("counterparty").notNull().default(""),
    paymentMethod: paymentMethodEnum("payment_method"),
    settlementStatus: settlementStatusEnum("settlement_status")
      .notNull()
      .default("settled"),
    source: text("source").notNull().default("manual"),
    approvalMode: text("approval_mode").notNull().default("approval"),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("munim_transactions_business_occurred_idx").on(
      table.businessId,
      table.occurredAt,
    ),
  ],
);

export const settlements = pgTable(
  "munim_settlements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: text("business_id").notNull(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    direction: transactionDirectionEnum("direction").notNull(),
    method: paymentMethodEnum("method"),
    source: settlementSourceEnum("source").notNull().default("manual"),
    providerReference: text("provider_reference"),
    providerEventId: text("provider_event_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("munim_settlements_business_occurred_idx").on(
      table.businessId,
      table.occurredAt,
    ),
    uniqueIndex("munim_settlements_provider_event_uidx").on(
      table.providerEventId,
    ),
  ],
);

export const paymentRequests = pgTable(
  "munim_payment_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: text("business_id").notNull(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id),
    provider: text("provider").notNull().default("razorpay"),
    providerLinkId: text("provider_link_id").notNull(),
    shortUrl: text("short_url").notNull(),
    status: text("status").notNull().default("created"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("munim_payment_requests_link_uidx").on(table.providerLinkId),
    uniqueIndex("munim_payment_requests_transaction_uidx").on(
      table.transactionId,
    ),
  ],
);

export const webhookEvents = pgTable("munim_webhook_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const conversations = pgTable("munim_conversations", {
  id: uuid("id").primaryKey(),
  businessId: text("business_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  authSessionId: text("auth_session_id").notNull(),
  state: jsonb("state").notNull(),
  receipts: jsonb("receipts").notNull().default({}),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
});

export const userPreferences = pgTable("munim_preferences", {
  businessId: text("business_id").primaryKey(),
  language: text("language").notNull(),
  approvalMode: text("approval_mode"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});
