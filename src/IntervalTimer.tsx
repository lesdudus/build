import { useEffect, useRef, useState } from "react";
import {
  Check,
  Expand,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Square,
  Timer,
  X,
} from "lucide-react";
import {
  defaultIntervals,
  formatIntervalTime,
  intervalError,
  intervalPhase,
  intervalRunKey,
  intervalSettingsKey,
  intervalTotal,
  parseIntervalRun,
  pauseIntervals,
  preparationSeconds,
  resumeIntervals,
  startIntervals,
  type IntervalRun,
  type IntervalSettings,
} from "./interval";
import "./interval.css";

function readSettings(): IntervalSettings {
  try {
    const value = JSON.parse(
      localStorage.getItem(intervalSettingsKey) || "null",
    );
    return value && !intervalError(value) ? value : defaultIntervals;
  } catch {
    return defaultIntervals;
  }
}
function readRecovery() {
  try {
    return parseIntervalRun(localStorage.getItem(intervalRunKey));
  } catch {
    return null;
  }
}
function durationFields(seconds: number) {
  return [String(Math.floor(seconds / 60)), String(seconds % 60)];
}

export function IntervalTimer({ visible }: { visible: boolean }) {
  const [initial] = useState(readSettings);
  const [exerciseMinutes, setExerciseMinutes] = useState(
    durationFields(initial.exercise)[0],
  );
  const [exerciseSeconds, setExerciseSeconds] = useState(
    durationFields(initial.exercise)[1],
  );
  const [restMinutes, setRestMinutes] = useState(
    durationFields(initial.rest)[0],
  );
  const [restSeconds, setRestSeconds] = useState(
    durationFields(initial.rest)[1],
  );
  const [sets, setSets] = useState(String(initial.sets));
  const [recovery, setRecovery] = useState(readRecovery);
  const [run, setRun] = useState<IntervalRun | null>(null);
  const [now, setNow] = useState(Date.now());
  const [storageError, setStorageError] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [wakeState, setWakeState] = useState("Screen may dim");
  const dialog = useRef<HTMLDialogElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const pauseButton = useRef<HTMLButtonElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const active = useRef(run);
  active.current = run;
  const settings: IntervalSettings = {
    exercise: Number(exerciseMinutes) * 60 + Number(exerciseSeconds),
    rest: Number(restMinutes) * 60 + Number(restSeconds),
    sets: Number(sets),
  };
  const rawDurations = [
    exerciseMinutes,
    exerciseSeconds,
    restMinutes,
    restSeconds,
  ];
  const error =
    rawDurations.some((value) => !/^\d+$/.test(value)) || !/^\d+$/.test(sets)
      ? "Enter whole numbers in every field."
      : Number(exerciseSeconds) > 59 || Number(restSeconds) > 59
        ? "Seconds must be between 0 and 59."
        : intervalError(settings);
  const phase = run ? intervalPhase(run, now) : null;
  const finished = phase?.phase === "finished";
  const running = !!run && run.startedAt !== null && !finished;
  const label = finished
    ? "Finished"
    : run?.startedAt === null
      ? "Paused"
      : phase?.phase === "prepare"
        ? "Get ready"
        : phase?.phase === "rest"
          ? "Rest"
          : "Exercise";

  function write(key: string, value: unknown | null) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch {
      setStorageError(
        "Timer storage is unavailable. This visit still works, but settings and recovery may not be saved.",
      );
    }
  }
  function saveSnapshot(value: IntervalRun) {
    write(
      intervalRunKey,
      intervalPhase(value, Date.now()).phase === "finished"
        ? null
        : pauseIntervals(value, Date.now()),
    );
  }
  function changeRun(value: IntervalRun) {
    active.current = value;
    setRun(value);
    setNow(Date.now());
    saveSnapshot(value);
  }
  useEffect(() => {
    if (!error) write(intervalSettingsKey, settings);
  }, [exerciseMinutes, exerciseSeconds, restMinutes, restSeconds, sets, error]);
  useEffect(() => {
    if (!running) return;
    const tick = window.setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(tick);
  }, [running]);
  useEffect(() => {
    if (run) saveSnapshot(run);
  }, [run, Math.floor(now / 1000)]);
  useEffect(() => {
    const snapshot = () => {
      if (active.current) saveSnapshot(active.current);
    };
    const visibility = () => {
      snapshot();
      setNow(Date.now());
    };
    const onFullscreen = () =>
      setFullscreen(document.fullscreenElement === screen.current);
    window.addEventListener("pagehide", snapshot);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      snapshot();
      window.removeEventListener("pagehide", snapshot);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, []);
  useEffect(() => {
    if (!running || !("wakeLock" in navigator)) {
      setWakeState("Screen may dim");
      return;
    }
    let disposed = false;
    let requesting = false;
    let lock: WakeLockSentinel | null = null;
    async function acquire() {
      if (
        disposed ||
        requesting ||
        document.visibilityState !== "visible" ||
        (lock && !lock.released)
      )
        return;
      requesting = true;
      try {
        const requested = await navigator.wakeLock.request("screen");
        if (disposed) {
          await requested.release();
          return;
        }
        lock = requested;
        setWakeState("Keeping screen awake");
        requested.addEventListener("release", () => {
          if (!disposed) setWakeState("Screen may dim");
        });
      } catch {
        if (!disposed) setWakeState("Screen may dim");
      } finally {
        requesting = false;
      }
    }
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release().catch(() => {});
    };
  }, [running, run?.startedAt]);

  function enterFullscreen() {
    try {
      void screen.current?.requestFullscreen?.().catch(() => {});
    } catch {}
  }
  function open(value: IntervalRun) {
    changeRun(value);
    setRecovery(null);
    dialog.current?.showModal();
    enterFullscreen();
    pauseButton.current?.focus();
  }
  function togglePause() {
    if (!run || finished) return;
    changeRun(
      run.startedAt === null
        ? resumeIntervals(run, Date.now())
        : pauseIntervals(run, Date.now()),
    );
  }
  function confirmAction(action: "restart" | "end") {
    if (!run) return;
    const paused = pauseIntervals(run, Date.now());
    const wasRunning = run.startedAt !== null && !finished;
    changeRun(paused);
    if (
      !finished &&
      !window.confirm(
        action === "restart"
          ? "Restart this timer from the preparation countdown?"
          : "End this timer? No workout results will be recorded.",
      )
    ) {
      if (wasRunning) changeRun(resumeIntervals(paused, Date.now()));
      return;
    }
    if (action === "restart") {
      changeRun(startIntervals(run.settings, Date.now()));
      return;
    }
    if (document.fullscreenElement === screen.current)
      void document.exitFullscreen().catch(() => {});
    dialog.current?.close();
    active.current = null;
    setRun(null);
    write(intervalRunKey, null);
    startButton.current?.focus();
  }
  function field(
    labelText: string,
    value: string,
    change: (value: string) => void,
    max: number,
  ) {
    return (
      <label className="field">
        <span>{labelText}</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          max={max}
          step="1"
          value={value}
          onChange={(event) => change(event.target.value)}
        />
      </label>
    );
  }
  return (
    <section
      className="interval-section"
      hidden={!visible}
      aria-label="Interval timer"
    >
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your pace</p>
          <h1>Interval timer</h1>
        </div>
        <Timer size={30} aria-hidden="true" />
      </div>
      {storageError && (
        <p className="notice" role="alert">
          {storageError}
        </p>
      )}
      {recovery ? (
        <section className="interval-recovery" aria-label="Interrupted timer">
          <p className="eyebrow">Interrupted timer</p>
          <h2>Ready when you are.</h2>
          <p>
            Set {intervalPhase(recovery, now).set} of {recovery.settings.sets} ·{" "}
            {formatIntervalTime(intervalPhase(recovery, now).remaining)}{" "}
            remaining in{" "}
            {intervalPhase(recovery, now).phase === "prepare"
              ? "preparation"
              : intervalPhase(recovery, now).phase}
            .
          </p>
          <p className="small">
            Paused at the last saved moment. Time while the page was closed is
            not counted.
          </p>
          <div className="button-row">
            <button
              className="primary"
              onClick={() => open(resumeIntervals(recovery, Date.now()))}
            >
              <Play />
              Resume timer
            </button>
            <button
              onClick={() =>
                open(startIntervals(recovery.settings, Date.now()))
              }
            >
              <RotateCcw />
              Restart timer
            </button>
            <button
              onClick={() => {
                write(intervalRunKey, null);
                setRecovery(null);
              }}
            >
              <X />
              Discard timer
            </button>
          </div>
        </section>
      ) : (
        <form
          className="interval-setup"
          onSubmit={(event) => {
            event.preventDefault();
            if (!error) open(startIntervals(settings, Date.now()));
          }}
        >
          <div className="interval-fields">
            <fieldset>
              <legend>Exercise / set</legend>
              <div className="interval-duration">
                {field(
                  "Exercise minutes",
                  exerciseMinutes,
                  setExerciseMinutes,
                  60,
                )}
                {field(
                  "Exercise seconds",
                  exerciseSeconds,
                  setExerciseSeconds,
                  59,
                )}
              </div>
            </fieldset>
            <fieldset>
              <legend>Rest / between sets</legend>
              <div className="interval-duration">
                {field("Rest minutes", restMinutes, setRestMinutes, 60)}
                {field("Rest seconds", restSeconds, setRestSeconds, 59)}
              </div>
            </fieldset>
            <label className="field interval-set-count">
              <span>Number of sets</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="99"
                step="1"
                value={sets}
                onChange={(event) => setSets(event.target.value)}
              />
            </label>
          </div>
          <div className="interval-plan">
            <p className="eyebrow">Planned time</p>
            <strong aria-label="Total planned duration">
              {error ? "--:--" : formatIntervalTime(intervalTotal(settings))}
            </strong>
            <p>{preparationSeconds}s preparation · No final rest</p>
            <p className="small">
              Silent intervals. No sets added to your journal.
            </p>
            <button
              ref={startButton}
              type="submit"
              className="primary"
              disabled={!!error}
            >
              <Play />
              Start timer
            </button>
          </div>
          {error && (
            <p role="alert" className="interval-validation">
              {error}
            </p>
          )}
        </form>
      )}
      <dialog
        className="interval-immersive"
        ref={dialog}
        aria-label="Active interval timer"
        data-phase={phase?.phase}
        onCancel={(event) => {
          event.preventDefault();
          confirmAction("end");
        }}
      >
        <div className="interval-screen" ref={screen}>
          <header className="interval-screen-header">
            <span className="eyebrow">BUILD / INTERVALS</span>
            <div>
              <button
                className="icon-button"
                type="button"
                title={fullscreen ? "Leave fullscreen" : "Enter fullscreen"}
                aria-label={
                  fullscreen ? "Leave fullscreen" : "Enter fullscreen"
                }
                onClick={() => {
                  if (fullscreen)
                    void document.exitFullscreen().catch(() => {});
                  else enterFullscreen();
                }}
              >
                {fullscreen ? <Minimize /> : <Expand />}
              </button>
              <button
                className="icon-button"
                type="button"
                title="End timer"
                aria-label="End timer"
                onClick={() => confirmAction("end")}
              >
                <X />
              </button>
            </div>
          </header>
          <div className="interval-center">
            <p className="interval-set">
              Set {phase?.set || 1}{" "}
              <span>/ {run?.settings.sets || settings.sets}</span>
            </p>
            <div className="interval-dial" data-testid="interval-dial">
              <svg viewBox="0 0 300 300" aria-hidden="true">
                <circle
                  className="interval-ring-track"
                  cx="150"
                  cy="150"
                  r="138"
                />
                <circle
                  className="interval-ring-fill"
                  cx="150"
                  cy="150"
                  r="138"
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - (phase?.progress || 0)}
                />
              </svg>
              <div className="interval-digits">
                <p role="status" aria-live="polite" className="interval-phase">
                  {label}
                </p>
                <strong
                  role="timer"
                  aria-label="Interval countdown"
                  aria-live="off"
                >
                  {finished ? (
                    <Check size={76} aria-label="Complete" />
                  ) : (
                    formatIntervalTime(phase?.remaining || 0)
                  )}
                </strong>
                {run?.startedAt === null && !finished && (
                  <small>
                    {phase?.phase === "prepare"
                      ? "Preparation"
                      : phase?.phase === "rest"
                        ? "Rest"
                        : "Exercise"}
                  </small>
                )}
              </div>
            </div>
            <p className="interval-next">
              {finished ? (
                "Time to recover."
              ) : (
                <>
                  Next <b>{phase?.next}</b>
                </>
              )}
            </p>
            <p className="interval-total">
              {finished
                ? "Timer complete. Nothing logged automatically."
                : `${formatIntervalTime(phase?.totalRemaining || 0)} total remaining`}
            </p>
          </div>
          <footer className="interval-screen-footer">
            <div className="interval-controls">
              <button
                type="button"
                className="icon-button"
                title="Restart timer"
                aria-label="Restart timer"
                onClick={() => confirmAction("restart")}
              >
                <RotateCcw />
              </button>
              <button
                ref={pauseButton}
                type="button"
                className="interval-pause primary"
                onClick={() =>
                  finished ? confirmAction("end") : togglePause()
                }
              >
                {finished ? <Check /> : running ? <Pause /> : <Play />}
                {finished ? "Done" : running ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                className="icon-button"
                title="End timer"
                aria-label="Stop timer"
                onClick={() => confirmAction("end")}
              >
                <Square />
              </button>
            </div>
            <small>
              {running
                ? wakeState
                : finished
                  ? "Session timer finished"
                  : "Screen may dim while paused"}
            </small>
            {storageError && (
              <small role="alert">
                Settings and timer recovery could not be saved.
              </small>
            )}
          </footer>
        </div>
      </dialog>
    </section>
  );
}
