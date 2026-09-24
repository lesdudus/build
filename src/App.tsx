import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleHelp,
  Cloud,
  CloudOff,
  Download,
  History,
  ListChecks,
  LoaderCircle,
  LogOut,
  Mail,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  SkipForward,
  Square,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BASES,
  blankSet,
  comparableHistory,
  comparisonKey,
  createSession,
  doneSets,
  finishSession,
  held,
  nextDay,
  number,
  sessionSummary,
  setError,
  suggest,
  trendRows,
  workingSets,
  type ExerciseRecord,
  type Program,
  type Session,
  type SetRecord,
} from "./domain";
import { Store, type LocalRecord } from "./store";
import { loadProgram, remote, supabase } from "./cloud";
import { mark, program as publicProgram } from "./program";
import { IntervalTimer } from "./IntervalTimer";
import { validLayout, type LayoutId } from "./experience";
import {
  LayoutPicker,
  Milestones,
  SessionPulse,
  TrainingStage,
  VideoReference,
} from "./Experience.tsx";

const store = new Store();
const date = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
const localDate = (value: string) => {
  const stamp = new Date(value);
  return `${stamp.getFullYear()}-${String(stamp.getMonth() + 1).padStart(2, "0")}-${String(stamp.getDate()).padStart(2, "0")}`;
};
const describe = (session: Session) =>
  `${date(session.startedAt)} · Day ${session.day.slice(-1)}`;
