import { doneSets, sessionSummary, type Session } from "./domain";

export const layouts = [
  {
    id: "guided",
    name: "Guided Session",
    description: "One exercise in focus, with the session queue below.",
  },
  {
    id: "journal",
    name: "Training Journal",
    description: "A dated notebook with a running exercise index.",
  },
  {
    id: "mission",
    name: "Mission Board",
    description: "Choose a station from a session checklist.",
  },
  {
    id: "cockpit",
    name: "Performance Cockpit",
    description: "Setup, comparison and set entry side by side.",
  },
  {
    id: "deck",
    name: "Exercise Deck",
    description: "A horizontal exercise carousel with direct navigation.",
  },
  {
    id: "timeline",
    name: "Session Timeline",
    description: "Warm-up, exercises and recovery along a vertical timeline.",
  },
  {
    id: "split",
    name: "Split Workspace",
    description: "Persistent exercise navigation beside the logger.",
  },
  {
    id: "route",
    name: "Gym Route",
    description: "A numbered station route with an accessible list.",
  },
  {
    id: "progress",
    name: "Progress First",
    description: "Your real training record, then the next useful action.",
  },
  {
    id: "compact",
    name: "Compact Logger",
    description: "Dense set rows, with coaching available on demand.",
  },
] as const;
export type LayoutId = (typeof layouts)[number]["id"];
export function validLayout(value: string | null): LayoutId {
  return layouts.find((layout) => layout.id === value)?.id || "guided";
}
export function milestones(sessions: Session[]) {
  const completed = sessions.filter(
    (session) => session.status === "completed",
  );
  const withWork = completed.filter((session) => doneSets(session).length > 0);
  const observed = completed.filter(
    (session) => session.painNextDay !== "" && session.nextDayAt,
  );
  return [
    {
      label: "First page written",
      earned: completed.length > 0,
      detail: "A session reviewed, full or partial.",
    },
    {
      label: "Finding your rhythm",
      earned: withWork.length >= 3,
      detail: "Three sessions with recorded working sets. No deadline.",
    },
    {
      label: "Listening counts",
      earned: observed.length > 0,
      detail: "A next-day shoulder check recorded, whatever the score.",
    },
  ];
}
export function recap(session: Session) {
  const summary = sessionSummary(session);
  return summary.stopped > 0
    ? "You listened and adjusted. That counts."
    : summary.pending > 0 || summary.skipped > 0
      ? "A useful page in your journal. No catch-up debt."
      : summary.done > 0
        ? "Session in the book. Leave some room to recover."
        : "A check-in, not a test. Your next session can wait.";
}
