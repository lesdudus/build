import {
  ArrowRight,
  Award,
  Check,
  ChevronRight,
  Circle,
  ExternalLink,
  Flag,
  LayoutTemplate,
  LockKeyhole,
  MapPin,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useRef, type ReactNode } from "react";
import {
  doneSets,
  held,
  sessionSummary,
  type ExerciseRecord,
  type Session,
} from "./domain";
import { layouts, milestones, recap, type LayoutId } from "./experience";
import {
  videoFor,
  videoUrl,
  videoCheckedAt,
  videoVerification,
} from "./videos";

export function VideoReference({
  exercise,
  online,
}: {
  exercise: ExerciseRecord;
  online: boolean;
}) {
  const video = videoFor(exercise);
  return (
    <section className="video-reference" aria-label="Exercise video">
      {held(exercise) || exercise.restriction.trim() ? (
        <p className="video-hold">
          <LockKeyhole size={16} />
          Reference only: not currently prescribed.
        </p>
      ) : null}
      {video ? (
        <>
          <div className="video-heading">
            <PlayCircle size={23} />
            <div>
              <b>{video.title}</b>
              <small>{video.publisher}</small>
            </div>
            {online ? (
              <a
                className="watch-video"
                href={videoUrl(video)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Watch video
                <ExternalLink size={15} />
                <span className="sr-only"> (opens a new tab)</span>
              </a>
            ) : (
              <span className="video-offline">Video unavailable offline</span>
            )}
          </div>
          {video.segment && <p className="video-segment">{video.segment}</p>}
          <p>{video.note}</p>
          <details>
            <summary>Source & verification</summary>
            <p>
              {videoVerification} Checked {videoCheckedAt}.
            </p>
            {online && (
              <a
                href={video.source || videoUrl(video)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Publisher source (new tab)
              </a>
            )}
          </details>
        </>
      ) : (
        <p>
          No verified video for this exercise or substitution. Ask a qualified
          trainer to demonstrate the exact movement.
        </p>
      )}
      <small>
        Internet required for videos. Your prescribed cues and shoulder
        restrictions take priority; a video is not clinician clearance.
      </small>
    </section>
  );
}

export function LayoutPicker({
  value,
  onChange,
}: {
  value: LayoutId;
  onChange: (id: LayoutId) => void;
}) {
  return (
    <label
      className="layout-picker"
      title={layouts.find((item) => item.id === value)?.description}
    >
      <LayoutTemplate size={19} />
      <span className="sr-only">Layout theme</span>
      <select
        aria-label="Layout theme"
        value={value}
        onChange={(event) => onChange(event.target.value as LayoutId)}
      >
        {layouts.map((layout, index) => (
          <option key={layout.id} value={layout.id}>
            {String(index + 1).padStart(2, "0")} / {layout.name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Milestones({ sessions }: { sessions: Session[] }) {
  const earned = milestones(sessions).filter((item) => item.earned);
  return (
    <section className="milestone-strip" aria-label="Personal milestones">
      {earned.length ? (
        earned.map((item) => (
          <div key={item.label} title={item.detail}>
            <Award size={21} />
            <span>{item.label}</span>
          </div>
        ))
      ) : (
        <p>
          <Sparkles size={19} />A fresh page. No score to chase.
        </p>
      )}
    </section>
  );
}
export function SessionPulse({ session }: { session: Session }) {
  const count = sessionSummary(session);
  const total = count.done + count.pending + count.skipped + count.stopped;
  return (
    <section
      className={`session-pulse ${session.status === "completed" ? "celebrate" : ""}`}
      aria-label="Session progress"
    >
      <div>
        {session.status === "completed" ? (
          <Award size={27} />
        ) : (
          <Flag size={25} />
        )}
        <span>
          <b>
            {session.status === "completed"
              ? "Session in the book"
              : count.done
                ? "Finding your rhythm"
                : "Your pace. Your session."}
          </b>
          <small>
            {session.status === "completed"
              ? recap(session)
              : "Clean reps. Room to recover."}
          </small>
        </span>
      </div>
      <div className="pulse-track">
        <span>
          {count.done} / {total} sets completed
        </span>
        <progress
          aria-label="Completed sets"
          value={count.done}
          max={total || 1}
        />
        <small>
          {count.skipped} skipped · {count.stopped} stopped · {count.pending}{" "}
          unfinished
        </small>
      </div>
    </section>
  );
}

export function TrainingStage({
  layout,
  session,
  sessions,
  index,
  onSelect,
  children,
}: {
  layout: LayoutId;
  session: Session;
  sessions: Session[];
  index: number;
  onSelect: (index: number) => void;
  children: ReactNode;
}) {
  const editor = useRef<HTMLDivElement>(null);
  const exercise = session.exercises[index];
  const count = sessionSummary(session);
  const completed = sessions.filter((item) => item.status === "completed");
  const select = (next: number) => {
    onSelect(next);
    if (["mission", "route"].includes(layout))
      editor.current?.scrollIntoView({ behavior: "instant", block: "start" });
  };
  const state = (position: number) => {
    const item = session.exercises[position];
    if (held(item)) return "Held";
    const done = item.sets.filter((set) => set.status === "done").length;
    return `${done}/${item.sets.length} done`;
  };
  const button = (position: number, detail = true) => {
    const item = session.exercises[position];
    const Icon = held(item)
      ? LockKeyhole
      : item.sets.length && item.sets.every((set) => set.status === "done")
        ? Check
        : Circle;
    return (
      <button
        type="button"
        aria-current={index === position ? "step" : undefined}
        onClick={() => select(position)}
      >
        <span className="station-number">
          {String(position + 1).padStart(2, "0")}
        </span>
        <span>
          <b>{item.actualName}</b>
          {detail && (
            <small>
              {item.prescription.group} · {state(position)}
            </small>
          )}
        </span>
        <Icon size={17} />
      </button>
    );
  };
  return (
    <div className={`training-stage stage-${layout}`}>
      {layout === "journal" && (
        <header className="journal-date">
          <span>
            {new Date(session.startedAt).toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
          <b>DAY {session.day.slice(-1)}</b>
        </header>
      )}
      {layout === "cockpit" && (
        <div className="cockpit-readout">
          <span>
            <b>{count.working}</b>working sets
          </span>
          <span>
            <b>
              {session.introductory && exercise.prescription.sets
                ? "3-4"
                : exercise.prescription.rir}
            </b>
            {exercise.prescription.sets ? "prescribed RIR" : "effort"}
          </span>
          <span>
            <b>
              {exercise.prescription.rest
                ? `${exercise.prescription.rest}s`
                : "Easy"}
            </b>
            rest
          </span>
          <span>
            <ShieldCheck size={22} />
            Shoulder rules active
          </span>
        </div>
      )}
      {layout === "progress" && (
        <aside className="progress-led">
          <p className="eyebrow">Your work so far</p>
          <strong>{completed.length}</strong>
          <span>reviewed sessions</span>
          <div className="progress-led-set">
            <b>
              {completed.reduce((sum, item) => sum + doneSets(item).length, 0)}
            </b>{" "}
            completed working sets
          </div>
          <h3>Recent pages</h3>
          {completed.length ? (
            [...completed]
              .sort((left, right) =>
                right.startedAt.localeCompare(left.startedAt),
              )
              .slice(0, 3)
              .map((item) => (
                <p key={item.id}>
                  {new Date(item.startedAt).toLocaleDateString()}
                  <small>
                    Day {item.day.slice(-1)} · {doneSets(item).length} working
                    sets
                  </small>
                </p>
              ))
          ) : (
            <p>Your first session is taking shape.</p>
          )}
          <p className="small">No streaks. No missed-day penalties.</p>
        </aside>
      )}
      <nav className="stage-navigation" aria-label="Exercise stations">
        <label className="field mobile-exercise-select">
          Exercise
          <select
            aria-label="Exercise"
            value={index}
            onChange={(event) => select(Number(event.target.value))}
          >
            {session.exercises.map((item, position) => (
              <option key={item.id} value={position}>
                {position + 1}. {item.actualName}
                {held(item) ? " · HELD" : ""}
              </option>
            ))}
          </select>
        </label>
        {layout === "guided" && (
          <>
            <h3>In this session</h3>
            <ol className="guided-queue">
              {session.exercises.map((item, position) => (
                <li key={item.id}>{button(position)}</li>
              ))}
            </ol>
          </>
        )}
        {layout === "journal" && (
          <ol className="journal-index">
            {session.exercises.map((item, position) => (
              <li key={item.id}>{button(position)}</li>
            ))}
          </ol>
        )}
        {layout === "mission" && (
          <div className="mission-grid">
            {session.exercises.map((item, position) => (
              <article key={item.id}>
                {button(position)}
                <p>
                  {held(item)
                    ? "Reserved for assessment"
                    : `${item.sets.filter((set) => set.type === "working").length} working sets · ${item.prescription.reps}`}
                </p>
              </article>
            ))}
          </div>
        )}
        {layout === "cockpit" && (
          <div className="cockpit-tabs">
            {session.exercises.map((item, position) => (
              <div key={item.id}>{button(position, false)}</div>
            ))}
          </div>
        )}
        {layout === "deck" && (
          <div className="exercise-carousel" aria-label="Exercise deck">
            {session.exercises.map((item, position) => (
              <article key={item.id}>
                {button(position)}
                <p>{held(item) ? "HELD" : item.prescription.reps}</p>
                <span>{item.prescription.group}</span>
              </article>
            ))}
          </div>
        )}
        {layout === "timeline" && (
          <ol className="session-timeline">
            <li className="timeline-bookend">
              <Flag size={18} />
              <span>
                Warm-up
                <small>
                  {session.day === "day-4"
                    ? "Start very easy"
                    : "Easy cardio + practice sets"}
                </small>
              </span>
            </li>
            {session.exercises.map((item, position) => (
              <li key={item.id}>
                {button(position)}
                {!held(item) && (
                  <small className="timeline-rest">
                    {item.prescription.rest
                      ? `${item.prescription.rest}s rest between sets`
                      : "Conversational pace"}
                  </small>
                )}
              </li>
            ))}
            <li className="timeline-bookend">
              <ShieldCheck size={18} />
              <span>Review & recovery</span>
            </li>
          </ol>
        )}
        {layout === "split" && (
          <div className="split-index">
            {session.exercises.map((item, position) => (
              <div key={item.id}>{button(position)}</div>
            ))}
          </div>
        )}
        {layout === "route" && (
          <>
            <h3>
              <MapPin size={18} />
              Today's stations
            </h3>
            <ol className="station-route">
              {session.exercises.map((item, position) => (
                <li key={item.id}>
                  {button(position)}
                  {position < session.exercises.length - 1 && (
                    <ArrowRight
                      className="route-arrow"
                      size={19}
                      aria-hidden="true"
                    />
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
        {layout === "progress" && (
          <div className="progress-stations">
            {session.exercises.map((item, position) => (
              <div key={item.id}>{button(position, false)}</div>
            ))}
          </div>
        )}
        {layout === "compact" && (
          <div className="compact-context">
            <span>
              {index + 1}/{session.exercises.length}
            </span>
            <b>{state(index)}</b>
            <ChevronRight size={18} />
          </div>
        )}
      </nav>
      <div className="stage-editor" ref={editor}>
        {children}
      </div>
    </div>
  );
}
