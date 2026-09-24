export type IntervalSettings = { exercise: number; rest: number; sets: number };
export type IntervalRun = {
  version: 1;
  settings: IntervalSettings;
  elapsed: number;
  startedAt: number | null;
};
export const preparationSeconds = 5;
export const defaultIntervals: IntervalSettings = {
  exercise: 40,
  rest: 20,
  sets: 3,
};
export const intervalSettingsKey = "build-interval-settings";
export const intervalRunKey = "build-interval-run";

export function intervalError(settings: IntervalSettings) {
  if (
    !Number.isInteger(settings.exercise) ||
    settings.exercise < 1 ||
    settings.exercise > 3600
  )
    return "Exercise duration must be between 1 second and 60 minutes.";
  if (
    !Number.isInteger(settings.rest) ||
    settings.rest < 0 ||
    settings.rest > 3600
  )
    return "Rest duration must be between 0 and 60 minutes.";
  if (
    !Number.isInteger(settings.sets) ||
    settings.sets < 1 ||
    settings.sets > 99
  )
    return "Choose between 1 and 99 whole sets.";
  return "";
}
export function intervalTotal(settings: IntervalSettings) {
  return (
    preparationSeconds +
    settings.exercise * settings.sets +
    settings.rest * (settings.sets - 1)
  );
}
export function intervalElapsed(run: IntervalRun, now: number) {
  return Math.min(
    intervalTotal(run.settings) * 1000,
    Math.max(
      0,
      run.elapsed +
        (run.startedAt === null ? 0 : Math.max(0, now - run.startedAt)),
    ),
  );
}
export function startIntervals(
  settings: IntervalSettings,
  now: number,
): IntervalRun {
  const error = intervalError(settings);
  if (error) throw new Error(error);
  return { version: 1, settings: { ...settings }, elapsed: 0, startedAt: now };
}
export function pauseIntervals(run: IntervalRun, now: number): IntervalRun {
  return { ...run, elapsed: intervalElapsed(run, now), startedAt: null };
}
export function resumeIntervals(run: IntervalRun, now: number): IntervalRun {
  return run.startedAt !== null ? run : { ...run, startedAt: now };
}
export function intervalPhase(run: IntervalRun, now: number) {
  const elapsed = intervalElapsed(run, now) / 1000;
  const { exercise, rest, sets } = run.settings;
  const total = intervalTotal(run.settings);
  if (elapsed >= total)
    return {
      phase: "finished" as const,
      set: sets,
      remaining: 0,
      progress: 1,
      totalRemaining: 0,
      next: "Time to recover",
    };
  if (elapsed < preparationSeconds)
    return {
      phase: "prepare" as const,
      set: 1,
      remaining: Math.ceil(preparationSeconds - elapsed),
      progress: elapsed / preparationSeconds,
      totalRemaining: Math.ceil(total - elapsed),
      next: "Exercise · Set 1",
    };
  const workElapsed = elapsed - preparationSeconds;
  const set = Math.floor(workElapsed / (exercise + rest)) + 1;
  const withinSet = workElapsed % (exercise + rest);
  const exercising = withinSet < exercise;
  const duration = exercising ? exercise : rest;
  const withinPhase = exercising ? withinSet : withinSet - exercise;
  return {
    phase: exercising ? ("exercise" as const) : ("rest" as const),
    set,
    remaining: Math.ceil(duration - withinPhase),
    progress: withinPhase / duration,
    totalRemaining: Math.ceil(total - elapsed),
    next: exercising
      ? set === sets
        ? "Finish"
        : rest
          ? `Rest · ${formatIntervalTime(rest)}`
          : `Exercise · Set ${set + 1}`
      : `Exercise · Set ${set + 1}`,
  };
}
export function formatIntervalTime(seconds: number) {
  const whole = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remainder = String(whole % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${minutes}:${remainder}`;
}
export function parseIntervalRun(value: string | null): IntervalRun | null {
  try {
    const run = JSON.parse(value || "null") as IntervalRun | null;
    if (
      !run ||
      run.version !== 1 ||
      !run.settings ||
      intervalError(run.settings) ||
      !Number.isFinite(run.elapsed) ||
      run.elapsed < 0 ||
      run.elapsed >= intervalTotal(run.settings) * 1000
    )
      return null;
    return {
      version: 1,
      settings: run.settings,
      elapsed: run.elapsed,
      startedAt: null,
    };
  } catch {
    return null;
  }
}
