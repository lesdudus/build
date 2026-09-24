export type Prescription = {
  name: string;
  sets: number;
  reps: string;
  rir: string;
  rest: number;
  group: string;
  status: string;
  cue: string;
  start: string;
  swap: string;
};
export type Day = {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  minutes: string;
  exercises: Prescription[];
};
export type Program = {
  version: string;
  profile: string;
  warmup: string;
  days: Day[];
  rules: { section: string; title: string; text: string }[];
  sources: { title: string; url: string; note: string }[];
};
export type SetRecord = {
  id: string;
  type: "working" | "warm-up" | "cardio";
  status: "pending" | "done" | "skipped" | "stopped";
  load: string;
  reps: string;
  seconds: string;
  rir: string;
  pain: string;
};
export type ExerciseRecord = {
  id: string;
  prescription: Prescription;
  actualName: string;
  equipment: string;
  settings: string;
  basis: string;
  unit: "reps" | "seconds";
  increment: string;
  restriction: string;
  notes: string;
  target: string;
  sets: SetRecord[];
};
export type Session = {
  id: string;
  owner: string;
  programVersion: string;
  day: string;
  title: string;
  startedAt: string;
  finishedAt: string | null;
  status: "active" | "completed";
  introductory: boolean;
  painBefore: string;
  painAfter: string;
  painNextDay: string;
  nextDayAt: string | null;
  notes: string;
  exercises: ExerciseRecord[];
  restUntil: number | null;
};
export const BASES = [
  "Machine stack",
  "Per hand",
  "Total external",
  "Per side",
  "Bodyweight",
  "Assistance",
] as const;
export const held = (exercise: ExerciseRecord) =>
  exercise.prescription.status === "Hold for assessment";
export const blockedMovement = (name: string) =>
  /pull[ -]?ups?|push[ -]?ups?|chin[ -]?ups?|pulldowns?|pull[ -]downs?|overhead|shoulder press|chest press|bench press|dead hangs?|scapular hangs?|negatives|\bdips\b/i.test(
    name,
  );
export const number = (value: string) =>
  value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
export const positive = (value: string) => (number(value) ?? 0) > 0;
export const workingSets = (exercise: ExerciseRecord) =>
  exercise.sets.filter(
    (set) => set.status === "done" && set.type === "working",
  );
export const doneSets = (session: Session) =>
  session.exercises.flatMap(workingSets);
export const blankSet = (type: SetRecord["type"] = "working"): SetRecord => ({
  id: crypto.randomUUID(),
  type,
  status: "pending",
  load: "",
  reps: "",
  seconds: "",
  rir: "",
  pain: "",
});

export function nextDay(sessions: Session[]) {
  const last = sessions
    .filter(
      (session) => session.status === "completed" && session.day !== "day-4",
    )
    .sort((left, right) =>
      (right.finishedAt || "").localeCompare(left.finishedAt || ""),
    )[0];
  return last ? `day-${(Number(last.day.slice(-1)) % 3) + 1}` : "day-1";
}

