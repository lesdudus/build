import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { createSession, type Program } from "../src/domain.ts";
test("Postgres migration: authenticated isolation, immutable snapshots, idempotency, stale conflicts and grants", async () => {
  const database = new PGlite();
  const owner = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  await database.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values('${owner}'),('${other}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
  );
  await database.exec(
    readFileSync(
      new URL(
        "../supabase/migrations/202609200001_workout.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const program = {
    version: "test",
    days: [
      {
        id: "day-1",
        title: "Test",
        exercises: [
          {
            name: "Leg press",
            sets: 2,
            reps: "8-12",
            rir: "3",
            status: "Ready",
          },
        ],
      },
    ],
  } as Program;
  await database.exec(readFileSync(new URL('../supabase/migrations/202609240001_assignments.sql', import.meta.url), 'utf8'));
  await database.query('insert into workout_assignments(owner,definition) values($1,$2)', [owner, JSON.stringify(program)]);
  const session = createSession(program.days[0], program, owner, []);
  const operation = crypto.randomUUID();
  const save = (expected = 0, op = operation, payload = session) =>
    database.query<{ result: { revision: number; conflict?: unknown } }>(
      "select public.save_workout($1,$2,$3,$4,$5) as result",
      [
        payload.id,
        expected,
        op,
        JSON.stringify(payload),
        JSON.stringify(program),
      ],
    );
  await database.exec(
    `set role authenticated; set request.jwt.claim.sub='${owner}';`,
  );
  assert.equal((await database.query('select * from workout_assignments')).rows.length, 1);
  await assert.rejects(database.exec('delete from workout_assignments'), /permission denied/);
  assert.equal((await save()).rows[0].result.revision, 1);
  assert.equal((await save()).rows[0].result.revision, 1);
  assert.equal(
    (await database.query("select * from workout_revisions")).rows.length,
    1,
  );
  assert.ok((await save(0, crypto.randomUUID())).rows[0].result.conflict);
  const corrected = structuredClone(session);
  corrected.notes = "correction";
  assert.equal(
    (await save(1, crypto.randomUUID(), corrected)).rows[0].result.revision,
    2,
  );
  const changed = structuredClone(corrected);
  changed.exercises[0].prescription.sets = 9;
  await assert.rejects(save(2, crypto.randomUUID(), changed), /immutable/);
  const malformed = structuredClone(corrected);
  delete (malformed as Partial<typeof malformed>).status;
  await assert.rejects(
    save(2, crypto.randomUUID(), malformed),
    /Invalid workout/,
  );
  await assert.rejects(
    save(
      0,
      crypto.randomUUID(),
      createSession(program.days[0], program, owner, []),
    ),
    /one_active_workout/,
  );
  const unsafe = structuredClone(corrected);
  Object.assign(unsafe.exercises[0].sets[0], {
    status: "done",
    load: "60",
    reps: "10",
    rir: "3",
    pain: "2",
  });
  await assert.rejects(save(2, crypto.randomUUID(), unsafe), /Pain prevents/);
  unsafe.exercises[0].sets[0].pain = "0";
  unsafe.exercises[0].actualName = "Pull-ups";
  await assert.rejects(save(2, crypto.randomUUID(), unsafe), /excluded/);
  unsafe.exercises[0].actualName = "Leg press";
  unsafe.exercises[0].sets[0].reps = "1.5";
  await assert.rejects(
    save(2, crypto.randomUUID(), unsafe),
    /Whole repetitions/,
  );
  const complete = {
    ...corrected,
    status: "completed" as const,
    finishedAt: new Date().toISOString(),
  };
  assert.equal(
    (await save(2, crypto.randomUUID(), complete)).rows[0].result.revision,
    3,
  );
  await assert.rejects(save(3, crypto.randomUUID(), corrected), /immutable/);
  await assert.rejects(
    database.exec("update workout_sessions set revision=99"),
    /permission denied/,
  );
  await database.exec(`set request.jwt.claim.sub='${other}';`);
  for (const table of [
    "workout_assignments",
    "workout_programs",
    "workout_sessions",
    "workout_exercises",
    "workout_sets",
    "workout_revisions",
  ])
    assert.equal(
      (await database.query(`select * from ${table}`)).rows.length,
      0,
    );
  await assert.rejects(save(), /Owner mismatch/);
  const spoof = { ...session, owner: other };
  await assert.rejects(save(2, crypto.randomUUID(), spoof), /Owner mismatch/);
  await database.exec("set role anon;");
  await assert.rejects(database.exec('select * from workout_assignments'), /permission denied/);
  await assert.rejects(
    database.exec("select * from workout_sessions"),
    /permission denied/,
  );
  await assert.rejects(save(), /permission denied/);
  await database.close();
});
