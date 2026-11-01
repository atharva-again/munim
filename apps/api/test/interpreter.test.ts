import assert from "node:assert/strict";
import test from "node:test";
import { conversationSchema } from "@munim/contracts";
import { interpret } from "../src/services/interpreter.js";

test("an ungrounded payment change cannot retain a previous settled status", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  const originalMemory = process.env.MUNIM_MEMORY_ENABLED;
  process.env.GROQ_API_KEY = "test-only";
  process.env.MUNIM_MEMORY_ENABLED = "false";
  let paymentStatusQuote = "not paid";
  globalThis.fetch = async () => Response.json({ choices: [{ message: { content: JSON.stringify({ decision: {
    action: "proposal",
    result: {
      displayText: { en: { description: "Milk", counterparty: "Ramesh" }, hi: { description: "दूध", counterparty: "रमेश" } },
      paymentStatusQuote,
      draft: { kind: "sale", amountPaise: 50000, description: "milk", counterparty: "Ramesh", paymentMethod: null, settlementStatus: "open", occurredAt: null, settledAmountPaise: null, otherDirection: null },
      clarification: null, language: "en", usedMemoryIds: [],
    },
  } }) } }] });
  try {
    const id = "e9ae402c-9dc1-41b3-a350-238700168ace";
    const state = conversationSchema.parse({ id, entryId: id, purpose: "record", language: "en", replyLanguage: "en", approvalMode: "approval", revision: 1,
      draft: { kind: "sale", direction: "inflow", amountPaise: 50000, description: "milk", counterparty: "Ramesh", settlementStatus: "settled" },
      phase: "collecting", messages: [], reply: "", replyIsReview: false, reviewedRevision: null, voiceReviewedRevision: null, transactionId: null,
      memory: { status: "disabled", facts: [], usedIds: [] } });
    const result = await interpret(state, "The payment was reversed.", "test", "test");
    assert.equal(result.kind, "proposal");
    if (result.kind !== "proposal") throw new Error("Expected a proposal");
    assert.equal(result.draft.settlementStatus, undefined);
    assert.notEqual(result.question, "");
    paymentStatusQuote = "on credit";
    const grounded = await interpret(state, "It is on credit.", "test", "test-grounded");
    assert.equal(grounded.kind, "proposal");
    if (grounded.kind !== "proposal") throw new Error("Expected a proposal");
    assert.equal(grounded.draft.settlementStatus, "open");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalKey;
    if (originalMemory === undefined) delete process.env.MUNIM_MEMORY_ENABLED; else process.env.MUNIM_MEMORY_ENABLED = originalMemory;
  }
});
