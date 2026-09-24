import { createClient } from "@supabase/supabase-js";
import type { Remote, CloudRecord } from "./store";
import type { Program } from "./domain";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (url?.includes("qjjttdpadxpxdvlxffcd"))
  throw new Error("Dudu’s Kitchen is not an approved workout database.");
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storageKey: "build-workout-auth",
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;
export async function loadProgram(owner: string): Promise<Program> {
  const cacheKey = `build-program-${owner}`;
  if (!navigator.onLine) {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) throw new Error('Connect once to download your assigned program.');
    return JSON.parse(cached) as Program;
  }
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('workout_assignments').select('definition').eq('owner', owner).maybeSingle();
  if (error) throw error;
  if (!data?.definition?.version || !Array.isArray(data.definition.days)) throw new Error('No program is assigned to this account yet.');
  try { localStorage.setItem(cacheKey, JSON.stringify(data.definition)); } catch { }
  return data.definition as Program;
}
export const remote: Remote = {
  async list() {
    if (!supabase) throw new Error("Supabase is not configured.");
    const rows: CloudRecord[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("revision,payload")
        .order("id")
        .range(offset, offset + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) return rows;
    }
  },
  async save(record, program) {
    if (!supabase) throw new Error("Supabase is not configured.");
    if (record.session.programVersion !== program.version) throw new Error('This workout uses a different program version. Its original definition is required before syncing.');
    const { data, error } = await supabase.rpc("save_workout", {
      p_id: record.session.id,
      p_expected: record.revision,
      p_operation: record.operation,
      p_payload: record.session,
      p_program: program,
    });
    if (error)
      throw new Error(
        error.code === "23505"
          ? "A different unfinished workout exists on another device. Finish or reconcile it before syncing this one."
          : error.message,
      );
    return data;
  },
};