export function createSession(
  day: Day,
  program: Program,
  owner: string,
  sessions: Session[],
  now = new Date(),
): Session {
  const last = sessions
    .filter(
      (session) => session.status === "completed" && session.day !== "day-4",
    )
    .sort((left, right) =>
      (right.finishedAt || "").localeCompare(left.finishedAt || ""),
    )[0];
  const coreDays = new Set(
    sessions
      .filter(
        (session) => session.status === "completed" && session.day !== "day-4",
      )
      .map((session) => session.day),
  );
  const introductory =
    coreDays.size < 3 ||
    (!!last && now.getTime() - Date.parse(last.finishedAt!) > 7 * 86400000);
  return {
    id: crypto.randomUUID(),
    owner,
    programVersion: program.version,
    day: day.id,
    title: day.title,
    startedAt: now.toISOString(),
    finishedAt: null,
    status: "active",
    introductory,
    painBefore: "",
    painAfter: "",
    painNextDay: "",
    nextDayAt: null,
    notes: "",
    restUntil: null,
    exercises: day.exercises.map((prescription) => {
      const previous = sessions
        .filter((session) => session.status === "completed")
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
        .flatMap((session) => session.exercises)
        .find((exercise) => exercise.prescription.name === prescription.name);
      const bodyweight = /Australian|heel taps|crunch|Floor glute/.test(
        prescription.name,
      );
      return {
        id: crypto.randomUUID(),
        prescription: structuredClone(prescription),
        actualName: prescription.name,
        equipment: "",
        settings: "",
        basis: bodyweight ? "Bodyweight" : "Machine stack",
        unit: prescription.group === "Cardio" ? "seconds" : "reps",
        increment: "",
        restriction: previous?.restriction || "",
        notes: "",
        target: "",
        sets: Array.from(
          {
            length:
              prescription.status === "Hold for assessment"
                ? 0
                : prescription.group === "Cardio"
                  ? 1
                  : introductory
                    ? Math.min(2, prescription.sets)
                    : prescription.sets,
          },
          () =>
            blankSet(prescription.group === "Cardio" ? "cardio" : "working"),
        ),
      };
    }),
  };
}

export function setError(
  set: SetRecord,
  exercise: ExerciseRecord,
): string | null {
  if (held(exercise)) return "This exercise is held for assessment.";
  if (blockedMovement(exercise.actualName))
    return "This movement is excluded by the current shoulder restrictions. Stop or skip; clearance requires a revised program.";
  if (exercise.restriction.trim())
    return "A restriction is recorded. Stop or skip; do not mark this set complete.";
  if (
    number(set.pain) === null ||
    Number(set.pain) < 0 ||
    Number(set.pain) > 10
  )
    return "Record shoulder pain during the set (0-10).";
  if (Number(set.pain) > 0)
    return "Shoulder pain recorded. Stop this exercise; use Stopped instead of Done.";
  if (!positive(exercise.unit === "seconds" ? set.seconds : set.reps))
    return `Enter actual ${exercise.unit === "seconds" ? "seconds" : "reps"} before completing the set.`;
  if (exercise.unit === "reps" && !Number.isInteger(Number(set.reps)))
    return "Reps must be a whole number.";
  if (
    set.type !== "cardio" &&
    exercise.basis !== "Bodyweight" &&
    (number(set.load) === null || Number(set.load) < 0)
  )
    return "Enter the actual load or assistance in kg.";
  if (
    set.type === "working" &&
    (number(set.rir) === null || Number(set.rir) < 0 || Number(set.rir) > 10)
  )
    return "Enter estimated reps in reserve (0-10).";
  return null;
}

const normalize = (value: string) =>
  value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
export function comparisonKey(exercise: ExerciseRecord): string | null {
  if (
    !exercise.actualName.trim() ||
    !exercise.equipment.trim() ||
    !exercise.settings.trim()
  )
    return null;
  return JSON.stringify(
    [
      exercise.actualName,
      exercise.equipment,
      exercise.settings,
      exercise.basis,
      exercise.unit,
    ].map(normalize),
  );
}

export function comparableHistory(
  exercise: ExerciseRecord,
  sessions: Session[],
  excludeId?: string,
) {
  const key = comparisonKey(exercise);
  if (!key) return [];
  return sessions
    .filter(
      (session) => session.id !== excludeId && session.status === "completed",
    )
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    .flatMap((session) =>
      session.exercises
        .filter(
          (previous) =>
            comparisonKey(previous) === key && workingSets(previous).length > 0,
        )
        .map((previous) => ({ session, exercise: previous })),
    );
}

