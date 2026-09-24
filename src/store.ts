import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Program, Session } from "./domain";

export type CloudRecord = { revision: number; payload: Session };
export type LocalRecord = {
  key: string;
  owner: string;
  session: Session;
  generation: number;
  revision: number;
  operation: string;
  state: "local" | "pending" | "synced" | "failed" | "conflict";
  error?: string;
  remote?: CloudRecord;
};
interface WorkoutDatabase extends DBSchema {
  sessions: { key: string; value: LocalRecord; indexes: { owner: string } };
}
export interface Remote {
  list(): Promise<CloudRecord[]>;
  save(
    record: LocalRecord,
    program: Program,
  ): Promise<{ conflict?: CloudRecord; revision: number }>;
}
export class StaleDraft extends Error {
  constructor() {
    super(
      "This workout changed in another tab. Reload its latest saved version before editing.",
    );
  }
}
export class Store {
  database: Promise<IDBPDatabase<WorkoutDatabase>>;
  constructor(name = "build-workout-v1") {
    this.database = openDB<WorkoutDatabase>(name, 1, {
      upgrade(database) {
        database
          .createObjectStore("sessions", { keyPath: "key" })
          .createIndex("owner", "owner");
      },
    });
  }
  async list(owner: string) {
    return (
      await (await this.database).getAllFromIndex("sessions", "owner", owner)
    ).sort((left, right) =>
      right.session.startedAt.localeCompare(left.session.startedAt),
    );
  }
  async save(
    session: Session,
    expectedGeneration: number | null,
    cloud: boolean,
  ) {
    const database = await this.database;
    const transaction = database.transaction("sessions", "readwrite");
    void transaction.done.catch(() => {});
    const key = `${session.owner}/${session.id}`;
    const old = await transaction.store.get(key);
    if (
      (old && old.generation !== expectedGeneration) ||
      (!old && expectedGeneration !== null)
    ) {
      transaction.abort();
      await transaction.done.catch(() => {});
      throw new StaleDraft();
    }
    if (!old && session.status === "active") {
      const other = (
        await transaction.store.index("owner").getAll(session.owner)
      ).find((record) => record.session.status === "active");
      if (other) {
        transaction.abort();
        await transaction.done.catch(() => {});
        throw new Error(
          "An unfinished workout already exists. Resume it first.",
        );
      }
    }
    if (old?.state === "conflict") {
      transaction.abort();
      await transaction.done.catch(() => {});
      throw new Error(
        "Resolve the cloud conflict before editing this workout.",
      );
    }
    const record: LocalRecord = {
      key,
      owner: session.owner,
      session: structuredClone(session),
      generation: (old?.generation || 0) + 1,
      revision: old?.revision || 0,
      operation: crypto.randomUUID(),
      state: cloud ? "pending" : "local",
    };
    await transaction.store.put(record);
    await transaction.done;
    return record;
  }
  async synchronize(owner: string, remote: Remote, program: Program) {
    const database = await this.database;
    for (const captured of await this.list(owner)) {
      if (!["pending", "failed"].includes(captured.state)) continue;
      try {
        const response = await remote.save(captured, program);
        const transaction = database.transaction("sessions", "readwrite");
        const latest = await transaction.store.get(captured.key);
        if (latest) {
          if (response.conflict) {
            latest.state = "conflict";
            latest.remote = response.conflict;
            latest.error =
              "Another device saved a different revision. Both versions are retained.";
          } else {
            latest.revision = response.revision;
            latest.state =
              latest.operation === captured.operation ? "synced" : "pending";
            latest.error = undefined;
          }
          await transaction.store.put(latest);
        }
        await transaction.done;
      } catch (error) {
        const transaction = database.transaction("sessions", "readwrite");
        const latest = await transaction.store.get(captured.key);
        if (latest && latest.operation === captured.operation) {
          latest.state = "failed";
          latest.error = error instanceof Error ? error.message : String(error);
          await transaction.store.put(latest);
        }
        await transaction.done;
      }
    }
    const rows = await remote.list();
    const transaction = database.transaction("sessions", "readwrite");
    for (const row of rows) {
      if (row.payload.owner !== owner) {
        transaction.abort();
        await transaction.done.catch(() => {});
        throw new Error("Unexpected cloud owner; synchronization refused.");
      }
      const key = `${owner}/${row.payload.id}`;
      const local = await transaction.store.get(key);
      if (!local || (local.state === "synced" && row.revision > local.revision))
        await transaction.store.put({
          key,
          owner,
          session: row.payload,
          revision: row.revision,
          generation: (local?.generation || 0) + 1,
          operation: crypto.randomUUID(),
          state: "synced",
        });
    }
    await transaction.done;
  }
  async resolve(owner: string, id: string, choice: "cloud" | "local") {
    const database = await this.database;
    const transaction = database.transaction("sessions", "readwrite");
    const record = await transaction.store.get(`${owner}/${id}`);
    if (!record?.remote) {
      transaction.abort();
      await transaction.done.catch(() => {});
      throw new Error("No conflict to resolve.");
    }
    record.session =
      choice === "cloud" ? record.remote.payload : record.session;
    record.revision = record.remote.revision;
    record.state = choice === "cloud" ? "synced" : "pending";
    record.generation++;
    record.operation = crypto.randomUUID();
    delete record.remote;
    delete record.error;
    await transaction.store.put(record);
    await transaction.done;
  }
}
