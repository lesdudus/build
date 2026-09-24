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
  intervalTotal,
  pauseIntervals,
  preparationSeconds,
  resumeIntervals,
  startIntervals,
  type IntervalRun,
  type IntervalSettings,
} from "./interval";
import "./interval.css";

export function IntervalTimer({ visible }: { visible: boolean }) {
  const [exerciseSeconds, setExerciseSeconds] = useState(
    String(defaultIntervals.exercise),
  );
  const [restSeconds, setRestSeconds] = useState(String(defaultIntervals.rest));
  const [sets, setSets] = useState(String(defaultIntervals.sets));
  const [run, setRun] = useState<IntervalRun | null>(null);
  const [now, setNow] = useState(Date.now());
  const [fullscreen, setFullscreen] = useState(false);
  const [wakeState, setWakeState] = useState("Screen may dim");
  const dialog = useRef<HTMLDialogElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const pauseButton = useRef<HTMLButtonElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const settings: IntervalSettings = {
    exercise: Number(exerciseSeconds),
    rest: Number(restSeconds),
    sets: Number(sets),
  };
  const error = [exerciseSeconds, restSeconds, sets].some(
    (value) => !/^\d+$/.test(value),
  )
    ? "Enter whole numbers in every field."
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

  function changeRun(value: IntervalRun) {
    setRun(value);
    setNow(Date.now());
  }
  useEffect(() => {
    if (!running) return;
    const tick = window.setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(tick);
  }, [running]);
  useEffect(() => {
    const visibility = () => {
      setNow(Date.now());
    };
    const onFullscreen = () =>
      setFullscreen(document.fullscreenElement === screen.current);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
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
    setRun(null);
    startButton.current?.focus();
  }
  function field(
    labelText: string,
    value: string,
    change: (value: string) => void,
    max: number,
    min = 0,
  ) {
    return (
      <label className="field">
        <span>{labelText}</span>
        <input
          type="number"
          inputMode="numeric"
          min={min}
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
      <form
        className="interval-setup"
        onSubmit={(event) => {
          event.preventDefault();
          if (!error) open(startIntervals(settings, Date.now()));
        }}
      >
        <div className="interval-fields">
          {field(
            "Exercise seconds",
            exerciseSeconds,
            setExerciseSeconds,
            3600,
            1,
          )}
          {field("Rest seconds", restSeconds, setRestSeconds, 3600)}
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
          </footer>
        </div>
      </dialog>
    </section>
  );
}