export function suggest(
  exercise: ExerciseRecord,
  sessions: Session[],
  current: Session,
) {
  const result = (action: string, text: string) => ({ action, text });
  if (held(exercise))
    return result(
      "Held",
      "Assessment required. No automatic clearance or loading suggestion.",
    );
  if (blockedMovement(exercise.actualName))
    return result(
      "Held",
      "This substitution is excluded by the current shoulder restrictions. No automatic clearance.",
    );
  if (exercise.restriction.trim())
    return result(
      "Defer",
      "A restriction is recorded. Follow clinician guidance.",
    );
  const eligible = sessions.filter(
    (session) => session.startedAt <= current.startedAt,
  );
  const history = comparableHistory(exercise, eligible, current.id);
  const symptomHistory = eligible
    .filter(
      (session) => session.id !== current.id && session.status === "completed",
    )
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
    .flatMap((session) =>
      session.exercises
        .filter(
          (previous) =>
            comparisonKey(exercise) !== null &&
            comparisonKey(previous) === comparisonKey(exercise),
        )
        .map((previous) => ({ session, exercise: previous })),
    )
    .slice(0, 2);
  if (
    [current.painBefore, current.painAfter, current.painNextDay].some(
      (value) => (number(value) ?? 0) > 0,
    ) ||
    exercise.sets.some((set) => (number(set.pain) ?? 0) > 0)
  )
    return result(
      "Defer",
      "Pain is recorded. Stop the provoking movement; do not progress it.",
    );
  const recent = history.slice(0, 2);
  if (
    symptomHistory.some(({ session, exercise: previous }) =>
      [
        session.painBefore,
        session.painAfter,
        session.painNextDay,
        ...previous.sets.map((set) => set.pain),
      ].some((value) => (number(value) ?? 0) > 0),
    )
  )
    return result(
      "Defer",
      "Recent comparable training includes shoulder symptoms. Review before progressing.",
    );
  if (exercise.prescription.status === "Pain-free only")
    return result(
      "Keep easy",
      "Shoulder restrictions remain: 3-4 RIR, comfortable setup, no harder angle or added load while unresolved.",
    );
  if (exercise.actualName !== exercise.prescription.name)
    return result(
      "Review substitution",
      "This is a different exercise. No inherited load or progression prescription; select a comfortable starting dose.",
    );
  if (!comparisonKey(exercise))
    return result(
      "Starting point",
      "Record the exact equipment and setup, including row angle or assistance. " +
        exercise.prescription.start,
    );
  if (!history.length)
    return result(
      "Starting point",
      "No comparable completed sets yet. " + exercise.prescription.start,
    );
  if (current.introductory)
    return result(
      "Re-establish",
      "Introductory or return rotation: at most two working sets, 3-4 RIR. Recheck comfortable loads.",
    );
  const latest = workingSets(history[0].exercise);
  const [minimum, maximum] = exercise.prescription.reps
    .match(/\d+/g)
    ?.map(Number) || [0, 0];
  const requiredRir = Number(exercise.prescription.rir.match(/\d+/)?.[0] || 3);
  if (
    latest.some(
      (set) =>
        (number(set.rir) !== null && Number(set.rir) < requiredRir) ||
        (positive(set.reps) && Number(set.reps) < minimum),
    )
  )
    return result(
      "Reduce or repeat",
      "Last comparable work missed the rep or effort target. Rest adequately; consider a 5-10% lighter load.",
    );
  if (
    recent.some(
      ({ session, exercise: previous }) =>
        session.painAfter === "" ||
        session.painNextDay === "" ||
        workingSets(previous).some((set) => set.pain === "" || set.rir === ""),
    )
  )
    return result(
      "Repeat",
      "Effort or later/next-day shoulder response is missing. Do not increase based on incomplete recovery data.",
    );
  const targetCount = exercise.sets.filter(
    (set) => set.type === "working",
  ).length;
  const consistent =
    recent.length === 2 &&
    recent.every(({ exercise: previous }) => {
      const sets = workingSets(previous);
      return (
        sets.length >= Math.max(exercise.prescription.sets, targetCount) &&
        previous.sets
          .filter((set) => set.type === "working")
          .every((set) => set.status === "done") &&
        sets.every(
          (set) =>
            Number(set.reps) >= maximum &&
            Number(set.rir) >= requiredRir &&
            set.load === latest[0].load,
        )
      );
    });
  if (consistent && exercise.basis === "Bodyweight")
    return result(
      "Repeat clean reps",
      "Top of the range reached twice. Keep controlled reps; do not infer an added-load or harder-angle prescription.",
    );
  if (consistent && exercise.basis === "Assistance")
    return result(
      "Review assistance",
      "Assistance is not lifted load. Keep the current setup until the specific progression is reviewed.",
    );
  if (consistent && exercise.unit === "reps") {
    const load = number(latest[0].load);
    const increment = number(exercise.increment);
    if (!load || !increment || increment <= 0)
      return result(
        "Ready to review load",
        "Top reps and target RIR met on two comparable appearances. Enter the smallest available kg increment; do not guess it.",
      );
    if (increment / load > 0.05)
      return result(
        "Repeat",
        "The available jump exceeds 5%. Keep this load and improve control rather than forcing the jump.",
      );
    return result(
      "Increase load",
      `${load} → ${Number((load + increment).toFixed(2))} kg (${exercise.basis}); return to ${minimum} reps. Top range and effort met on ${recent.map((item) => item.session.startedAt.slice(0, 10)).join(" and ")}.`,
    );
  }
  const stall = history.slice(0, 3).map((item) => workingSets(item.exercise));
  if (
    stall.length === 3 &&
    stall.every(
      (sets) =>
        sets.length === stall[0].length &&
        sets.every((set) => set.load === latest[0].load),
    ) &&
    stall[0].reduce((total, set) => total + Number(set.reps), 0) <=
      stall[1].reduce((total, set) => total + Number(set.reps), 0) &&
    stall[1].reduce((total, set) => total + Number(set.reps), 0) <=
      stall[2].reduce((total, set) => total + Number(set.reps), 0)
  )
    return result(
      "Review stall",
      "No rep progress across three comparable appearances. Check equipment, range, rest, sleep and RIR. Consider 5-10% less load and rebuild; do not add volume automatically.",
    );
  return result(
    "Add reps or repeat",
    `Keep the last comparable load. Add a clean rep only if you retain ${exercise.prescription.rir} RIR; work toward ${exercise.prescription.reps}. Two complete top-range appearances are needed for a load increase.`,
  );
}

