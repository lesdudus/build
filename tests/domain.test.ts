import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSession,
  nextDay,
  setError,
  suggest,
  comparisonKey,
  finishSession,
  sessionSummary,
  trendRows,
  type Program,
} from "../src/domain.ts";
const program = {
  version: "test",
  days: [
    {
      id: "day-1",
      title: "Test",
      exercises: [
        {
          name: "Leg press",
          sets: 3,
          reps: "8-12",
          rir: "3",
          status: "Ready",
          rest: 120,
          start: "Start light",
        },
      ],
    },
  ],
} as Program;
function session() {
  const value = createSession(program.days[0], program, "user-a", []);
  value.introductory = false;
  value.painBefore = value.painAfter = value.painNextDay = "0";
  value.exercises[0].equipment = "Press A";
  value.exercises[0].settings = "seat 3";
  value.exercises[0].increment = "2.5";
  value.exercises[0].sets = Array.from({ length: 3 }, () => ({
    ...value.exercises[0].sets[0],
    id: crypto.randomUUID(),
    status: "done" as const,
    load: "60",
    reps: "12",
    rir: "3",
    pain: "0",
  }));
  return value;
}
test("introductory actuals stay blank, held exercises have no active sets", () => {
  const draft = createSession(program.days[0], program, "user-a", []);
  assert.equal(draft.exercises[0].sets.length, 2);
  assert.equal(sessionSummary(draft).done, 0);
  assert.ok(setError(draft.exercises[0].sets[0], draft.exercises[0]));
  const restricted = structuredClone(program.days[0]);
  restricted.exercises[0].status = "Hold for assessment";
  assert.equal(
    createSession(restricted, program, "user-a", []).exercises[0].sets.length,
    0,
  );
  draft.status = "completed";
  draft.exercises[0].restriction = "Clinician hold";
  assert.equal(
    createSession(program.days[0], program, "user-a", [draft]).exercises[0]
      .restriction,
    "Clinician hold",
  );
});
test("rotation ignores Day 4 and uses completed sessions only", () => {
  const first = finishSession(session());
  const extra = {
    ...first,
    id: crypto.randomUUID(),
    day: "day-4",
    finishedAt: "2099-01-01",
  };
  assert.equal(nextDay([first, extra]), "day-2");
  assert.equal(nextDay([session()]), "day-1");
});
test("load increases only after two comparable complete top-range appearances", () => {
  const first = finishSession(session());
  const second = finishSession(session());
  const current = session();
  assert.equal(
    suggest(current.exercises[0], [first, second], current).action,
    "Increase load",
  );
  assert.notEqual(
    suggest(current.exercises[0], [first], current).action,
    "Increase load",
  );
  second.exercises[0].settings = "seat 4";
  assert.notEqual(
    comparisonKey(first.exercises[0]),
    comparisonKey(second.exercises[0]),
  );
  assert.notEqual(
    suggest(current.exercises[0], [first, second], current).action,
    "Increase load",
  );
});
test("pain, held status, missing recovery and big jumps prevent increases", () => {
  const first = finishSession(session());
  const second = finishSession(session());
  const current = session();
  first.painNextDay = "";
  assert.equal(
    suggest(current.exercises[0], [first, second], current).action,
    "Repeat",
  );
  first.painNextDay = "2";
  assert.equal(
    suggest(current.exercises[0], [first, second], current).action,
    "Defer",
  );
  current.exercises[0].prescription.status = "Hold for assessment";
  assert.equal(suggest(current.exercises[0], [], current).action, "Held");
  assert.throws(() => finishSession(current));
});
test("partial completion is explicit and trends exclude unfinished and skipped work", () => {
  const current = session();
  current.exercises[0].sets[1].status = "pending";
  current.exercises[0].sets[2].status = "skipped";
  const completed = finishSession(current);
  assert.equal(sessionSummary(completed).pending, 1);
  assert.equal(
    trendRows([completed, session()], comparisonKey(current.exercises[0])!)[0]
      .sets,
    1,
  );
  assert.equal(finishSession(completed).finishedAt, completed.finishedAt);
});
test("stopped-only recent work, substitutions and clinician holds override progression", () => {
  const first = finishSession(session());
  const second = finishSession(session());
  const stopped = session();
  stopped.exercises[0].sets.forEach((set) => {
    set.status = "stopped";
    set.pain = "2";
  });
  const latest = finishSession(stopped);
  const current = session();
  [first, second, latest, current].forEach((entry, index) => {
    entry.startedAt = `2026-01-0${index + 1}T12:00:00Z`;
  });
  assert.equal(
    suggest(current.exercises[0], [first, second, latest], current).action,
    "Defer",
  );
  current.exercises[0].actualName = "Pull-ups";
  assert.match(
    setError(current.exercises[0].sets[0], current.exercises[0])!,
    /excluded/,
  );
  assert.equal(suggest(current.exercises[0], [], current).action, "Held");
  current.exercises[0].actualName = "Leg press";
  current.exercises[0].restriction = "No leg press until reviewed";
  assert.equal(
    suggest(current.exercises[0], [first, second], current).action,
    "Defer",
  );
});
test("large increments, stalled reps, load bases and long strength breaks are treated conservatively", () => {
  const history = [0, 1, 2].map(() => finishSession(session()));
  const current = session();
  current.exercises[0].increment = "10";
  assert.equal(
    suggest(current.exercises[0], history, current).action,
    "Repeat",
  );
  history.forEach((previous) =>
    previous.exercises[0].sets.forEach((set) => {
      set.reps = "10";
    }),
  );
  assert.equal(
    suggest(current.exercises[0], history, current).action,
    "Review stall",
  );
  current.exercises[0].basis = "Per hand";
  assert.equal(
    suggest(current.exercises[0], history, current).action,
    "Starting point",
  );
  const old = ["day-1", "day-2", "day-3"].map((day) => ({
    ...session(),
    day,
    status: "completed" as const,
    finishedAt: "2026-01-01T12:00:00Z",
  }));
  const cardio = {
    ...session(),
    day: "day-4",
    status: "completed" as const,
    finishedAt: "2026-02-01T12:00:00Z",
  };
  assert.equal(
    createSession(
      program.days[0],
      program,
      "user-a",
      [...old, cardio],
      new Date("2026-02-02T12:00:00Z"),
    ).introductory,
    true,
  );
});
