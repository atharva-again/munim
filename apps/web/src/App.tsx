import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  ExternalLink,
  FileClock,
  HeartHandshake,
  Landmark,
  LoaderCircle,
  Mic,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import {
  transactionKindLabels,
  type CreateTransactionInput,
  type LedgerSummary,
  type Transaction,
} from "@munim/contracts";
import { api, formatDate, formatRupees, type ApiHealth } from "./api";
import { TransactionDialog } from "./TransactionDialog";

type View = "overview" | "transactions" | "memory";

const emptySummary: LedgerSummary = {
  settledInflowPaise: 0,
  settledOutflowPaise: 0,
  openInflowPaise: 0,
  openOutflowPaise: 0,
  transactionCount: 0,
};

function localGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function directionLabel(direction: Transaction["direction"]) {
  if (direction === "inflow") return "Money in";
  if (direction === "outflow") return "Money out";
  return "Transfer";
}

function statusLabel(status: Transaction["settlementStatus"]) {
  if (status === "settled") return "Settled";
  if (status === "partial") return "Partially settled";
  return "Open";
}

function HealthPill({
  label,
  state,
}: {
  label: string;
  state:
    | "connected"
    | "configured"
    | "not_configured"
    | "unreachable"
    | "provider_selected"
    | "adapter_pending"
    | "live_keys_rejected";
}) {
  const good = state === "connected" || state === "configured" || state === "provider_selected";
  const text =
    state === "connected"
      ? "Connected"
      : state === "configured"
        ? "Ready"
        : state === "provider_selected"
          ? "Provider selected"
          : state === "adapter_pending"
            ? "Adapter pending"
            : state === "live_keys_rejected"
              ? "Live keys blocked"
          : state === "unreachable"
            ? "Unreachable"
            : "Not connected";
  return (
    <span className={`health-pill ${good ? "is-good" : "is-muted"}`}>
      <span className="health-dot" />
      <span>{label}</span>
      <strong>{text}</strong>
    </span>
  );
}

function TransactionRow({
  transaction,
  paymentEnabled,
  onPaymentLink,
  busy,
}: {
  transaction: Transaction;
  paymentEnabled: boolean;
  onPaymentLink: (transaction: Transaction) => void;
  busy: boolean;
}) {
  const transfer = transaction.direction === "transfer";
  const inflow = transaction.direction === "inflow";
  const marker = transfer ? (
    <ArrowLeftRight size={16} />
  ) : inflow ? (
    <ArrowDownLeft size={16} />
  ) : (
    <ArrowUpRight size={16} />
  );

  return (
    <div className="transaction-row">
      <div className={`transaction-icon ${inflow ? "is-inflow" : transfer ? "is-transfer" : "is-outflow"}`}>
        {marker}
      </div>
      <div className="transaction-description">
        <strong>{transaction.description}</strong>
        <span>
          {transaction.counterparty || transactionKindLabels[transaction.kind]}
          <i>·</i>
          {formatDate(transaction.occurredAt)}
        </span>
      </div>
      <div className="transaction-kind">
        <span>{transactionKindLabels[transaction.kind]}</span>
        <small>{statusLabel(transaction.settlementStatus)}</small>
      </div>
      <div className={`transaction-amount ${inflow ? "is-positive" : transfer ? "" : "is-negative"}`}>
        {inflow ? "+" : transfer ? "" : "−"}
        {formatRupees(transaction.amountPaise)}
      </div>
      {transaction.settlementStatus !== "settled" &&
        transaction.direction === "inflow" &&
        !transaction.paymentLink && (
          <button
            className="row-action"
            type="button"
            title={
              paymentEnabled
                ? "Create a Razorpay test payment link"
                : "Configure Razorpay test keys to create a link"
            }
            disabled={!paymentEnabled || busy}
            onClick={() => onPaymentLink(transaction)}
          >
            {busy ? <LoaderCircle className="spin" size={16} /> : <ExternalLink size={16} />}
            <span>Request</span>
          </button>
        )}
      {transaction.paymentLink && (
        <a
          className="row-action row-link"
          href={transaction.paymentLink.shortUrl}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={16} />
          <span>Payment link</span>
        </a>
      )}
    </div>
  );
}

