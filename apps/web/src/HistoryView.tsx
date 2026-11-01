import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  LoaderCircle,
  Mic,
} from "lucide-react";
import type { ConversationHistory } from "@munim/contracts";
import { api, formatDate } from "./api";
import { ChatBubble } from "./ChatBubble";
import { useI18n } from "./i18n";
import { buttonClass } from "./ui";

export default function HistoryView() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const conversationId = params.get("conversation");
  const [page, setPage] = useState(0);
  const [list, setList] = useState<
    Awaited<ReturnType<typeof api.conversationHistory>> | null
  >(null);
  const [conversation, setConversation] =
    useState<ConversationHistory | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setConversation(null);

    const request = conversationId
      ? api
          .pastConversation(conversationId, controller.signal)
          .then(setConversation)
      : api
          .conversationHistory(page, controller.signal)
          .then(setList);

    void request
      .catch((caught: unknown) => {
        if (!controller.signal.aborted)
          setError(
            caught instanceof Error
              ? caught.message
              : t("Could not complete that request."),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });

    return () => controller.abort();
  }, [conversationId, page, retry, t]);

  return (
    <section className="mx-auto w-full max-w-220 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className={buttonClass} to="/record">
          <ArrowLeft size={14} />
          {t("Record Transaction")}
        </Link>
        <h1 className="sr-only">{t("Past Conversations")}</h1>
      </div>

      <p className="text-xs text-muted">
        {t("Saved finance conversations. Original words, read-only.")}
      </p>

      {busy ? (
        <p role="status" className="flex gap-2 text-xs text-muted">
          <LoaderCircle size={14} className="motion-safe:animate-spin" />
          {t("Loading…")}
        </p>
      ) : error ? (
        <div role="alert" className="space-y-3 text-xs">
          <p className="text-status-red">{error}</p>
          <button
            className={buttonClass}
            onClick={() => setRetry((value) => value + 1)}
          >
            {t("Try Again")}
          </button>
        </div>
      ) : conversation ? (
        <>
          <button
            type="button"
            className={buttonClass}
            onClick={() => setParams({})}
          >
            {t("All Conversations")}
          </button>
          <div className="space-y-3 rounded-xl border border-line p-4 sm:p-6">
            {conversation.messages.map((message, index) => (
              <ChatBubble
                key={`${message.at}-${index}`}
                role={message.role}
                text={message.text}
                at={Date.parse(message.at)}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          {!list?.items.length ? (
            <p className="rounded-xl border border-line p-6 text-sm text-muted">
              {t("No saved conversations yet.")}
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {list.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="grid w-full cursor-pointer gap-2 px-5 py-4 text-left hover:bg-soft"
                    onClick={() => setParams({ conversation: item.id })}
                  >
                    <span className="line-clamp-2 text-sm leading-6">
                      {item.preview}
                    </span>
                    <span className="flex items-center gap-2 text-[11px] text-muted">
                      {item.channels.includes("voice") && <Mic size={13} />}
                      {item.channels.includes("text") && (
                        <Keyboard size={13} />
                      )}
                      {formatDate(item.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between">
            <button
              className={buttonClass}
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              <ChevronLeft size={14} />
              {t("Previous")}
            </button>
            <button
              className={buttonClass}
              disabled={!list?.hasMore}
              onClick={() => setPage((value) => value + 1)}
            >
              {t("Next")}
              <ChevronRight size={14} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
