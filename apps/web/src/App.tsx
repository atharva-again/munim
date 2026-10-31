import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpenText,
  Check,
  CircleHelp,
  FileClock,
  Landmark,
  LayoutDashboard,
  ListOrdered,
  Moon,
  Plus,
  Sun,
  LogOut,
  X,
} from "lucide-react";
import type { LedgerSummary, Transaction } from "@munim/contracts";
import { authClient } from "./auth-client";
import { api, formatRupees, type ApiHealth } from "./api";
import { TransactionList } from "./TransactionList";
import {
  headingClass,
  iconButtonClass,
  LoadingRows,
  panelClass,
  primaryClass,
} from "./ui";

const loadDialog = () =>
  import("./TransactionDialog").then((module) => ({
    default: module.TransactionDialog,
  }));
const TransactionDialog = lazy(loadDialog);
const MemoryView = lazy(() => import("./MemoryView"));
const TransactionsView = lazy(() => import("./TransactionsView"));
type View = "overview" | "transactions" | "memory";
const navigation = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", Icon: ListOrdered },
  { id: "memory", label: "Business Memory", Icon: BookOpenText },
] satisfies { id: View; label: string; Icon: typeof LayoutDashboard }[];
const emptySummary: LedgerSummary = {
  settledInflowPaise: 0,
  settledOutflowPaise: 0,
  openInflowPaise: 0,
  openOutflowPaise: 0,
  transactionCount: 0,
};
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
export default function App() {
  const [view, setView] = useState<View>("overview");
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [summary, setSummary] = useState<LedgerSummary>(emptySummary);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentBusyId, setPaymentBusyId] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = (event: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem("munim-theme")) return;
      } catch {
        // Keep following the system when storage is unavailable.
      }
      const nextTheme = event.matches ? "dark" : "light";
      document.documentElement.dataset.theme = nextTheme;
      setTheme(nextTheme);
    };
    preference.addEventListener("change", syncSystemTheme);
    return () => preference.removeEventListener("change", syncSystemTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
    try {
      localStorage.setItem("munim-theme", nextTheme);
    } catch {
      // The selected theme still applies for this session.
    }
  };

  const pendingRefresh = useRef<Promise<void> | null>(null);
  const refresh = useCallback((quiet = false): Promise<void> => {
    if (pendingRefresh.current) return pendingRefresh.current;
    const operation = (async () => {
      if (!quiet) setLoading(true);
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
        setApiError(
          error instanceof Error
            ? error.message
            : "The API could not be reached.",
        );
      } finally {
        setLoading(false);
      }
    })();
    pendingRefresh.current = operation;
    void operation.finally(() => {
      pendingRefresh.current = null;
    });
    return operation;
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
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const transactionSaved = async () => {
    setToast({ message: "Transaction saved to the ledger.", tone: "success" });
    await pendingRefresh.current;
    await refresh(true);
  };

  const createPaymentLink = async (transaction: Transaction) => {
    setPaymentBusyId(transaction.id);
    try {
      const link = await api.createPaymentLink(transaction.id);
      setToast({
        message:
          "Razorpay test link created. Copy it to share with the customer.",
        tone: "success",
      });
      await pendingRefresh.current;
      await refresh(true);
      try {
        await navigator.clipboard.writeText(link.shortUrl);
        setToast({
          message: "Razorpay test link copied to clipboard.",
          tone: "success",
        });
      } catch {
        window.open(link.shortUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Could not create a payment link.",
        tone: "error",
      });
    } finally {
      setPaymentBusyId("");
    }
  };

  const databaseConnected = health?.database === "connected";
  const listProps = {
    transactions,
    paymentEnabled: health?.razorpay === "test_keys_configured",
    onPaymentLink: createPaymentLink,
    busyId: paymentBusyId,
    loading,
    emptyTitle: databaseConnected
      ? "No Transactions Yet"
      : "Connect Your Ledger",
    emptyDetail: databaseConnected
      ? "Record a sale, expense, payment, or transfer to get started."
      : "Your transactions will appear here when connected.",
  };
  return (
    <div className="h-dvh overflow-hidden">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-52 flex-col border-r border-line bg-canvas px-3 py-7 md:flex lg:w-57">
        <div className="flex items-center gap-2.5 px-3 text-[22px] tracking-tight">
          <img
            src="/munim-logo.png"
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-lg"
          />
          munim
        </div>
        <button
          type="button"
          className={`${primaryClass} mt-7 w-full`}
          aria-label="Record Transaction"
          onPointerEnter={() => void loadDialog()}
          onFocus={() => void loadDialog()}
          onClick={() => setDialogOpen(true)}
        >
          <Plus size={16} />
          <span>Record Transaction</span>
        </button>
        <nav className="mt-6 grid gap-1" aria-label="Main Navigation">
          {navigation.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => setView(item.id)}
              className={`group flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors motion-reduce:transition-none ${view === item.id ? "bg-fg/10 text-fg" : "text-muted hover:bg-soft hover:text-fg"}`}
            >
              <span
                className={`grid size-5 shrink-0 place-items-center ${view === item.id ? "text-fg" : "text-muted group-hover:text-fg"}`}
              >
                <item.Icon size={20} strokeWidth={1.6} />
              </span>
              {item.label}
              {item.id === "transactions" && (
                <span
                  className={`ml-auto rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${view === item.id ? "text-fg" : "text-muted"}`}
                >
                  {summary.transactionCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-line pt-3">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-xs text-muted hover:bg-soft hover:text-fg"
            onClick={() => void authClient.signOut()}
          >
            <LogOut size={18} strokeWidth={1.6} /> Sign Out
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            aria-label="Dark Mode"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted hover:bg-soft hover:text-fg"
          >
            <Moon size={20} strokeWidth={1.6} />
            <span>Dark Mode</span>
            <span
              aria-hidden="true"
              className={`ml-auto flex h-4.5 w-8 items-center rounded-full border p-0.5 transition-colors motion-reduce:transition-none ${theme === "dark" ? "border-fg bg-fg" : "border-line bg-canvas"}`}
            >
              <span
                className={`size-3 rounded-full transition-transform motion-reduce:transition-none ${theme === "dark" ? "translate-x-3 bg-canvas" : "bg-fg"}`}
              />
            </span>
          </button>
        </div>
      </aside>
      <main className="flex h-full flex-col overflow-hidden pb-17 md:ml-52 md:pb-0 lg:ml-57">
        <div
          className={`mx-auto flex min-h-0 w-full max-w-360 flex-1 flex-col gap-5 px-5 py-5 lg:px-10 ${view === "overview" ? "overflow-hidden gap-[clamp(10px,2dvh,20px)]" : "overflow-y-auto lg:py-8"}`}
        >
          {apiError && (
            <div
              role="alert"
              className="flex shrink-0 items-start gap-3 rounded-lg border border-line p-3 text-xs"
            >
              <CircleHelp size={16} className="shrink-0 text-status-red" />
              <p>{apiError}</p>
            </div>
          )}
          {!loading && !databaseConnected && !apiError && (
            <div className="flex shrink-0 gap-3 rounded-lg border border-line p-3 text-xs">
              <Landmark size={16} className="shrink-0 text-status-yellow" />
              <p>
                Ledger offline. Connect your database to view and record
                transactions.
              </p>
            </div>
          )}
          <Suspense fallback={<LoadingRows />}>
            {view === "memory" ? (
              <MemoryView configured={health?.meko === "configured"} />
            ) : view === "transactions" ? (
              <TransactionsView {...listProps} />
            ) : (
              <>
                <header className="flex shrink-0 items-center justify-between gap-4">
                  <div>
                    <h1 className={headingClass}>Your Business, at a Glance</h1>
                    <p className="mt-2 hidden text-xs text-muted md:block">
                      A clear view of the money moving through your business.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`${iconButtonClass} md:hidden`}
                    aria-label="Sign Out"
                    onClick={() => void authClient.signOut()}
                  >
                    <LogOut size={17} />
                  </button>
                  <span className="hidden text-[11px] text-muted lg:block">
                    {lastUpdated
                      ? dateFormatter.format(lastUpdated)
                      : "Connecting…"}
                  </span>
                </header>
                <section
                  aria-label="Ledger Summary"
                  className={`${panelClass} grid shrink-0 grid-cols-3 divide-x divide-line overflow-hidden`}
                >
                  {[
                    {
                      label: "Money Received",
                      value: summary.settledInflowPaise,
                      detail: "Settled incoming",
                      Icon: ArrowDownLeft,
                      color: "text-status-green",
                    },
                    {
                      label: "Money Paid",
                      value: summary.settledOutflowPaise,
                      detail: "Settled outgoing",
                      Icon: ArrowUpRight,
                      color: "text-status-red",
                    },
                    {
                      label: "Outstanding",
                      value: summary.openInflowPaise + summary.openOutflowPaise,
                      detail: "Awaiting settlement",
                      Icon: FileClock,
                      color: "text-status-yellow",
                    },
                  ].map((metric) => (
                    <article
                      key={metric.label}
                      className="px-2.5 py-3 md:px-5 md:py-4"
                    >
                      <p className="flex min-h-8 items-start gap-1.5 text-[10px] text-muted md:min-h-0 md:text-xs">
                        <metric.Icon
                          size={14}
                          className={`mt-px shrink-0 ${metric.color}`}
                        />
                        {metric.label}
                      </p>
                      <p className="mt-2 text-[22px] tracking-tight tabular-nums md:mt-3 md:text-[28px]">
                        {loading
                          ? "—"
                          : databaseConnected
                            ? formatRupees(metric.value)
                            : "—"}
                      </p>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted md:mt-2 md:text-[11px]">
                        {metric.detail}
                      </p>
                    </article>
                  ))}
                </section>
                <section
                  className={`${panelClass} flex shrink-0 items-center justify-between gap-3 bg-soft px-4 py-4 md:px-6`}
                >
                  <div>
                    <h2 className="text-[11px] text-muted">Net Cash Flow</h2>
                    <p className="mt-1 text-[28px] tracking-tighter tabular-nums md:text-[32px]">
                      {loading || !databaseConnected
                        ? "—"
                        : formatRupees(
                            summary.settledInflowPaise -
                              summary.settledOutflowPaise,
                          )}
                    </p>
                    <p className="mt-1 hidden text-[11px] text-muted md:block">
                      Received minus paid, across your ledger.
                    </p>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 md:gap-10">
                    {[
                      { label: "To Receive", value: summary.openInflowPaise },
                      { label: "To Pay", value: summary.openOutflowPaise },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-4 md:grid md:gap-2"
                      >
                        <span className="text-[10px] text-muted md:text-xs">
                          {item.label}
                        </span>
                        <p className="text-sm tabular-nums md:text-xl">
                          {loading || !databaseConnected
                            ? "—"
                            : formatRupees(item.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
                <section
                  className={`${panelClass} flex min-h-0 flex-1 flex-col overflow-hidden`}
                >
                  <header className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
                    <h2 className="text-sm">Recent Transactions</h2>
                    <button
                      type="button"
                      className="flex items-center gap-2 text-[11px] text-muted hover:text-fg"
                      onClick={() => setView("transactions")}
                    >
                      View All
                      <ArrowUpRight size={14} />
                    </button>
                  </header>
                  <TransactionList
                    {...listProps}
                    transactions={transactions.slice(0, 6)}
                  />
                </section>
              </>
            )}
          </Suspense>
        </div>
      </main>
      <nav
        aria-label="Mobile Navigation"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-line bg-canvas px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden"
      >
        {navigation.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={view === item.id ? "page" : undefined}
            className={`grid justify-items-center gap-1 py-1.5 text-[10px] ${view === item.id ? "text-fg" : "text-muted"}`}
            onClick={() => setView(item.id)}
          >
            <item.Icon
              size={18}
              strokeWidth={1.5}
              className={view === item.id ? "text-fg" : ""}
            />
            {item.id === "memory" ? "Memory" : item.label}
          </button>
        ))}
        <button
          type="button"
          aria-label="Record Transaction"
          onPointerEnter={() => void loadDialog()}
          onFocus={() => void loadDialog()}
          onClick={() => setDialogOpen(true)}
          className="grid justify-items-center gap-1 py-1.5 text-[10px] text-fg"
        >
          <Plus size={18} strokeWidth={1.5} />
          Record
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
          }
          className="grid justify-items-center gap-1 py-1.5 text-[10px] text-muted"
        >
          {theme === "dark" ? (
            <Sun size={18} strokeWidth={1.5} />
          ) : (
            <Moon size={18} strokeWidth={1.5} />
          )}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
      </nav>
      {dialogOpen && (
        <Suspense
          fallback={
            <div
              role="status"
              className="fixed inset-0 z-20 grid place-items-center bg-canvas/90"
            >
              Opening Transaction Form…
            </div>
          }
        >
          <TransactionDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onSaved={transactionSaved}
          />
        </Suspense>
      )}
      {toast && (
        <div
          role="status"
          className="fixed right-4 bottom-20 z-50 flex max-w-[calc(100vw-32px)] items-center gap-3 rounded-lg border border-line bg-canvas p-3 text-xs md:bottom-5"
        >
          {toast.tone === "success" ? (
            <Check size={16} className="text-status-green" />
          ) : (
            <CircleHelp size={16} className="text-status-red" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            className={iconButtonClass}
            aria-label="Dismiss"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
