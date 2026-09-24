import { test } from "node:test";
import assert from "node:assert/strict";
import { layouts, validLayout, milestones, recap } from "../src/experience.ts";
import { createSession, type Program } from "../src/domain.ts";
import { readFileSync } from "node:fs";
import { videos, videoFor, videoUrl } from "../src/videos.ts";
test("ten distinct layout IDs are presentation-only and unknown preferences are safe", () => {
  assert.equal(layouts.length, 10);
  assert.equal(new Set(layouts.map((layout) => layout.id)).size, 10);
  for (const layout of layouts) assert.equal(validLayout(layout.id), layout.id);
  assert.equal(validLayout("missing"), "guided");
});
test("milestones only reflect actual sessions and do not penalize partial or stopped work", () => {
  assert.ok(milestones([]).every((item) => !item.earned));
  const program = {
    version: "test",
    days: [{ id: "day-1", title: "test", exercises: [] }],
  } as unknown as Program;
  const session = createSession(program.days[0], program, "test", []);
  assert.ok(milestones([session]).every((item) => !item.earned));
  session.status = "completed";
  assert.equal(milestones([session])[0].earned, true);
  assert.equal(milestones([session])[1].earned, false);
  assert.match(recap(session), /can wait/);
  session.painNextDay = "3";
  session.nextDayAt = new Date().toISOString();
  assert.equal(milestones([session])[2].earned, true);
});
test("every prescribed exercise has an attributed video and substitutions never inherit it", () => {
  const program = JSON.parse(
    readFileSync(new URL('../src/public-data/foundation.json', import.meta.url), 'utf8'),
  ) as Program;
  const names = new Set(
    program.days.flatMap((day) =>
      day.exercises.map((exercise) => exercise.name),
    ),
  );
  assert.equal(names.size, 12);
  assert.deepEqual(new Set(Object.keys(videos)), names);
  for (const prescription of program.days.flatMap((day) => day.exercises)) {
    const video = videoFor({ actualName: prescription.name, prescription })!;
    assert.ok(video.title && video.publisher && video.note);
    assert.match(video.videoId, /^[\w-]{11}$/);
    assert.equal(new URL(videoUrl(video)).hostname, "www.youtube.com");
    assert.equal(
      videoFor({ actualName: "My different exercise", prescription }),
      undefined,
    );
  }
  assert.match(videoUrl(videos["Australian row / Aussies"]), /t=73s/);
  assert.match(videos["Neutral-grip machine chest press"].note, /remains held/);
});
