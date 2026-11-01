import { localizedError } from "./translations";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "./i18n";
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
  ChartNoAxesCombined,
  FileClock,
  Landmark,
  LayoutDashboard,
  ListOrdered,
  Moon,
  Plus,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import type {
  LedgerSummary,
  Transaction,
  SavedPreferences,
} from "@munim/contracts";
import { authClient } from "./auth-client";
import { api, formatRupees, type ApiHealth } from "./api";
import { TransactionList } from "./TransactionList";
import { OverviewPreviews } from "./OverviewPreviews";
import {
  headingClass,
  iconButtonClass,
  LoadingRows,
  panelClass,
  primaryClass,
} from "./ui";

const loadRecord = () => import("./RecordView");
const RecordView = lazy(loadRecord);
const MemoryView = lazy(() => import("./MemoryView"));
const TransactionsView = lazy(() => import("./TransactionsView"));
const SettingsView = lazy(() => import("./SettingsView"));
const InsightsView = lazy(() => import("./InsightsView"));
const HistoryView = lazy(() => import("./HistoryView"));
type View =
  | "overview"
  | "transactions"
  | "insights"
  | "memory"
  | "record"
  | "settings"
  | "history";
const pagePaths: Record<View, string> = {
  overview: "/overview", record: "/record", transactions: "/transactions",
  insights: "/insights", memory: "/business-memory", settings: "/settings",
  history: "/conversations",
};
const views: View[] = ["overview", "record", "transactions", "insights", "memory", "settings", "history"];
const navigation = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", Icon: ListOrdered },
  { id: "insights", label: "Insights", Icon: ChartNoAxesCombined },
  { id: "memory", label: "Business Memory", Icon: BookOpenText },
] satisfies { id: View; label: string; Icon: typeof LayoutDashboard }[];
const emptySummary: LedgerSummary = {
  settledInflowPaise: 0,
  settledOutflowPaise: 0,
  openInflowPaise: 0,
  openOutflowPaise: 0,
  transactionCount: 0,
};
const dateFormatters = {
  en: new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }),
  hi: new Intl.DateTimeFormat("hi-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }),
};
export default function App({
  preferences,
  onPreferencesChange,
}: {
  preferences: SavedPreferences;
  onPreferencesChange: (preferences: SavedPreferences) => Promise<void>;
}) {
  const { t, language } = useI18n();

  const location = useLocation();
  const navigate = useNavigate();
  const matchedView = views.find((candidate) => pagePaths[candidate] === location.pathname.replace(/\/$/, ""));
  const view = matchedView ?? "overview";
  const setView = useCallback((next: View) => navigate(pagePaths[next]), [navigate]);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [view]);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [summary, setSummary] = useState<LedgerSummary>(emptySummary);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const openRecord = () => {
    setView("record");
  };
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

  const databaseConnected = health?.database === "connected";
  const listProps = {
    transactions,
    loading,
    emptyTitle: databaseConnected
      ? "No Transactions Yet"
      : "Connect Your Ledger",
    emptyDetail: databaseConnected
      ? "Record a sale, expense, payment, or transfer to get started."
      : "Your transactions will appear here when connected.",
  };
  if (!matchedView) return <Navigate to={pagePaths.overview} replace />;
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
        <p className="mt-3 truncate px-3 text-xs text-muted" title={preferences.shopName}>{preferences.shopName}</p>
        <Link
          to={pagePaths.record}
          className={`${primaryClass} mt-7 w-full`}
          aria-label={t("Record Transaction")}
          aria-current={view === "record" ? "page" : undefined}
          onPointerEnter={() => void loadRecord()}
          onFocus={() => void loadRecord()}
        >
          <Plus size={16} />
          <span>{t("Record Transaction")}</span>
        </Link>
        <nav className="mt-6 grid gap-1" aria-label={t("Main Navigation")}>
          {navigation.map((item) => (
            <Link
              to={pagePaths[item.id]}
              key={item.id}
              aria-current={view === item.id ? "page" : undefined}
              className={`group flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors motion-reduce:transition-none ${view === item.id ? "bg-fg/10 text-fg" : "text-muted hover:bg-soft hover:text-fg"}`}
            >
              <span
                className={`grid size-5 shrink-0 place-items-center ${view === item.id ? "text-fg" : "text-muted group-hover:text-fg"}`}
              >
                <item.Icon size={20} strokeWidth={1.6} />
              </span>
              {t(item.label)}
              {item.id === "transactions" && (
                <span
                  className={`ml-auto rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${view === item.id ? "text-fg" : "text-muted"}`}
                >
                  {summary.transactionCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-line pt-3">
          <Link
            to={pagePaths.settings}
            aria-current={view === "settings" ? "page" : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm ${view === "settings" ? "bg-soft text-fg" : "text-muted hover:bg-soft hover:text-fg"}`}
          >
            <Settings size={20} strokeWidth={1.6} />
            {t("Settings")}
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-xs text-muted hover:bg-soft hover:text-fg"
            onClick={() => void authClient.signOut()}
          >
            <LogOut size={18} strokeWidth={1.6} /> {t("Sign Out")}
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={theme === "dark"}
            aria-label={t("Dark Mode")}
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted hover:bg-soft hover:text-fg"
          >
            <Moon size={20} strokeWidth={1.6} />
            <span>{t("Dark Mode")}</span>
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
          ref={contentRef}
          className={`mx-auto flex min-h-0 w-full max-w-360 flex-1 flex-col gap-5 px-5 py-5 lg:px-10 ${view === "overview" ? "overflow-hidden gap-[clamp(10px,2dvh,20px)]" : "overflow-y-auto lg:py-8"}`}
        >
          {apiError && (
            <div
              role="alert"
              className="flex shrink-0 items-start gap-3 rounded-lg border border-line p-3 text-xs"
            >
              <CircleHelp size={16} className="shrink-0 text-status-red" />
              <p>{localizedError(apiError)}</p>
            </div>
          )}
          {!loading && !databaseConnected && !apiError && (
            <div className="flex shrink-0 gap-3 rounded-lg border border-line p-3 text-xs">
              <Landmark size={16} className="shrink-0 text-status-yellow" />
              <p>
                {t(
                  "Ledger offline. Connect your database to view and record transactions.",
                )}
              </p>
            </div>
          )}
          <Suspense fallback={<LoadingRows />}>
            {view === "history" ? <HistoryView /> : view === "memory" ? (
              <MemoryView configured={health?.meko === "configured"} />
            ) : view === "transactions" ? (
              <TransactionsView {...listProps} />
            ) : view === "insights" ? (
              <InsightsView
                version={lastUpdated?.getTime() ?? 0}
                onRecord={openRecord}
              />
            ) : view === "settings" ? (
              <SettingsView
                preferences={preferences}
                onSave={onPreferencesChange}
                darkMode={theme === "dark"}
                onToggleTheme={toggleTheme}
              />
            ) : view === "overview" ? (
              <>
                <header className="flex shrink-0 items-center justify-between gap-4">
                  <div>
                    <h1 className={headingClass}>
                      {t("{shop}, at a Glance", {shop: preferences.shopName})}
                    </h1>
                    <p className="mt-2 hidden text-xs text-muted md:block">
                      {t(
                        "A clear view of the money moving through your business.",
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`${iconButtonClass} md:hidden`}
                    aria-label={t("Sign Out")}
                    onClick={() => void authClient.signOut()}
                  >
                    <LogOut size={17} />
                  </button>
                  <span className="hidden text-[11px] text-muted lg:block">
                    {lastUpdated
                      ? dateFormatters[language].format(lastUpdated)
                      : t("Connecting…")}
                  </span>
                </header>
                <section
                  aria-label={t("Ledger Summary")}
                  className={`${panelClass} grid shrink-0 grid-cols-3 divide-x divide-line overflow-hidden`}
                >
                  {[
                    {
                      label: t("Money Received"),
                      value: summary.settledInflowPaise,
                      detail: t("Settled incoming"),
                      Icon: ArrowDownLeft,
                      color: "text-status-green",
                    },
                    {
                      label: t("Money Paid"),
                      value: summary.settledOutflowPaise,
                      detail: t("Settled outgoing"),
                      Icon: ArrowUpRight,
                      color: "text-status-red",
                    },
                    {
                      label: t("Outstanding"),
                      value: summary.openInflowPaise + summary.openOutflowPaise,
                      detail: t("Awaiting settlement"),
                      Icon: FileClock,
                      color: "text-status-yellow",
                    },
                  ].map((metric) => (
                    <article
                      key={t(metric.label)}
                      className="px-2.5 py-3 md:px-5 md:py-4"
                    >
                      <p className="flex min-h-8 items-start gap-1.5 text-[10px] text-muted md:min-h-0 md:text-xs">
                        <metric.Icon
                          size={14}
                          className={`mt-px shrink-0 ${metric.color}`}
                        />
                        {t(metric.label)}
                      </p>
                      <p className="mt-2 text-[22px] tracking-tight tabular-nums md:mt-3 md:text-[28px]">
                        {loading
                          ? "—"
                          : databaseConnected
                            ? formatRupees(metric.value)
                            : "—"}
                      </p>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted md:mt-2 md:text-[11px]">
                        {t(metric.detail)}
                      </p>
                    </article>
                  ))}
                </section>
                <section
                  className={`${panelClass} flex shrink-0 items-center justify-between gap-3 bg-soft px-4 py-4 md:px-6`}
                >
                  <div>
                    <h2 className="text-[11px] text-muted">
                      {t("Net Cash Flow")}
                    </h2>
                    <p className="mt-1 text-[28px] tracking-tighter tabular-nums md:text-[32px]">
                      {loading || !databaseConnected
                        ? "—"
                        : formatRupees(
                            summary.settledInflowPaise -
                              summary.settledOutflowPaise,
                          )}
                    </p>
                    <p className="mt-1 hidden text-[11px] text-muted md:block">
                      {t("Received minus paid, across your ledger.")}
                    </p>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 md:gap-10">
                    {[
                      {
                        label: t("To Receive"),
                        value: summary.openInflowPaise,
                      },
                      { label: t("To Pay"), value: summary.openOutflowPaise },
                    ].map((item) => (
                      <div
                        key={t(item.label)}
                        className="flex items-center justify-between gap-4 md:grid md:gap-2"
                      >
                        <span className="text-[10px] text-muted md:text-xs">
                          {t(item.label)}
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
                <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(220px,0.85fr)] lg:grid-rows-1">
                  <section
                    className={`${panelClass} flex min-h-0 flex-col overflow-hidden`}
                  >
                    <header className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
                      <h2 className="text-sm">{t("Recent Transactions")}</h2>
                      <Link
                        to={pagePaths.transactions}
                        className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-[11px] text-muted hover:text-fg"
                      >
                        {t("View All")}
                        <ArrowUpRight size={14} />
                      </Link>
                    </header>
                    <TransactionList
                      {...listProps}
                      transactions={transactions.slice(0, 6)}
                    />
                  </section>
                  <OverviewPreviews
                    memoryConfigured={health?.meko === "configured"}
                    ledgerChecked={health !== null || Boolean(apiError)}
                    ledgerConnected={databaseConnected}
                  />
                </div>
              </>
            ) : null}
          </Suspense>
          {view === "record" && (
            <div className="min-h-0 flex-1">
              <Suspense fallback={<LoadingRows />}>
                <RecordView
                  preferences={preferences}
                  visible={view === "record"}
                  onSaved={transactionSaved}
                />
              </Suspense>
            </div>
          )}
        </div>
      </main>
      <nav
        aria-label={t("Mobile Navigation")}
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-6 border-t border-line bg-canvas px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden"
      >
        {navigation.map((item) => (
          <Link
            key={item.id}
            to={pagePaths[item.id]}
            aria-current={view === item.id ? "page" : undefined}
            className={`grid justify-items-center gap-1 py-1.5 text-[10px] ${view === item.id ? "text-fg" : "text-muted"}`}
          >
            <item.Icon
              size={18}
              strokeWidth={1.5}
              className={view === item.id ? "text-fg" : ""}
            />
            {item.id === "memory"
              ? t("Memory")
              : item.id === "transactions"
                ? t("Ledger")
                : t(item.label)}
          </Link>
        ))}
        <Link
          to={pagePaths.record}
          aria-label={t("Record Transaction")}
          aria-current={view === "record" ? "page" : undefined}
          onPointerEnter={() => void loadRecord()}
          onFocus={() => void loadRecord()}
          className="grid justify-items-center gap-1 py-1.5 text-[10px] text-fg"
        >
          <Plus size={18} strokeWidth={1.5} />
          {t("Record")}
        </Link>
        <Link
          to={pagePaths.settings}
          aria-label={t("Settings")}
          aria-current={view === "settings" ? "page" : undefined}
          className={`grid justify-items-center gap-1 py-1.5 text-[10px] ${view === "settings" ? "text-fg" : "text-muted"}`}
        >
          <Settings size={18} strokeWidth={1.5} />
          {t("Settings")}
        </Link>
      </nav>
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
          <span>{t(toast.message)}</span>
          <button
            type="button"
            className={iconButtonClass}
            aria-label={t("Dismiss")}
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