const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
const syncLabels = {
  local: "Saved on this device",
  pending: "Saved locally · queued",
  synced: "Synced",
  failed: "Saved locally · sync failed",
  conflict: "Conflict · review needed",
};
function download(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
function IconButton({
  title,
  children,
  onClick,
  disabled = false,
}: {
  title: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="icon-button"
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
function Numeric({
  label,
  value,
  onChange,
  integer = false,
  max,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  integer?: boolean;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min="0"
        max={max}
        step={integer ? "1" : "any"}
        value={value}
        placeholder="—"
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function Login({
  enterLocal,
  onMessage,
}: {
  enterLocal: () => void;
  onMessage: (value: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
    } catch (error) {
      onMessage(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-layout">
      <div>
        <p className="eyebrow">Your training journal</p>
        <h1>
          One session
          <br />
          at a time.
        </h1>
        <p className="lede">
          Day 1, Day 2, Day 3.
          <br />A little more deliberate each time.
        </p>
        <div className="auth-stats">
          <span>
            <b>3</b>core days
          </span>
          <span>
            <b>1</b>optional day
          </span>
          <span>
            <b>0</b>catch-up debt
          </span>
        </div>
        <div className="safety-line">
          <ShieldCheck size={20} />
          <p>Shoulder restrictions stay in place. No automatic clearance.</p>
        </div>
      </div>
      <form onSubmit={submit} className="auth-form">
        <h2>Welcome back</h2>
        {supabase ? (
          <>
            <label className="field">
              Email
              <input
                autoComplete="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
              <label className="field">
                Password
                <input
                  autoComplete="current-password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            <button className="primary" disabled={busy}>
              {busy ? <LoaderCircle className="spin" /> : <Mail />}
              Sign in
            </button>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  if (!supabase) return;
                  if (!email) { onMessage('Enter your account email first.'); return; }
                  setBusy(true);
                  try {
                    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + '?setup=password' });
                    if (error) throw error;
                    onMessage('Password email requested. Check your inbox and spam folder.');
                  } catch (error) { onMessage(message(error)); }
                  finally { setBusy(false); }
                }}
              >
                Set or reset password
              </button>
          </>
        ) : (
          <div className="notice">
            <b>Cloud setup pending</b>
            <p>
              Cloud credentials are not configured for this build. The local
              journal is available on this device.
            </p>
          </div>
        )}
        <div className="auth-local">
          <button type="button" className="secondary" onClick={enterLocal}>
            <Play size={18} />
            Open local journal
          </button>
          <p className="small">
            Local records stay in this browser profile. They are not uploaded or
            automatically transferred to a signed-in account. Use a private
            device and export a backup before clearing browser data.
          </p>
        </div>
      </form>
    </section>
  );
}

function PasswordSetup({ onDone, onMessage }: { onDone: () => void; onMessage: (value: string) => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  return <form className="auth-form" onSubmit={async event => {
    event.preventDefault();
    if (!supabase || busy) return;
    if (password !== confirmation) { onMessage('Passwords must match.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword(''); setConfirmation('');
      history.replaceState(null, '', location.pathname);
      onMessage('Password saved.'); onDone();
    } catch (error) { onMessage(message(error)); }
    finally { setBusy(false); }
  }}>
    <h2>Set your password</h2>
    <label className="field">New password<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={event => setPassword(event.target.value)} /></label>
    <label className="field">Confirm password<input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
    <button className="primary" disabled={busy}><ShieldCheck />Save password</button>
  </form>;
}

export function App() {
  const [passwordSetup, setPasswordSetup] = useState(new URLSearchParams(location.search).get('setup') === 'password');
  const [assignment, setAssignment] = useState<{ owner: string; definition: Program } | null>(null);
  const [programError, setProgramError] = useState('');
  const [layout, setLayout] = useState<LayoutId>(() => {
    try {
      return validLayout(localStorage.getItem("build-layout"));
    } catch {
      return "guided";
    }
  });
  function changeLayout(value: LayoutId) {
    setLayout(value);
    try {
      localStorage.setItem("build-layout", value);
    } catch {
      setToast(
        "Layout changed for this visit; preference storage is unavailable.",
      );
    }
  }
  const [identity, setIdentity] = useState<{
    id: string;
    email: string;
    local: boolean;
  } | null>(null);
  const readyProgram = identity?.local || assignment?.owner === identity?.id;
  const program = identity && !identity.local && assignment?.owner === identity.id ? assignment.definition : publicProgram;
  const [checking, setChecking] = useState(true);
  const [allRecords, setRecords] = useState<LocalRecord[]>([]);
  const records = allRecords.filter((record) => record.owner === identity?.id);
  const [selection, setSelected] = useState<LocalRecord | null>(null);
  const selected = selection?.owner === identity?.id ? selection : null;
  const selectedRef = useRef<LocalRecord | null>(null);
  const generations = useRef(new Map<string, number>());
  const queue = useRef(Promise.resolve());
  const savingCount = useRef(0);
  const failedSave = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const syncBusy = useRef(false);
  const [view, setView] = useState("train");
  const [selectedDay, setSelectedDay] = useState("day-1");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [review, setReview] = useState(false);
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const [now, setNow] = useState(Date.now());
  const [shellReady, setShellReady] = useState(false);
  const currentOwner = useRef<string | null>(null);
  currentOwner.current = identity?.id || null;
  const sessions = records.map((record) => record.session);
  const active = records.filter((record) => record.session.status === "active");
  const last = sessions
    .filter((session) => session.status === "completed")
    .sort((left, right) =>
      (right.finishedAt || "").localeCompare(left.finishedAt || ""),
    )[0];
  const pending = records.filter((record) =>
    ["pending", "failed", "conflict"].includes(record.state),
  );

  function choose(record: LocalRecord | null, discard = false) {
    if (savingCount.current) {
      setToast("Finishing the local save. Try again in a moment.");
      return;
    }
    if (failedSave.current && !discard) {
      setToast(
        "Export the unsaved draft or explicitly reload its saved version first.",
      );
      return;
    }
    selectedRef.current = record;
    if (record) generations.current.set(record.key, record.generation);
    setSelected(record);
    setExerciseIndex(0);
    setSaveError("");
    failedSave.current = false;
    setReview(false);
  }
  async function refresh(owner = identity?.id) {
    if (!owner) return;
    const rows = await store.list(owner);
    if (currentOwner.current === owner) setRecords(rows);
    return rows;
  }
  async function sync(loaded = assignment) {
    if (
      !identity ||
      identity.local ||
      !loaded || loaded.owner !== identity.id ||
      !supabase ||
      !navigator.onLine ||
      syncBusy.current
    )
      return;
    const owner = identity.id;
    syncBusy.current = true;
    setSyncing(true);
    try {
      await queue.current;
      const execute = () => store.synchronize(owner, remote, loaded.definition);
      if (navigator.locks)
        await navigator.locks.request(`build-sync-${owner}`, execute);
      else await execute();
      const rows = await refresh(owner);
      if (
        currentOwner.current === owner &&
        !savingCount.current &&
        selectedRef.current
      ) {
        const fresh = rows?.find(
          (record) => record.key === selectedRef.current?.key,
        );
        if (
          fresh &&
          fresh.generation === generations.current.get(fresh.key) &&
          !failedSave.current
        ) {
          selectedRef.current = fresh;
          setSelected(fresh);
        } else if (fresh && !failedSave.current) {
          failedSave.current = true;
          setSaveError(
            "This workout has newer cloud data. Export your view or reload the latest saved version.",
          );
        }
      }
    } catch (error) {
      if (currentOwner.current === owner)
        setToast(
          `Sync unavailable: ${message(error)}. Local records are retained.`,
        );
    } finally {
      syncBusy.current = false;
      setSyncing(false);
    }
  }
  useEffect(() => {
    let alive = true;
    const localId = localStorage.getItem("build-local-owner");
    if (localStorage.getItem("build-mode") === "local" && localId) {
      setIdentity({ id: localId, email: "Local journal", local: true });
      setChecking(false);
    } else if (supabase) {
      if (!navigator.onLine) {
        const cached = localStorage.getItem("build-last-identity");
        if (cached) {
          try {
            setIdentity(JSON.parse(cached));
          } catch {
            localStorage.removeItem("build-last-identity");
          }
        }
        setChecking(false);
      } else
        supabase.auth
          .getSession()
          .then(({ data, error }) => {
            if (!alive) return;
            if (error) setToast(error.message);
            if (data.session)
              setIdentity({
                id: data.session.user.id,
                email: data.session.user.email || "Account",
                local: false,
              });
            setChecking(false);
          })
          .catch((error) => {
            if (alive) {
              setToast(message(error));
              setChecking(false);
            }
          });
    } else setChecking(false);
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (!alive || localStorage.getItem("build-mode") === "local") return;
      if (_event === 'PASSWORD_RECOVERY') setPasswordSetup(true);
      if (session) {
        const owner = {
          id: session.user.id,
          email: session.user.email || "Account",
          local: false,
        };
        setIdentity(owner);
        localStorage.setItem("build-last-identity", JSON.stringify(owner));
      } else if (navigator.onLine) {
        setIdentity(null);
        localStorage.removeItem("build-last-identity");
      }
    });
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => {
        if (alive) setShellReady(true);
      });
    }
    return () => {
      alive = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let alive = true;
    setRecords([]);
    setAssignment(null);
    setProgramError('');
    setView("train");
    choose(null);
    if (identity)
      Promise.all([store.list(identity.id), identity.local ? Promise.resolve(publicProgram) : loadProgram(identity.id)])
        .then(([rows, definition]) => {
          if (!alive) return;
          const loaded = { owner: identity.id, definition };
          setAssignment(loaded);
          setRecords(rows);
          setSelectedDay(nextDay(rows.map((record) => record.session)));
          const unfinished = rows.find(
            (record) => record.session.status === "active",
          );
          if (unfinished) choose(unfinished);
          void sync(loaded);
        })
        .catch((error) => { if (alive) setProgramError(message(error)); });
    return () => {
      alive = false;
    };
  }, [identity?.id]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const connected = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void sync();
    };
    const visible = () => {
      setNow(Date.now());
      if (document.visibilityState === "visible") void sync();
    };
    const shellError = () => {
      setShellReady(false);
      setToast(
        "Offline page caching failed. Keep this tab open; local workout data is still saved.",
      );
    };
    const interval = setInterval(() => void sync(), 12000);
    window.addEventListener("online", connected);
    window.addEventListener("offline", connected);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("offline-shell-error", shellError);
    return () => {
      clearInterval(timer);
      clearInterval(interval);
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", connected);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("offline-shell-error", shellError);
    };
  }, [identity?.id, saveError, assignment]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (savingCount.current || saveError) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [saveError]);
  useEffect(() => {
    if (review && reviewDialog.current && !reviewDialog.current.open)
      reviewDialog.current.showModal();
  }, [review]);

  function update(change: (session: Session) => void) {
    const record = selectedRef.current;
    if (
      !record ||
      !identity ||
      record.owner !== identity.id ||
      failedSave.current
    )
      return;
    if (record.state === "conflict") {
      setToast("Resolve this conflict before editing.");
      return;
    }
    const next = structuredClone(record.session);
    change(next);
    const snapshot = { ...record, session: next };
    selectedRef.current = snapshot;
    setSelected(snapshot);
    savingCount.current++;
    setSaving(true);
    const owner = identity.id;
    const cloud = !identity.local;
    queue.current = queue.current.then(async () => {
      try {
        if (failedSave.current) return;
        const saved = await store.save(
          next,
          generations.current.get(record.key) ?? record.generation,
          cloud,
        );
        generations.current.set(record.key, saved.generation);
        if (currentOwner.current === owner) {
          setRecords((rows) => [
            saved,
            ...rows.filter((row) => row.key !== saved.key),
          ]);
          const latest = selectedRef.current;
          if (latest?.key === saved.key) {
            const merged = { ...saved, session: latest.session };
            selectedRef.current = merged;
            setSelected(merged);
          }
        }
      } catch (error) {
        failedSave.current = true;
        setSaveError(message(error));
      } finally {
        savingCount.current--;
        setSaving(savingCount.current > 0);
      }
    });
  }
  async function start() {
    if (!identity || !readyProgram || savingCount.current) return;
    try {
      await queue.current;
      const day = program.days.find((day) => day.id === selectedDay)!;
      const record = await store.save(
        createSession(day, program, identity.id, sessions),
        null,
        !identity.local,
      );
      await refresh();
      choose(record);
      setView("train");
      void navigator.storage?.persist?.();
      void sync();
    } catch (error) {
      setToast(message(error));
      await refresh();
    }
  }
  function enterLocal() {
    const id =
      localStorage.getItem("build-local-owner") ||
      `local:${crypto.randomUUID()}`;
    localStorage.setItem("build-local-owner", id);
    localStorage.setItem("build-mode", "local");
    setView("train");
    setIdentity({ id, email: "Local journal", local: true });
  }
  async function logout() {
    await queue.current;
    if (failedSave.current) {
      setToast("Export unsaved data before leaving this journal.");
      return;
    }
    if (
      pending.length &&
      !confirm(
        "Unsynced records will remain on this device, isolated to this account. Sign out?",
      )
    )
      return;
    if (identity && !identity.local && supabase) {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        setToast(error.message);
        return;
      }
    }
    localStorage.removeItem("build-mode");
    localStorage.removeItem("build-last-identity");
    setIdentity(null);
    setPasswordSetup(false);
    setRecords([]);
    choose(null);
  }
  async function resolve(record: LocalRecord, choice: "cloud" | "local") {
    if (!identity) return;
    if (
      !confirm(
        choice === "local"
          ? "Replace the cloud version with this local version? The server keeps revision history. Export both versions first if unsure."
          : "Use the cloud version? Export this local version first if you want to keep a separate copy.",
      )
    )
      return;
    try {
      await store.resolve(identity.id, record.session.id, choice);
      const rows = await refresh();
      choose(rows?.find((row) => row.key === record.key) || null);
      void sync();
    } catch (error) {
      setToast(message(error));
    }
  }
  const currentSession = selected?.session;
  const remaining = currentSession?.restUntil
    ? Math.max(0, Math.ceil((currentSession.restUntil - now) / 1000))
    : 0;
  const status = saving
    ? "Saving on device…"
    : saveError
      ? "Not saved · action needed"
      : syncing
        ? "Syncing…"
        : selected
          ? syncLabels[selected.state]
          : identity?.local
            ? "Local-only journal"
            : pending.length
              ? `${pending.length} queued / unresolved`
              : "Cloud connected";
  return (
    <div className="app" data-layout={layout}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setView("train");
          }}
        >
          <img src={mark} alt="" />
          <span>
            BUILD<small>TRAINING JOURNAL</small>
          </span>
        </a>
        <div className="header-status" role="status">
          {online ? <Cloud size={16} /> : <CloudOff size={16} />}
          <span>{identity ? status : "Your next session starts here"}</span>
        </div>
        {identity && (
          <IconButton
            title="Account and data"
            onClick={() => setView("account")}
          >
            <ShieldCheck />
          </IconButton>
        )}
        <LayoutPicker value={layout} onChange={changeLayout} />
      </header>
      {identity && (
        <nav className="main-nav" aria-label="Main navigation">
          {[
            ["train", "Train", ListChecks],
            ["timer", "Timer", Timer],
            ["history", "History", History],
            ["progress", "Progress", BarChart3],
            ["guide", "Coach notes", CircleHelp],
          ].map(([id, label, Icon]) => {
            const Symbol = Icon as typeof Activity;
            return (
              <button
                key={id as string}
                onClick={() => setView(id as string)}
                aria-current={view === id ? "page" : undefined}
              >
                <Symbol size={20} />
                <span>{label as string}</span>
              </button>
            );
          })}
        </nav>
      )}
      <main id="main">
        {toast && (
          <div role="status" className="toast">
            <span>{toast}</span>
            <IconButton title="Dismiss message" onClick={() => setToast("")}>
              <X size={18} />
            </IconButton>
          </div>
        )}
        {saveError && (
          <div className="notice danger" role="alert">
            <b>Not saved: {saveError}</b>
            <div className="button-row">
              <button
                onClick={() =>
                  download(selectedRef.current, "build-unsaved-draft.json")
                }
              >
                <Download />
                Export unsaved draft
              </button>
              <button
                onClick={async () => {
                  await queue.current;
                  const rows = await refresh();
                  choose(
                    rows?.find((row) => row.key === selectedRef.current?.key) ||
                      null,
                    true,
                  );
                }}
              >
                Reload saved version
              </button>
            </div>
          </div>
        )}
        {checking ? (
          <p className="loading">
            <LoaderCircle className="spin" />
            Opening your journal…
          </p>
        ) : !identity ? (
          <Login enterLocal={enterLocal} onMessage={setToast} />
        ) : passwordSetup && !identity.local ? (
          <PasswordSetup onDone={() => setPasswordSetup(false)} onMessage={setToast} />
        ) : !readyProgram ? (
          <section className="auth-form">
            <h2>{programError ? 'Program unavailable' : 'Loading your program...'}</h2>
            {programError && <p role="alert">{programError}</p>}
            <div className="button-row">
              <button onClick={() => location.reload()}><RefreshCw />Try again</button>
              <button onClick={() => void logout()}><LogOut />Sign out</button>
            </div>
          </section>
        ) : (
          <>
            <IntervalTimer visible={view === "timer"} />
            {view === "train" && (
              <>
                {!currentSession ? (
                  <>
                    <Milestones sessions={sessions} />
                    <div className="page-heading">
                      <div>
                        <p className="eyebrow">
                          Next up /{" "}
                          {identity.local ? "Local journal" : "Your program"}
                        </p>
                        <h1>Make room for strength.</h1>
                        <p className="muted">
                          {last
                            ? `${describe(last)} was your last completed session. ${Math.floor((now - Date.parse(last.finishedAt!)) / 3600000)} hours ago.`
                            : "A fresh journal. Your first rotation starts with two sets per exercise."}
                        </p>
                      </div>
                      <span className="rotation-label">01 / 02 / 03</span>
                    </div>
                    {active.length > 0 ? (
                      <section className="resume">
                        <h2>Pick up where you left off</h2>
                        {active.map((record) => (
                          <button
                            key={record.key}
                            className="primary"
                            onClick={() => choose(record)}
                          >
                            <Play />
                            Resume {describe(record.session)}
                          </button>
                        ))}
                      </section>
                    ) : (
                      <>
                        <div
                          className="day-chooser"
                          role="group"
                          aria-label="Choose workout day"
                        >
                          {program.days.map((day) => (
                            <button
                              key={day.id}
                              aria-pressed={selectedDay === day.id}
                              onClick={() => setSelectedDay(day.id)}
                            >
                              <span>{day.name}</span>
                              <small>
                                {day.id === nextDay(sessions)
                                  ? "Suggested next"
                                  : day.id === "day-4"
                                    ? "Optional cardio"
                                    : "Core session"}
                              </small>
                            </button>
                          ))}
                        </div>
                        <div className="preview-layout">
                          <section>
                            <p className="eyebrow">
                              {
                                program.days.find(
                                  (day) => day.id === selectedDay,
                                )!.minutes
                              }
                            </p>
                            <h2>
                              {
                                program.days.find(
                                  (day) => day.id === selectedDay,
                                )!.title
                              }
                            </h2>
                            <ol className="preview-list">
                              {program.days
                                .find((day) => day.id === selectedDay)!
                                .exercises.map((exercise) => (
                                  <li key={exercise.name}>
                                    <span>{exercise.name}</span>
                                    <b>
                                      {exercise.status === "Hold for assessment"
                                        ? "HELD"
                                        : `${exercise.sets ? exercise.sets + " × " : ""}${exercise.reps}`}
                                    </b>
                                  </li>
                                ))}
                            </ol>
                            <button
                              className="primary start"
                              onClick={start}
                              disabled={!!saveError}
                            >
                              <Play />
                              Start{" "}
                              {
                                program.days.find(
                                  (day) => day.id === selectedDay,
                                )!.name
                              }
                              <ArrowRight />
                            </button>
                          </section>
                          <aside className="orientation">
                            <h3>Room to recover</h3>
                            <p>
                              Day 1 → rest → Day 2 → rest → Day 3. Aim for about
                              48 hours between core sessions. Keep your place if
                              life changes the schedule.
                            </p>
                            {last &&
                              now - Date.parse(last.finishedAt!) <
                                48 * 3600000 && (
                                <p className="accent">
                                  Your last session was less than 48 hours ago.
                                  Consider rest or easy optional cardio.
                                </p>
                              )}
                            <div className="safety-line">
                              <ShieldCheck />
                              <p>
                                Shoulder assessment pending. No painful reps.
                                Held pressing and overhead work stay excluded.
                              </p>
                            </div>
                            <p className="small">
                              {shellReady
                                ? "Offline page is ready on this device."
                                : "Offline page cache is not ready yet."}
                            </p>
                          </aside>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="session-heading">
                      <button
                        className="text-button"
                        onClick={() => {
                          choose(null);
                          setSelectedDay(nextDay(sessions));
                        }}
                      >
                        <ArrowLeft size={18} />
                        Sessions
                      </button>
                      <span className="eyebrow">
                        {currentSession.status === "completed"
                          ? "Completed / editing actuals"
                          : currentSession.introductory
                            ? "Introductory rotation / 2-set cap"
                            : "Core rotation"}
                      </span>
                    </div>
                    <div className="page-heading compact">
                      <div>
                        <h1>
                          Day {currentSession.day.slice(-1)}{" "}
                          <span className="muted">
                            / {currentSession.title}
                          </span>
                        </h1>
                        <p className="muted">
                          {date(currentSession.startedAt)} ·{" "}
                          {sessionSummary(currentSession).working} working sets
                          completed
                        </p>
                      </div>
                      <button
                        className="primary"
                        onClick={() => setReview(true)}
                        disabled={saving || !!saveError}
                      >
                        {currentSession.status === "completed" ? (
                          <Check />
                        ) : (
                          <ListChecks />
                        )}
                        {currentSession.status === "completed"
                          ? "Review results"
                          : "Finish & review"}
                      </button>
                    </div>
                    {selected.state === "conflict" && (
                      <div className="notice danger">
                        <b>Two versions need your decision</b>
                        <p>
                          Local: {sessionSummary(currentSession).done} done
                          sets. Cloud:{" "}
                          {selected.remote
                            ? sessionSummary(selected.remote.payload).done
                            : 0}{" "}
                          done sets. Neither has been silently overwritten.
                        </p>
                        <div className="button-row">
                          <button
                            onClick={() =>
                              download(selected, "build-conflict-versions.json")
                            }
                          >
                            <Download />
                            Export both
                          </button>
                          <button onClick={() => resolve(selected, "cloud")}>
                            Use cloud version
                          </button>
                          <button onClick={() => resolve(selected, "local")}>
                            Keep local version
                          </button>
                        </div>
                      </div>
                    )}
                    <details className="session-notes">
                      <summary>Warm-up, shoulder check & session notes</summary>
                      <p>{program.warmup}</p>
                      <div className="form-grid">
                        <Numeric
                          label="Shoulder before (0-10)"
                          max={10}
                          value={currentSession.painBefore}
                          onChange={(value) =>
                            update((session) => {
                              session.painBefore = value;
                            })
                          }
                        />
                        <label className="field">
                          Session notes / session RPE
                          <textarea
                            value={currentSession.notes}
                            onChange={(event) =>
                              update((session) => {
                                session.notes = event.target.value;
                              })
                            }
                          />
                        </label>
                      </div>
                      <p className="small">
                        Pain is a stop signal. RIR is extra clean reps
                        remaining, not painful reps.
                      </p>
                    </details>
                    <SessionPulse session={currentSession} />
                    <TrainingStage
                      layout={layout}
                      session={currentSession}
                      sessions={sessions}
                      index={exerciseIndex}
                      onSelect={setExerciseIndex}
                    >
                      <ExerciseEditor
                        key={currentSession.exercises[exerciseIndex].id}
                        exercise={currentSession.exercises[exerciseIndex]}
                        session={currentSession}
                        sessions={sessions}
                        disabled={!!saveError || selected.state === "conflict"}
                        update={(change) =>
                          update((session) =>
                            change(session.exercises[exerciseIndex], session),
                          )
                        }
                        onMessage={setToast}
                        layout={layout}
                        online={online}
                      />
                    </TrainingStage>
                    <div className="exercise-step">
                      <IconButton
                        title="Previous exercise"
                        disabled={exerciseIndex === 0}
                        onClick={() => setExerciseIndex((index) => index - 1)}
                      >
                        <ArrowLeft />
                      </IconButton>
                      <span>
                        {exerciseIndex + 1} / {currentSession.exercises.length}
                      </span>
                      <IconButton
                        title="Next exercise"
                        disabled={
                          exerciseIndex === currentSession.exercises.length - 1
                        }
                        onClick={() => setExerciseIndex((index) => index + 1)}
                      >
                        <ArrowRight />
                      </IconButton>
                    </div>
                    {currentSession.restUntil && (
                      <div
                        className="rest-timer"
                        role="timer"
                        aria-label="Rest timer"
                      >
                        <Timer size={19} />
                        <strong>
                          {remaining
                            ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                            : "Rest complete"}
                        </strong>
                        <button
                          onClick={() =>
                            update((session) => {
                              session.restUntil =
                                Math.max(Date.now(), session.restUntil || 0) +
                                30000;
                            })
                          }
                        >
                          +30s
                        </button>
                        <IconButton
                          title="Dismiss rest timer"
                          onClick={() =>
                            update((session) => {
                              session.restUntil = null;
                            })
                          }
                        >
                          <X size={18} />
                        </IconButton>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {view === "history" && (
              <HistoryView
                records={records}
                open={(record) => {
                  choose(record);
                  setView("train");
                }}
              />
            )}
            {view === "progress" && <Progress sessions={sessions} />}
            {view === "guide" && (
              <section className="guide">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">Foundation 01</p>
                    <h1>Your coaching notes</h1>
                    <p className="muted">
                      The original program, including its temporary shoulder
                      restrictions.
                    </p>
                  </div>
                </div>
                {program.rules.map((rule) => (
                  <details key={rule.title}>
                    <summary>{rule.title}</summary>
                    <p>
                      {rule.text
                        .replace("The Excel log uses", "The training log uses")
                        .replace("program tab", "program prescription")}
                    </p>
                  </details>
                ))}
                <h2>Sources</h2>
                <ul>
                  {program.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.title}
                      </a>
                      <p>{source.note}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {view === "account" && (
              <section className="account">
                <p className="eyebrow">Account & data</p>
                <h1>{identity.email}</h1>
                <p className="lede">
                  {identity.local
                    ? "This is a local-only journal, not a signed-in cloud account."
                    : "Private records, protected by your Supabase account."}
                </p>
                <dl className="data-status">
                  <div>
                    <dt>Connection</dt>
                    <dd>{online ? "Online" : "Offline"}</dd>
                  </div>
                  <div>
                    <dt>Offline page</dt>
                    <dd>{shellReady ? "Ready" : "Not cached yet"}</dd>
                  </div>
                  <div>
                    <dt>Pending / failed / conflicting</dt>
                    <dd>{pending.length}</dd>
                  </div>
                  <div>
                    <dt>Recorded sessions</dt>
                    <dd>{records.length}</dd>
                  </div>
                </dl>
                <div className="button-row">
                  <button
                    onClick={() =>
                      download(
                        {
                          exportedAt: new Date().toISOString(),
                          owner: identity.id,
                          records,
                        },
                        "build-workout-backup.json",
                      )
                    }
                  >
                    <Download />
                    Export my records
                  </button>
                  {!identity.local && (
                    <button onClick={() => void sync()} disabled={syncing}>
                      <RefreshCw />
                      Sync now
                    </button>
                  )}
                  <button onClick={logout}>
                    <LogOut />
                    {identity.local ? "Leave local journal" : "Sign out"}
                  </button>
                </div>
                <p className="small">
                  Local drafts remain on this browser profile when you sign out,
                  separated by account. They are not encrypted against someone
                  who can access this device. Export important data; clearing
                  site data removes local-only records. Cloud history retains
                  revisions of corrected sessions.
                </p>
                {!supabase && (
                  <div className="notice">
                    <b>Live backend not configured</b>
                    <p>
                      Supabase project creation was denied. A project owner
                      needs to create the dedicated backend and apply the
                      supplied migration. No kitchen database was changed.
                    </p>
                  </div>
                )}
                {records
                  .filter((record) => record.error)
                  .map((record) => (
                    <div className="notice" key={record.key}>
                      <b>{describe(record.session)}</b>
                      <p>{record.error}</p>
                      <button
                        onClick={() => {
                          choose(record);
                          setView("train");
                        }}
                      >
                        Review workout
                      </button>
                    </div>
                  ))}
              </section>
            )}
          </>
        )}
      </main>
      {review && currentSession && (
        <dialog
          className="modal-backdrop"
          ref={reviewDialog}
          onCancel={() => setReview(false)}
          aria-labelledby="review-title"
        >
          <section className="modal">
            <div className="modal-head">
              <h2 id="review-title">Session review</h2>
              <IconButton title="Close review" onClick={() => setReview(false)}>
                <X />
              </IconButton>
            </div>
            <p>{describe(currentSession)}</p>
            <div className="review-counts">
              {Object.entries(sessionSummary(currentSession))
                .filter(([key]) => key !== "working")
                .map(([key, value]) => (
                  <div key={key}>
                    <b>{value}</b>
                    <span>{key}</span>
                  </div>
                ))}
            </div>
            <p className="small">
              Unfinished sets stay unfinished. No targets are counted as actual
              results.
            </p>
            <Numeric
              label="Shoulder after (0-10)"
              max={10}
              value={currentSession.painAfter}
              onChange={(value) =>
                update((session) => {
                  session.painAfter = value;
                })
              }
            />
            {currentSession.status === "completed" &&
            localDate(new Date().toISOString()) >
              localDate(currentSession.finishedAt!) ? (
              <Numeric
                label="Next-day shoulder (0-10)"
                max={10}
                value={currentSession.painNextDay}
                onChange={(value) =>
                  update((session) => {
                    session.painNextDay = value;
                    session.nextDayAt = new Date().toISOString();
                  })
                }
              />
            ) : (
              <p className="small">
                The next-day shoulder check becomes available on a later
                calendar day. It remains blank until you enter it.
              </p>
            )}
            {currentSession.status !== "completed" ? (
              <button
                className="primary"
                disabled={saving || !!saveError}
                onClick={() => {
                  try {
                    const finished = finishSession(currentSession);
                    update((session) => {
                      Object.assign(session, finished);
                    });
                    setReview(false);
                    setToast(
                      `Day ${currentSession.day.slice(-1)} completed. ${sessionSummary(finished).working} actual working sets recorded.`,
                    );
                  } catch (error) {
                    setToast(message(error));
                  }
                }}
              >
                <Check />
                {sessionSummary(currentSession).pending
                  ? "Finish partial session"
                  : "Complete session"}
              </button>
            ) : (
              <button className="primary" onClick={() => setReview(false)}>
                <Check />
                Done
              </button>
            )}
          </section>
        </dialog>
      )}
    </div>
  );
}

function ExerciseEditor({
  exercise,
  session,
  sessions,
  update,
  onMessage,
  disabled,
  layout,
  online,
}: {
  exercise: ExerciseRecord;
  session: Session;
  sessions: Session[];
  update: (
    change: (exercise: ExerciseRecord, session: Session) => void,
  ) => void;
  onMessage: (message: string) => void;
  disabled: boolean;
  layout: LayoutId;
  online: boolean;
}) {
  const suggestion = suggest(exercise, sessions, session);
  const previous = comparableHistory(exercise, sessions, session.id)[0];
  const [substitute, setSubstitute] = useState(false);
  const [setupOpen, setSetupOpen] = useState(
    !exercise.equipment || !exercise.settings,
  );
  const priorSetup = sessions
    .filter(
      (previous) =>
        previous.id !== session.id &&
        previous.status === "completed" &&
        previous.startedAt <= session.startedAt,
    )
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    .flatMap((previous) => previous.exercises)
    .find(
      (previous) =>
        previous.actualName === exercise.actualName &&
        previous.equipment &&
        previous.settings,
    );
  function updateSet(id: string, field: keyof SetRecord, value: string) {
    update((current) => {
      const set = current.sets.find((set) => set.id === id)!;
      Object.assign(set, { [field]: value });
      if (set.status === "done" && field !== "status") set.status = "pending";
    });
  }
  function metadata(
    field: "actualName" | "equipment" | "settings" | "basis" | "unit",
    value: string,
  ) {
    if (exercise.sets.some((set) => set.status === "done"))
      onMessage(
        "Equipment or exercise changed. Reconfirm previously completed sets to verify their actuals.",
      );
    update((current) => {
      Object.assign(current, { [field]: value });
      current.sets.forEach((set) => {
        if (set.status === "done") set.status = "pending";
      });
    });
  }
  return (
    <section className="exercise-editor" data-editor-layout={layout}>
      <p className="eyebrow">
        {exercise.prescription.group} / {exercise.prescription.status}
      </p>
      <h2>{exercise.actualName}</h2>
      <div className="prescription">
        <span>
          <b>
            {session.introductory
              ? Math.min(2, exercise.prescription.sets)
              : exercise.prescription.sets}{" "}
            × {exercise.prescription.reps}
          </b>
          prescribed
        </span>
        <span>
          <b>
            {session.introductory && exercise.prescription.sets
              ? "3-4"
              : exercise.prescription.rir}
          </b>
          {exercise.prescription.sets ? "RIR" : "effort"}
        </span>
        <span>
          <b>
            {exercise.prescription.rest
              ? `${exercise.prescription.rest}s`
              : "Easy"}
          </b>
          rest
        </span>
      </div>
      <p className="technique">{exercise.prescription.cue}</p>
      <VideoReference exercise={exercise} online={online} />
      {held(exercise) ? (
        <div className="notice">
          <ShieldCheck />
          <h3>Held for assessment</h3>
          <p>{exercise.prescription.start}</p>
          <p>
            No active sets and no automatic unlock. A revised,
            clinician-informed program is required before logging this movement.
          </p>
        </div>
      ) : (
        <fieldset disabled={disabled} className="editor-fields">
          <details
            className="setup"
            open={setupOpen}
            onToggle={(event) => setSetupOpen(event.currentTarget.open)}
          >
            <summary>Equipment & setup</summary>
            {priorSetup && (
              <button
                className="text-button"
                disabled={exercise.sets.some((set) => set.status === "done")}
                onClick={() =>
                  update((current) => {
                    current.equipment = priorSetup.equipment;
                    current.settings = priorSetup.settings;
                    current.basis = priorSetup.basis;
                    current.unit = priorSetup.unit;
                    current.increment = priorSetup.increment;
                  })
                }
              >
                <History size={16} />
                Use previous setup: {priorSetup.equipment},{" "}
                {priorSetup.settings}
              </button>
            )}
            <div className="form-grid">
              <label className="field">
                Equipment / machine ID
                <input
                  value={exercise.equipment}
                  onChange={(event) =>
                    metadata("equipment", event.target.value)
                  }
                  placeholder="e.g. leg press A"
                />
              </label>
              <label className="field">
                Settings / angle / assistance
                <input
                  value={exercise.settings}
                  onChange={(event) => metadata("settings", event.target.value)}
                  placeholder="e.g. seat 3, foot position"
                />
              </label>
              <label className="field">
                Load basis
                <select
                  value={exercise.basis}
                  onChange={(event) => metadata("basis", event.target.value)}
                >
                  {BASES.map((basis) => (
                    <option key={basis}>{basis}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Measure
                <select
                  value={exercise.unit}
                  onChange={(event) => metadata("unit", event.target.value)}
                >
                  <option value="reps">Repetitions</option>
                  <option value="seconds">Seconds</option>
                </select>
              </label>
              <Numeric
                label="Smallest increment (kg)"
                value={exercise.increment}
                onChange={(value) =>
                  update((current) => {
                    current.increment = value;
                  })
                }
              />
              <label className="field">
                Clinician restriction / movement hold
                <input
                  value={exercise.restriction}
                  onChange={(event) =>
                    update((current) => {
                      current.restriction = event.target.value;
                    })
                  }
                  placeholder="Leave blank if none"
                />
              </label>
            </div>
            <button className="text-button" onClick={() => setSetupOpen(false)}>
              <Check size={17} />
              Confirm setup
            </button>
          </details>
          <div className="comparison">
            <div className="previous">
              <p className="eyebrow">Last comparable result</p>
              {previous ? (
                <>
                  <b>{date(previous.session.startedAt)}</b>
                  <p>
                    {workingSets(previous.exercise)
                      .map(
                        (set) =>
                          `${set.load ? set.load + " kg · " : ""}${exercise.unit === "seconds" ? set.seconds + "s" : set.reps + " reps"} · ${set.rir || "?"} RIR`,
                      )
                      .join(" / ")}
                  </p>
                  <p className="small">
                    {previous.exercise.notes || "No exercise notes."}{" "}
                    {previous.session.notes}
                  </p>
                </>
              ) : (
                <p>
                  No comparable completed result. Match equipment and setup to
                  compare fairly.
                </p>
              )}
            </div>
            <div className="suggestion">
              <p className="eyebrow">Suggestion / {suggestion.action}</p>
              <p>{suggestion.text}</p>
            </div>
          </div>
          <details className="target-details">
            <summary>Today's target, starting guidance & substitution</summary>
            <label className="field">
              My target / override (not an actual result)
              <input
                value={exercise.target}
                onChange={(event) =>
                  update((current) => {
                    current.target = event.target.value;
                  })
                }
                placeholder="Optional plan for today"
              />
            </label>
            <p>{exercise.prescription.start}</p>
            <p>
              <b>Alternative:</b> {exercise.prescription.swap}
            </p>
            <button
              className="text-button"
              onClick={() => setSubstitute(!substitute)}
            >
              <RefreshCw size={16} />
              Record a substitution
            </button>
            {substitute && (
              <label className="field">
                Actual exercise name
                <input
                  value={exercise.actualName}
                  onChange={(event) =>
                    metadata("actualName", event.target.value)
                  }
                />
              </label>
            )}
            <p className="small">
              Original prescription: {exercise.prescription.name}. A
              substitution does not remove shoulder restrictions. No inherited
              load recommendation.
            </p>
          </details>
          <div className="set-heading">
            <h3>Actual sets</h3>
            <button
              className="text-button"
              onClick={() => {
                if (
                  exercise.sets.some((set) => set.status === "done") &&
                  !confirm("Keep completed sets and skip only unfinished sets?")
                )
                  return;
                update((current) => {
                  current.sets.forEach((set) => {
                    if (set.status === "pending") set.status = "skipped";
                  });
                });
              }}
            >
              <SkipForward size={17} />
              Skip remaining
            </button>
          </div>
          <div className="sets">
            {exercise.sets.map((set, index) => (
              <div
                className={`set-entry ${set.status}`}
                key={set.id}
                data-testid="set-entry"
              >
                <div className="set-entry-head">
                  <b>Set {index + 1}</b>
                  <select
                    aria-label={`Set ${index + 1} type`}
                    value={set.type}
                    onChange={(event) =>
                      updateSet(set.id, "type", event.target.value)
                    }
                  >
                    <option value="working">Working</option>
                    <option value="warm-up">Warm-up</option>
                    <option value="cardio">Cardio</option>
                  </select>
                  <span className="set-status">
                    {set.status === "pending" ? "Not completed" : set.status}
                  </span>
                  <IconButton
                    title={`Remove set ${index + 1}`}
                    onClick={() => {
                      if (
                        set.status === "done" &&
                        !confirm(
                          "Remove this completed set? This is a correction to your actual history.",
                        )
                      )
                        return;
                      update((current) => {
                        current.sets = current.sets.filter(
                          (item) => item.id !== set.id,
                        );
                      });
                    }}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </div>
                <div className="set-inputs">
                  {exercise.basis !== "Bodyweight" && set.type !== "cardio" && (
                    <Numeric
                      label="Load kg"
                      value={set.load}
                      onChange={(value) => updateSet(set.id, "load", value)}
                    />
                  )}
                  <Numeric
                    label={
                      exercise.unit === "seconds"
                        ? "Seconds"
                        : exercise.prescription.reps.includes("/ side")
                          ? "Reps / side"
                          : "Reps"
                    }
                    integer
                    value={exercise.unit === "seconds" ? set.seconds : set.reps}
                    onChange={(value) =>
                      updateSet(set.id, exercise.unit, value)
                    }
                  />
                  {set.type !== "cardio" && (
                    <Numeric
                      label="RIR"
                      max={10}
                      value={set.rir}
                      onChange={(value) => updateSet(set.id, "rir", value)}
                    />
                  )}
                  <Numeric
                    label="Shoulder 0-10"
                    max={10}
                    value={set.pain}
                    onChange={(value) => updateSet(set.id, "pain", value)}
                  />
                </div>
                <div className="set-actions">
                  <button
                    className={
                      set.status === "done" ? "completed-button" : "primary"
                    }
                    aria-label={`${set.status === "done" ? "Reopen" : "Complete"} set ${index + 1}`}
                    onClick={() => {
                      if (set.status === "done") {
                        updateSet(set.id, "status", "pending");
                        return;
                      }
                      const error = setError(set, exercise);
                      if (error) {
                        onMessage(error);
                        return;
                      }
                      update((current, draft) => {
                        current.sets.find(
                          (item) => item.id === set.id,
                        )!.status = "done";
                        if (
                          draft.status === "active" &&
                          exercise.prescription.rest
                        )
                          draft.restUntil =
                            Date.now() + exercise.prescription.rest * 1000;
                      });
                    }}
                  >
                    <Check size={18} />
                    {set.status === "done" ? "Completed" : "Complete set"}
                  </button>
                  <IconButton
                    title={`Skip set ${index + 1}`}
                    onClick={() => updateSet(set.id, "status", "skipped")}
                  >
                    <SkipForward size={19} />
                  </IconButton>
                  <IconButton
                    title={`Stop set ${index + 1} due to symptoms`}
                    onClick={() => {
                      updateSet(set.id, "status", "stopped");
                      onMessage(
                        "Set stopped. Do not progress through shoulder symptoms. Record details in the exercise notes.",
                      );
                    }}
                  >
                    <Square size={17} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
          <div className="button-row add-sets">
            <button
              onClick={() =>
                update((current) => {
                  current.sets.push(
                    blankSet(
                      exercise.prescription.group === "Cardio"
                        ? "cardio"
                        : "working",
                    ),
                  );
                })
              }
            >
              <Plus size={18} />
              Add set
            </button>
            <button
              onClick={() =>
                update((current) => {
                  current.sets.push(blankSet("warm-up"));
                })
              }
            >
              <Plus size={18} />
              Warm-up set
            </button>
            <IconButton
              title="Start rest timer"
              onClick={() =>
                update((_current, draft) => {
                  draft.restUntil =
                    Date.now() + (exercise.prescription.rest || 60) * 1000;
                })
              }
            >
              <Timer />
            </IconButton>
          </div>
          <label className="field exercise-notes">
            Exercise notes
            <textarea
              value={exercise.notes}
              onChange={(event) =>
                update((current) => {
                  current.notes = event.target.value;
                })
              }
              placeholder="Technique, symptoms, or why you changed the plan"
            />
          </label>
        </fieldset>
      )}
    </section>
  );
}

function HistoryView({
  records,
  open,
}: {
  records: LocalRecord[];
  open: (record: LocalRecord) => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exerciseFilter, setExerciseFilter] = useState("");
  const exerciseNames = [
    ...new Set(
      records.flatMap((record) =>
        record.session.exercises.map((exercise) => exercise.actualName),
      ),
    ),
  ].sort();
  const visible = records.filter(
    (record) =>
      (!from || localDate(record.session.startedAt) >= from) &&
      (!to || localDate(record.session.startedAt) <= to) &&
      (!exerciseFilter ||
        record.session.exercises.some(
          (exercise) => exercise.actualName === exerciseFilter,
        )),
  );
  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your record</p>
          <h1>Training history</h1>
          <p className="muted">Actual sessions. Actual work.</p>
        </div>
      </div>
      <label className="field history-exercise-filter">
        Exercise
        <select
          aria-label="Filter history by exercise"
          value={exerciseFilter}
          onChange={(event) => setExerciseFilter(event.target.value)}
        >
          <option value="">All exercises</option>
          {exerciseNames.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <div className="filter-row">
        <label className="field">
          From
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="field">
          To
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
      </div>
      {!visible.length ? (
        <Empty
          title={
            records.length
              ? "No sessions match these filters."
              : "Your first session belongs here."
          }
          text={
            records.length
              ? "Choose another exercise or date range."
              : "Completed and unfinished workouts will appear after you start training."
          }
        />
      ) : (
        <div className="history-list">
          {visible.map((record) => {
            const summary = sessionSummary(record.session);
            const due =
              record.session.status === "completed" &&
              !record.session.painNextDay &&
              localDate(new Date().toISOString()) >
                localDate(record.session.finishedAt!);
            return (
              <button
                className="history-row"
                key={record.key}
                onClick={() => open(record)}
              >
                <span className="day-stamp">
                  D{record.session.day.slice(-1)}
                </span>
                <span>
                  <b>{record.session.title}</b>
                  <small>
                    {date(record.session.startedAt)} ·{" "}
                    {record.session.status === "active"
                      ? "Unfinished"
                      : "Completed"}
                    {summary.pending ? " · partial" : ""}
                  </small>
                  {due && (
                    <small className="accent">
                      Next-day shoulder check due
                    </small>
                  )}
                </span>
                <span className="history-sets">
                  <b>{summary.working}</b>
                  <small>working sets</small>
                  <small>{syncLabels[record.state]}</small>
                </span>
                <ChevronRight />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <Activity size={30} />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
function Progress({ sessions }: { sessions: Session[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [key, setKey] = useState("");
  const completed = sessions
    .filter(
      (session) =>
        session.status === "completed" &&
        (!from || localDate(session.startedAt) >= from) &&
        (!to || localDate(session.startedAt) <= to),
    )
    .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
  const options = new Map<string, ExerciseRecord>();
  completed.forEach((session) =>
    session.exercises.forEach((exercise) => {
      const candidate = comparisonKey(exercise);
      if (candidate && workingSets(exercise).length)
        options.set(candidate, exercise);
    }),
  );
  const selectedKey = options.has(key) ? key : [...options.keys()][0] || "";
  const selectedExercise = options.get(selectedKey);
  const trend = selectedKey ? trendRows(completed, selectedKey) : [];
  const summary = completed.map((session) => ({
    date: date(session.startedAt),
    sets: doneSets(session).length,
    before: number(session.painBefore),
    after: number(session.painAfter),
    next: number(session.painNextDay),
  }));
  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">See the work add up</p>
          <h1>Progress, in perspective.</h1>
          <p className="muted">
            Comparable equipment. Completed working sets. No estimated PRs.
          </p>
        </div>
      </div>
      <div className="filter-row">
        <label className="field">
          From
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="field">
          To
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
      </div>
      {!completed.length ? (
        <Empty
          title="A clear starting point."
          text="Finish a workout to see your training history here. No sample results have been added."
        />
      ) : (
        <>
          <div className="metrics">
            <div>
              <b>{completed.length}</b>
              <span>completed sessions</span>
            </div>
            <div>
              <b>
                {completed.reduce(
                  (total, session) => total + doneSets(session).length,
                  0,
                )}
              </b>
              <span>working sets</span>
            </div>
            <div>
              <b>{options.size}</b>
              <span>comparable setups</span>
            </div>
          </div>
          <div className="charts">
            <section className="chart-section">
              <h2>Work completed</h2>
              <p className="small">
                Working sets per completed session. Warm-ups and cardio
                excluded.
              </p>
              <div className="chart">
                <ResponsiveContainer>
                  <BarChart data={summary}>
                    <CartesianGrid vertical={false} stroke="var(--cp-border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "var(--cp-text-soft)", fontSize: 12 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      width={30}
                      tick={{ fill: "var(--cp-text-soft)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--cp-surface)",
                        color: "var(--cp-text)",
                        borderColor: "var(--cp-border)",
                      }}
                    />
                    <Bar
                      dataKey="sets"
                      name="Working sets"
                      fill="var(--cp-accent)"
                      maxBarSize={36}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="chart-section">
              <h2>Shoulder response</h2>
              <p className="small">
                Recorded 0-10 scores. Missing observations stay missing.
              </p>
              <div className="chart">
                <ResponsiveContainer>
                  <LineChart data={summary}>
                    <CartesianGrid stroke="var(--cp-border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "var(--cp-text-soft)", fontSize: 12 }}
                    />
                    <YAxis
                      domain={[0, 10]}
                      width={30}
                      tick={{ fill: "var(--cp-text-soft)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--cp-surface)",
                        color: "var(--cp-text)",
                      }}
                    />
                    <Line
                      dataKey="before"
                      name="Before"
                      stroke="var(--cp-text-soft)"
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                    <Line
                      dataKey="after"
                      name="After"
                      stroke="var(--cp-link)"
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                    <Line
                      dataKey="next"
                      name="Next day"
                      stroke="var(--cp-accent)"
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-legend">Before / After / Next day</p>
            </section>
          </div>
          <section className="exercise-trend">
            <h2>One exercise, one setup</h2>
            {options.size ? (
              <>
                <label className="field">
                  Exercise & equipment
                  <select
                    value={selectedKey}
                    onChange={(event) => setKey(event.target.value)}
                  >
                    {[...options].map(([value, exercise]) => (
                      <option key={value} value={value}>
                        {exercise.actualName} · {exercise.equipment} ·{" "}
                        {exercise.settings} · {exercise.basis}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="small">
                  {selectedExercise?.basis} · {selectedExercise?.unit}.{" "}
                  {selectedExercise?.basis === "Assistance"
                    ? "More kg means more assistance, not more strength."
                    : "Loads are not comparable with a different machine, load basis, angle or setup."}
                </p>
                <div className="chart">
                  <ResponsiveContainer>
                    <LineChart data={trend}>
                      <CartesianGrid stroke="var(--cp-border)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "var(--cp-text-soft)", fontSize: 12 }}
                      />
                      <YAxis
                        yAxisId="load"
                        width={35}
                        tick={{ fill: "var(--cp-text-soft)" }}
                      />
                      <YAxis
                        yAxisId="reps"
                        orientation="right"
                        width={35}
                        tick={{ fill: "var(--cp-text-soft)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--cp-surface)",
                          color: "var(--cp-text)",
                        }}
                      />
                      {selectedExercise?.basis !== "Bodyweight" && (
                        <Line
                          yAxisId="load"
                          dataKey="load"
                          name="Highest completed load (kg)"
                          stroke="var(--cp-accent)"
                          isAnimationActive={false}
                        />
                      )}
                      <Line
                        yAxisId="reps"
                        dataKey={
                          selectedExercise?.unit === "seconds"
                            ? "seconds"
                            : "reps"
                        }
                        name={
                          selectedExercise?.unit === "seconds"
                            ? "Total completed seconds"
                            : "Total completed reps"
                        }
                        stroke="var(--cp-link)"
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Working sets</th>
                        <th>Highest kg</th>
                        <th>Total reps</th>
                        <th>Total seconds</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trend.map((row) => (
                        <tr key={row.id}>
                          <td>{row.date}</td>
                          <td>{row.sets}</td>
                          <td>{row.load ?? "N/A"}</td>
                          <td>{row.reps}</td>
                          <td>{row.seconds}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="muted">
                Add equipment and settings to completed exercise records before
                comparing loads. Your set totals above still count.
              </p>
            )}
          </section>
        </>
      )}
    </section>
  );
}