function MemoryView({ configured }: { configured: boolean }) {
  const [query, setQuery] = useState("");
  const [memoryText, setMemoryText] = useState("");
  const [resultText, setResultText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"search" | "add" | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setMessage("");
    setMode("search");
    try {
      const response = await api.searchMemory(query.trim());
      setResultText(JSON.stringify(response.result, null, 2));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Memory search failed.");
    } finally {
      setBusy(false);
    }
  };

  const addMemory = async () => {
    if (!memoryText.trim()) return;
    setBusy(true);
    setMessage("");
    setMode("add");
    try {
      const response = await api.addMemory(memoryText.trim());
      setResultText(JSON.stringify(response.result, null, 2));
      setMemoryText("");
      setMessage("Saved to Meko memory.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save memory.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="memory-layout">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> BUSINESS CONTEXT</div>
          <h1>Memory that moves with the business.</h1>
          <p>Munim uses Meko to recall shop context across sessions. Financial records stay in the Yugabyte ledger.</p>
        </div>
        <div className={`connection-badge ${configured ? "is-connected" : ""}`}>
          <Sparkles size={16} />
          {configured ? "Meko connected" : "Meko setup needed"}
        </div>
      </div>

      {!configured && (
        <div className="notice-card">
          <div className="notice-icon"><CircleHelp size={18} /></div>
          <div>
            <strong>Connect the business memory layer</strong>
            <p>Add <code>MEKO_API_KEY</code> and <code>MEKO_DATAPACK_ID</code> to the server environment. No memory is simulated in this screen.</p>
          </div>
        </div>
      )}

      <div className="memory-grid">
        <article className="surface-card memory-action-card">
          <div className="card-icon icon-lime"><Search size={18} /></div>
          <h2>Recall business context</h2>
          <p>Search the connected datapack for useful conventions, terminology, or prior decisions.</p>
          <label className="field">
            <span>What context should Munim look for?</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. How do we categorize delivery fuel?"
              onKeyDown={(event) => {
                if (event.key === "Enter") void search();
              }}
              disabled={!configured || busy}
            />
          </label>
          <button
            className="button button-primary button-full"
            type="button"
            disabled={!configured || !query.trim() || busy}
            onClick={() => void search()}
          >
            {busy && mode === "search" ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />}
            Search Meko
          </button>
        </article>

        <article className="surface-card memory-action-card">
          <div className="card-icon icon-violet"><Sparkles size={18} /></div>
          <h2>Teach Munim a convention</h2>
          <p>Save a durable business preference or correction. Don’t store balances or transaction amounts as memory.</p>
          <label className="field">
            <span>Business convention</span>
            <textarea
              rows={3}
              maxLength={2000}
              value={memoryText}
              onChange={(event) => setMemoryText(event.target.value)}
              placeholder="When I say “gaadi kharcha”, categorize it as delivery expense."
              disabled={!configured || busy}
            />
          </label>
          <button
            className="button button-dark button-full"
            type="button"
            disabled={!configured || !memoryText.trim() || busy}
            onClick={() => void addMemory()}
          >
            {busy && mode === "add" ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
            Save to Meko memory
          </button>
        </article>
      </div>

      {(message || resultText) && (
        <article className="surface-card memory-result">
          <div className="result-heading">
            <div>
              <span className="eyebrow">LIVE MEKO RESPONSE</span>
              <h2>{message || (mode === "search" ? "Retrieved context" : "Memory response")}</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Clear memory result"
              onClick={() => {
                setMessage("");
                setResultText("");
              }}
            >
              <X size={17} />
            </button>
          </div>
          {resultText && <pre className="memory-output">{resultText}</pre>}
        </article>
      )}
      {message && !resultText && <p className="inline-message">{message}</p>}
    </section>
  );
}

export default function App() {
  const [view, setView] = useState<View>("overview");
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [summary, setSummary] = useState<LedgerSummary>(emptySummary);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentBusyId, setPaymentBusyId] = useState("");
  const [toast, setToast] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const currentHealth = await api.health();
      setHealth(currentHealth);
      if (currentHealth.database !== "connected") {
        setSummary(emptySummary);
        setTransactions([]);
        setApiError("");
        setLastUpdated(new Date());
        return;
      }
      const [currentSummary, currentTransactions] = await Promise.all([
        api.summary(),
        api.transactions(),
      ]);
      setSummary(currentSummary);
      setTransactions(currentTransactions);
      setApiError("");
      setLastUpdated(new Date());
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "The API could not be reached.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(true);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const title = useMemo(
    () =>
      view === "overview"
        ? "Overview"
        : view === "transactions"
          ? "Transactions"
          : "Business memory",
    [view],
  );

  const saveTransaction = async (input: CreateTransactionInput) => {
    setSaving(true);
    try {
      await api.createTransaction(input);
      setToast("Transaction saved to the ledger.");
      await refresh(true);
    } finally {
      setSaving(false);
    }
  };

  const createPaymentLink = async (transaction: Transaction) => {
    setPaymentBusyId(transaction.id);
    try {
      const link = await api.createPaymentLink(transaction.id);
      setToast("Razorpay test link created. Copy it to share with the customer.");
      await refresh(true);
      try {
        await navigator.clipboard.writeText(link.shortUrl);
        setToast("Razorpay test link copied to clipboard.");
      } catch {
        window.open(link.shortUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not create a payment link.");
    } finally {
      setPaymentBusyId("");
    }
  };

  const databaseConnected = health?.database === "connected";
  const paymentEnabled = health?.razorpay === "test_keys_configured";
  const visibleTransactions =
    view === "overview" ? transactions.slice(0, 6) : transactions;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-name">munim<span>.</span></div>
            <div className="brand-caption">BUSINESS FINANCE</div>
          </div>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">B</div>
          <div className="workspace-copy">
            <span>Current workspace</span>
            <strong>Business ledger</strong>
          </div>
          <ChevronDown size={15} />
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          <button
            type="button"
            className={view === "overview" ? "nav-item is-active" : "nav-item"}
            onClick={() => setView("overview")}
          >
            <Activity size={17} />
            <span>Overview</span>
          </button>
          <button
            type="button"
            className={view === "transactions" ? "nav-item is-active" : "nav-item"}
            onClick={() => setView("transactions")}
          >
            <ClipboardList size={17} />
            <span>Transactions</span>
            {summary.transactionCount > 0 && (
              <span className="nav-count">{summary.transactionCount}</span>
            )}
          </button>
          <button
            type="button"
            className={view === "memory" ? "nav-item is-active" : "nav-item"}
            onClick={() => setView("memory")}
          >
            <Sparkles size={17} />
            <span>Business memory</span>
            <span className={`nav-status ${health?.meko === "configured" ? "is-on" : ""}`} />
          </button>
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-health">
          <div className="sidebar-health-head">
            <span>LIVE SYSTEMS</span>
            <button
              className="icon-button mini"
              type="button"
              aria-label="Refresh system status"
              onClick={() => void refresh(true)}
            >
              <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            </button>
          </div>
          <HealthPill label="Ledger" state={health?.database ?? "not_configured"} />
          <HealthPill label="Meko" state={health?.meko ?? "not_configured"} />
          <HealthPill
            label="Voice"
            state={health?.speechToText ?? "not_configured"}
          />
        </div>

        <div className="profile-strip">
          <div className="profile-avatar">M</div>
          <div>
            <strong>Munim workspace</strong>
            <span>Single-user preview</span>
          </div>
          <button className="icon-button mini" aria-label="Help" type="button">
            <CircleHelp size={16} />
          </button>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="mobile-brand">
            <div className="brand-mark small-mark">M</div>
            <span>munim<span>.</span></span>
          </div>
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="crumb-separator">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="today-label">{new Intl.DateTimeFormat("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            }).format(new Date())}</span>
            <button
              className="button button-primary top-add-button"
              type="button"
              onClick={() => setDialogOpen(true)}
            >
              <Plus size={17} />
              <span>Record transaction</span>
            </button>
            <button
              className="avatar-button"
              type="button"
              aria-label="Workspace profile"
              title="Single-user preview"
            >
              M
            </button>
          </div>
        </header>

        <div className="page-content">
          {view === "memory" ? (
            <MemoryView configured={health?.meko === "configured"} />
          ) : (
            <>
              <div className="page-heading page-heading-overview">
                <div>
                  <div className="eyebrow"><span className="eyebrow-dot" /> YOUR BUSINESS, IN FOCUS</div>
                  <h1>{view === "overview" ? `${localGreeting()}.` : "The full ledger."}</h1>
                  <p>
                    {view === "overview"
                      ? "Every money movement, with context and follow-through."
                      : "A live record of your business transactions."}
                  </p>
                </div>
                <div className="updated-label">
                  <span className={`health-dot ${databaseConnected ? "dot-live" : ""}`} />
                  {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Connecting"}
                  <button
                    className="icon-button mini"
                    type="button"
                    aria-label="Refresh ledger"
                    onClick={() => void refresh(true)}
                  >
                    <RefreshCw size={15} className={refreshing ? "spin" : ""} />
                  </button>
                </div>
              </div>

              {apiError && (
                <div className="notice-card notice-error">
                  <div className="notice-icon"><CircleHelp size={18} /></div>
                  <div>
                    <strong>Couldn’t reach Munim’s API</strong>
                    <p>{apiError}</p>
                  </div>
                </div>
              )}

              {!databaseConnected && !apiError && (
                <div className="notice-card">
                  <div className="notice-icon"><Landmark size={18} /></div>
                  <div>
                    <strong>Connect the Yugabyte ledger to begin</strong>
                    <p>
                      No sample transactions are being shown. Add <code>DATABASE_URL</code> to <code>.env</code>, then run <code>pnpm db:push</code>.
                    </p>
                  </div>
                  <button
                    className="button button-quiet notice-retry"
                    type="button"
                    onClick={() => void refresh(true)}
                  >
                    Check again
                  </button>
                </div>
              )}

              {view === "overview" && (
                <>
                  <section className="capture-band">
                    <div className="capture-copy">
                      <div className="capture-overline"><AudioLines size={15} /> THE DAILY OPERATOR</div>
                      <h2>Say what happened.<br /><em>Munim keeps the thread.</em></h2>
                      <p>Record a sale, payment, purchase, expense or transfer. Review before it reaches the ledger.</p>
                      <div className="capture-actions">
                        <button
                          className="button button-lime"
                          type="button"
                          onClick={() => setDialogOpen(true)}
                        >
                          <Plus size={17} /> Add transaction
                        </button>
                        <button
                          className="button button-outline-light"
                          type="button"
                          disabled={health?.speechToText !== "provider_selected"}
                          title={
                            health?.speechToText === "provider_selected"
                              ? "Voice capture is ready"
                              : "Choose an STT provider to enable voice capture"
                          }
                          onClick={() =>
                            setToast("Voice capture will turn on when an STT provider is configured.")
                          }
                        >
                          <Mic size={16} /> Speak
                          {health?.speechToText !== "provider_selected" && (
                            <span className="button-hint">STT setup</span>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="capture-art" aria-hidden="true">
                      <div className="orbit orbit-one" />
                      <div className="orbit orbit-two" />
                      <div className="orbit orbit-three" />
                      <div className="capture-core"><AudioLines size={31} /></div>
                      <div className="floating-dot dot-one" />
                      <div className="floating-dot dot-two" />
                    </div>
                    <div className="capture-grain" />
                  </section>

                  <section className="metric-grid" aria-label="Ledger summary">
                    <MetricCard
                      icon={<ArrowDownLeft size={17} />}
                      label="Money received"
                      value={databaseConnected ? formatRupees(summary.settledInflowPaise) : "—"}
                      detail="Settled inflows"
                      tone="green"
                      loading={loading}
                    />
                    <MetricCard
                      icon={<ArrowUpRight size={17} />}
                      label="Money paid"
                      value={databaseConnected ? formatRupees(summary.settledOutflowPaise) : "—"}
                      detail="Settled outflows"
                      tone="lavender"
                      loading={loading}
                    />
                    <MetricCard
                      icon={<FileClock size={17} />}
                      label="Needs follow-through"
                      value={
                        databaseConnected
                          ? formatRupees(summary.openInflowPaise + summary.openOutflowPaise)
                          : "—"
                      }
                      detail={`${summary.transactionCount} recorded ${summary.transactionCount === 1 ? "transaction" : "transactions"}`}
                      tone="sand"
                      loading={loading}
                    />
                  </section>

                  <div className="content-grid">
                    <section className="surface-card activity-card">
                      <div className="section-header">
                        <div>
                          <div className="eyebrow">THE PAPER TRAIL</div>
                          <h2>Recent activity</h2>
                        </div>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => setView("transactions")}
                        >
                          View ledger <ArrowUpRight size={15} />
                        </button>
                      </div>
                      {loading ? (
                        <LoadingRows />
                      ) : !databaseConnected ? (
                        <EmptyState
                          icon={<Landmark size={20} />}
                          title="Ledger connection needed"
                          detail="Transactions will appear here once YugabyteDB is connected."
                        />
                      ) : transactions.length === 0 ? (
                        <EmptyState
                          icon={<ClipboardList size={20} />}
                          title="Nothing recorded yet"
                          detail="Your activity will appear here as real transactions are added."
                          action={
                            <button
                              type="button"
                              className="button button-quiet"
                              onClick={() => setDialogOpen(true)}
                            >
                              <Plus size={16} /> Record the first one
                            </button>
                          }
                        />
                      ) : (
                        <div className="transaction-list">
                          {visibleTransactions.map((transaction) => (
                            <TransactionRow
                              key={transaction.id}
                              transaction={transaction}
                              paymentEnabled={paymentEnabled}
                              onPaymentLink={createPaymentLink}
                              busy={paymentBusyId === transaction.id}
                            />
                          ))}
                        </div>
                      )}
                    </section>

                    <aside className="right-column">
                      <section className="surface-card memory-card">
                        <div className="memory-card-top">
                          <div className="card-icon icon-lime"><Sparkles size={18} /></div>
                          <span className={`live-label ${health?.meko === "configured" ? "is-live" : ""}`}>
                            <span className="health-dot" />
                            {health?.meko === "configured" ? "CONNECTED" : "NOT CONNECTED"}
                          </span>
                        </div>
                        <div className="eyebrow">MEKO · SHARED CONTEXT</div>
                        <h2>Business memory.</h2>
                        <p>Shop language and decisions can carry across sessions. Balances and transactions stay in the ledger.</p>
                        <button
                          type="button"
                          className="button button-outline-dark button-full"
                          onClick={() => setView("memory")}
                        >
                          Explore memory <ArrowRightIcon />
                        </button>
                      </section>

                      <section className="surface-card reconciliation-card">
                        <div className="card-heading-inline">
                          <div className="card-icon icon-violet"><HeartHandshake size={17} /></div>
                          <span className="eyebrow">CLOSE THE LOOP</span>
                        </div>
                        <h3>From recorded to resolved.</h3>
                        <p>Open incoming entries can become a Razorpay test payment request. Settlement changes only after a verified webhook.</p>
                        <div className="reconciliation-foot">
                          <span className={`integration-mark ${paymentEnabled ? "is-ready" : ""}`}>
                            <WalletCards size={14} />
                            RAZORPAY TEST MODE
                          </span>
                          <span className="integration-state">
                            {paymentEnabled
                              ? "Ready"
                              : health?.razorpay === "live_keys_rejected"
                                ? "Live keys blocked"
                                : "Awaiting keys"}
                          </span>
                        </div>
                      </section>
                    </aside>
                  </div>
                </>
              )}

              {view === "transactions" && (
                <section className="surface-card full-ledger">
                  <div className="section-header ledger-header">
                    <div>
                      <div className="eyebrow">BUSINESS LEDGER</div>
                      <h2>Transactions</h2>
                      <p>Entries are read from YugabyteDB—this view never fills itself with demo rows.</p>
                    </div>
                    <button
                      className="button button-primary"
                      type="button"
                      onClick={() => setDialogOpen(true)}
                    >
                      <Plus size={16} /> Record transaction
                    </button>
                  </div>
                  {loading ? (
                    <LoadingRows />
                  ) : databaseConnected && transactions.length > 0 ? (
                    <div className="transaction-list">
                      {transactions.map((transaction) => (
                        <TransactionRow
                          key={transaction.id}
                          transaction={transaction}
                          paymentEnabled={paymentEnabled}
                          onPaymentLink={createPaymentLink}
                          busy={paymentBusyId === transaction.id}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<ClipboardList size={20} />}
                      title={databaseConnected ? "Your ledger is ready" : "Connect the ledger"}
                      detail={
                        databaseConnected
                          ? "The first confirmed transaction will appear here."
                          : "Set DATABASE_URL and run the schema setup to load real ledger data."
                      }
                    />
                  )}
                </section>
              )}
            </>
          )}
        </div>

        <footer className="page-footer">
          <span><ShieldCheck size={14} /> Confirmed activity is written to the ledger.</span>
          <span>Munim · Financial operations</span>
        </footer>
      </main>

      <nav className="mobile-nav" aria-label="Main navigation">
        <button
          type="button"
          className={view === "overview" ? "is-active" : ""}
          aria-current={view === "overview" ? "page" : undefined}
          onClick={() => setView("overview")}
        >
          <Activity size={18} />
          <span>Overview</span>
        </button>
        <button
          type="button"
          className={view === "transactions" ? "is-active" : ""}
          aria-current={view === "transactions" ? "page" : undefined}
          onClick={() => setView("transactions")}
        >
          <ClipboardList size={18} />
          <span>Transactions</span>
        </button>
        <button
          type="button"
          className={view === "memory" ? "is-active" : ""}
          aria-current={view === "memory" ? "page" : undefined}
          onClick={() => setView("memory")}
        >
          <Sparkles size={18} />
          <span>Memory</span>
        </button>
      </nav>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={saveTransaction}
        saving={saving}
        mekoConfigured={health?.meko === "configured"}
      />

      {toast && (
        <div className="toast" role="status">
          <span className="toast-check"><Check size={15} /></span>
          <span>{toast}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
  loading,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "green" | "lavender" | "sand";
  loading: boolean;
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className={`metric-icon tone-${tone}`}>{icon}</span>
        <span className="metric-label">{label}</span>
        <span className="metric-more"><ChevronDown size={15} /></span>
      </div>
      <div className="metric-value">{loading ? <span className="skeleton-value" /> : value}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

function EmptyState({
  icon,
  title,
  detail,
  action,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{detail}</p>
      {action}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="loading-rows" aria-label="Loading ledger activity">
      <div /><div /><div />
    </div>
  );
}

function ArrowRightIcon() {
  return <ArrowUpRight size={15} />;
}

