import "fake-indexeddb/auto";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Store,
  StaleDraft,
  type CloudRecord,
  type Remote,
} from "../src/store.ts";
import { createSession, type Program } from "../src/domain.ts";
const program = {
  version: "test",
  days: [{ id: "day-1", title: "Test", exercises: [] }],
} as unknown as Program;
const make = (owner = "a") =>
  createSession(program.days[0], program, owner, []);
test("durable drafts isolate owners and reject stale writes and duplicate active sessions", async () => {
  const name = crypto.randomUUID();
  const store = new Store(name);
  const session = make();
  const record = await store.save(session, null, true);
  assert.equal((await new Store(name).list("a")).length, 1);
  assert.equal((await store.list("b")).length, 0);
  await assert.rejects(
    store.save({ ...session, notes: "stale" }, 0, true),
    StaleDraft,
  );
  await assert.rejects(store.save(make(), null, true), /unfinished/);
  await store.save({ ...session, notes: "valid" }, record.generation, true);
});
test("failed sync retains actuals; retry reconciles; conflicts retain local and cloud versions", async () => {
  const store = new Store(crypto.randomUUID());
  const session = make();
  await store.save(session, null, true);
  let cloud: CloudRecord | undefined;
  const remote: Remote = {
    list: async () => (cloud ? [cloud] : []),
    save: async () => {
      throw new Error("Offline");
    },
  };
  await store.synchronize("a", remote, program);
  assert.equal((await store.list("a"))[0].state, "failed");
  remote.save = async (record) => {
    cloud = { revision: 1, payload: record.session };
    return { revision: 1 };
  };
  await store.synchronize("a", remote, program);
  let record = (await store.list("a"))[0];
  assert.equal(record.state, "synced");
  await store.save(
    { ...record.session, notes: "local" },
    record.generation,
    true,
  );
  remote.save = async () => ({
    revision: 2,
    conflict: { revision: 2, payload: { ...session, notes: "remote" } },
  });
  await store.synchronize("a", remote, program);
  record = (await store.list("a"))[0];
  assert.equal(record.session.notes, "local");
  assert.equal(record.remote?.payload.notes, "remote");
  await store.resolve("a", session.id, "cloud");
  assert.equal((await store.list("a"))[0].session.notes, "remote");
});
test("edits made during an in-flight request remain pending and retain the accepted revision", async () => {
  const store = new Store(crypto.randomUUID());
  const record = await store.save(make(), null, true);
  const remote: Remote = {
    list: async () => [],
    save: async () => {
      await store.save(
        { ...record.session, notes: "newer" },
        record.generation,
        true,
      );
      return { revision: 1 };
    },
  };
  await store.synchronize("a", remote, program);
  const current = (await store.list("a"))[0];
  assert.equal(current.state, "pending");
  assert.equal(current.revision, 1);
  assert.equal(current.session.notes, "newer");
});