export function sessionSummary(session: Session) {
  const sets = session.exercises.flatMap((exercise) => exercise.sets);
  return {
    done: sets.filter((set) => set.status === "done").length,
    working: doneSets(session).length,
    skipped: sets.filter((set) => set.status === "skipped").length,
    stopped: sets.filter((set) => set.status === "stopped").length,
    pending: sets.filter((set) => set.status === "pending").length,
  };
}

export function finishSession(session: Session, now = new Date()): Session {
  if (session.status === "completed") return session;
  for (const score of [
    session.painBefore,
    session.painAfter,
    session.painNextDay,
  ]) {
    if (
      score !== "" &&
      (number(score) === null || Number(score) < 0 || Number(score) > 10)
    )
      throw new Error(
        "Shoulder scores must be between 0 and 10, or left blank if unknown.",
      );
  }
  for (const exercise of session.exercises)
    for (const set of exercise.sets.filter((item) => item.status === "done")) {
      const error = setError(set, exercise);
      if (error) throw new Error(error);
    }
  return {
    ...session,
    status: "completed",
    finishedAt: now.toISOString(),
    restUntil: null,
  };
}

export function trendRows(sessions: Session[], key: string) {
  return sessions
    .filter((session) => session.status === "completed")
    .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
    .flatMap((session) =>
      session.exercises
        .filter(
          (exercise) =>
            comparisonKey(exercise) === key && workingSets(exercise).length,
        )
        .map((exercise) => {
          const sets = workingSets(exercise);
          const loads = sets
            .map((set) => number(set.load))
            .filter((value): value is number => value !== null);
          return {
            id: session.id,
            date: session.startedAt.slice(0, 10),
            load:
              exercise.basis === "Bodyweight"
                ? null
                : loads.length
                  ? Math.max(...loads)
                  : null,
            reps: sets.reduce(
              (total, set) => total + (number(set.reps) || 0),
              0,
            ),
            seconds: sets.reduce(
              (total, set) => total + (number(set.seconds) || 0),
              0,
            ),
            sets: sets.length,
          };
        }),
    );
}
