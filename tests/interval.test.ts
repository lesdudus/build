import { test } from "node:test";
import assert from "node:assert/strict";
import {
  intervalError,
  intervalTotal,
  intervalPhase,
  startIntervals,
  pauseIntervals,
  resumeIntervals,
  parseIntervalRun,
  formatIntervalTime,
} from "../src/interval.ts";

test("interval timing uses elapsed time, catches up across phases, and has no final rest", () => {
  const run = startIntervals({ exercise: 20, rest: 10, sets: 3 }, 1000);
  assert.equal(intervalTotal(run.settings), 85);
  assert.equal(intervalPhase(run, 1000).phase, "prepare");
  assert.equal(intervalPhase(run, 6000).phase, "exercise");
  assert.equal(intervalPhase(run, 26000).phase, "rest");
  assert.equal(intervalPhase(run, 36000).set, 2);
  assert.deepEqual(
    [
      intervalPhase(run, 77000).phase,
      intervalPhase(run, 77000).set,
      intervalPhase(run, 77000).remaining,
    ],
    ["exercise", 3, 9],
  );
  assert.equal(intervalPhase(run, 86000).phase, "finished");
  assert.equal(intervalPhase(run, 9000000).progress, 1);
});
test("pause and resume preserve fractional elapsed time without adding paused time", () => {
  const run = startIntervals({ exercise: 30, rest: 5, sets: 2 }, 1000);
  const paused = pauseIntervals(run, 8500);
  assert.equal(paused.elapsed, 7500);
  assert.equal(intervalPhase(paused, 500000).remaining, 28);
  const resumed = resumeIntervals(paused, 500000);
  assert.equal(intervalPhase(resumed, 501500).remaining, 26);
  assert.equal(resumeIntervals(resumed, 600000), resumed);
});
test("zero rest transitions straight to exercise and a single set ends immediately", () => {
  const run = startIntervals({ exercise: 2, rest: 0, sets: 2 }, 0);
  assert.deepEqual(
    [intervalPhase(run, 7000).phase, intervalPhase(run, 7000).set],
    ["exercise", 2],
  );
  assert.equal(intervalPhase(run, 9000).phase, "finished");
  const single = startIntervals({ exercise: 2, rest: 3600, sets: 1 }, 0);
  assert.equal(intervalTotal(single.settings), 7);
  assert.equal(intervalPhase(single, 7000).phase, "finished");
});
test("invalid settings and corrupt recovery are rejected; recovery is always paused", () => {
  for (const settings of [
    { exercise: 0, rest: 1, sets: 1 },
    { exercise: 10, rest: -1, sets: 1 },
    { exercise: 10, rest: 1, sets: 1.5 },
    { exercise: NaN, rest: 1, sets: 1 },
  ])
    assert.ok(intervalError(settings));
  assert.throws(() => startIntervals({ exercise: 0, rest: 0, sets: 1 }, 0));
  assert.equal(parseIntervalRun("bad"), null);
  assert.equal(parseIntervalRun('{"version":1}'), null);
  const paused = pauseIntervals(
    startIntervals({ exercise: 10, rest: 0, sets: 1 }, 0),
    6000,
  );
  const recovered = parseIntervalRun(
    JSON.stringify({ ...paused, startedAt: 4000 }),
  )!;
  assert.equal(recovered.startedAt, null);
  assert.equal(intervalPhase(recovered, 99999999).remaining, 9);
  assert.equal(formatIntervalTime(3661), "1:01:01");
});
