# Build / Training Journal

Mobile-first, account-scoped workout journal. Personal programs load from an owner-protected Supabase assignment after sign-in. Public source and build output contain only a generic Foundation template and brand assets, not the original personal HTML or workbook. No historical targets or spreadsheet rows are imported as actual results.

## Current Status

- Local application: implemented and tested. Production preview: http://127.0.0.1:5206/.
- Dedicated Supabase backend: **Build**, `zlikecnjssxpqldnnyjq`, Ireland. Separate project in the same organization as Kitchen. Both migrations are applied.
- Email/password authentication; public signup disabled. Invitations and password-recovery links return to the deployed app. Passwords are entered only in the app, never in source or chat. Use at least 12 characters.
- Private assigned programs and workout records are protected by RLS. Offline program caches and journals are scoped to the owner. Browser caches are not encrypted.
- Database and mocked-auth tests cover owner isolation, immutable prescriptions, conflicts, retries and offline saves. Real email receipt, password setup, token refresh and physical two-device operation still need the owner's acceptance check.
- Dudu's Kitchen: unchanged. Its project reference is explicitly refused by this app.
- Public site: https://lesdudus.github.io/build/ . Repository: https://github.com/lesdudus/build . Only the static app is public; account data is not included in the repository or deployment.

## Run

Node 22+ recommended. From this directory:

```powershell
npm ci
npm run build
npm run preview
```

Open http://127.0.0.1:5206/ and choose **Open local journal**. If port 5206 is in use, use `npm run preview -- --port 5208`. Use `npm run dev` for development. Offline reload requires the production build/preview, not Vite's development server.

The production output is an inlined `dist/index.html` plus `dist/sw.js`. Serve it over HTTP on localhost or HTTPS elsewhere; do not open it as a `file:` URL. Keep the origin and path stable: IndexedDB data and the service worker belong to that browser origin. A port change opens a different local journal.

## Workflow

- Resume an unfinished session or start the suggested core day. Explicitly finished full or partial core sessions advance 1 -> 2 -> 3. Day 4 never advances that rotation.
- New actual fields are blank. Introductory/return sessions start with at most two working sets per eligible exercise. Held pressing gets no active sets. Warm-ups and cardio are excluded from working-set totals.
- Equipment, settings, load basis and measurement type define comparability. Previous setup can be reused explicitly; actual results are never copied. Changes to equipment or entered actuals reopen affected done sets for confirmation.
- Record load in kg using the chosen basis, actual reps or seconds, RIR and shoulder response. Painful attempts are stopped, not successful sets. Notes, skipped sets, warm-ups, substitutions and target overrides remain distinct from the prescription snapshot.
- A completed set starts its prescribed rest timer. Its saved end timestamp survives reload/backgrounding. Mobile browsers do not guarantee an alarm while locked; the correct remaining time is recomputed on return.
- Finish opens an explicit review. Pending sets stay pending in partial sessions. After-symptoms and next-day symptoms are separate; the latter opens on a later calendar day. History supports corrections and date/exercise filters.
- Progress shows only completed sessions and done working sets. Comparison charts show highest completed load and total reps/seconds, not estimated strength or cross-machine tonnage. Missing symptoms are not converted to zero.

## Interval Timer

The **Timer** navigation item opens a standalone, silent interval timer in every layout. Set exercise seconds (1-3600), rest seconds (0-3600), and 1-99 sets. There are no minute inputs: enter 90 for a minute and a half. Each fresh page starts at **45 seconds exercise, 20 seconds rest, 3 sets**. The planned duration includes a five-second preparation countdown and excludes rest after the final set. Countdown and total displays retain their readable clock format.

Start opens a large countdown with a circular phase-progress ring, set count, next phase and total remaining time. Exercise and rest alternate automatically. Pause/resume preserves fractional time; restarting or ending an unfinished timer requires confirmation. Leaving fullscreen alone does not stop or reset it. Finishing records nothing in workout history and does not change the journal's separate rest timer, prescriptions or rotation.

Native fullscreen is requested on the timer surface; browsers that deny it retain a viewport-filling modal. Screen Wake Lock is requested while running where supported, released on pause/finish/exit, and reacquired on a visible-page return when possible. The display reports whether it obtained the lock. Neither fullscreen nor a permanently awake screen is guaranteed on every phone, in low-power mode, or in an insecure context. There is no sound, speech or vibration.

Timing derives from elapsed timestamps rather than counting callbacks. If the browser suspends updates while backgrounded, returning catches up to the correct phase; this is not a promise of background execution. Changing the device's wall clock can affect elapsed time. **All timer settings and activity exist only in memory:** nothing is saved to localStorage, sessionStorage, IndexedDB or Supabase. Reloading, closing the page or leaving the journal discards the timer; there is no interrupted-timer recovery. Switching views/layouts within the same journal keeps the in-memory state. Startup deletes only the two legacy timer storage keys, leaving account and workout data untouched. Other browser profiles/devices clear their legacy timer keys when they load the updated app.

The timer works offline after the production app shell is cached; the shell contains no entered timer data. Responsive screenshots and automated Edge checks cover 320/390-pixel phones, landscape, desktop, native fullscreen/fallback, denied/mocked wake locks, phase transitions, pause, restart/end confirmations, zero rest, one/multiple sets, background-time catch-up, legacy-key cleanup, no storage writes, no authenticated database writes, and default reset after offline reload. Physical iOS/Android fullscreen, wake-lock and lock-screen behavior remain unverified. Browser and OS controls always take precedence. After updating the app, close all its tabs and reopen it if the existing service worker still shows the previous version.

## Layouts and Videos

Choose one of **ten Layout themes** from the top-right selector: Guided Session, Training Journal, Mission Board, Performance Cockpit, Exercise Deck, Session Timeline, Split Workspace, Gym Route, Progress First and Compact Logger. They change composition/navigation while sharing the same editor and journal. Selection persists on this browser; switching retains draft fields, selected exercise, disclosures and the active rest timer. Colors remain provisional.

All twelve prescribed exercise names have an attributed external video reference beside their cues, with variation warnings and timestamps where relevant. Held pressing is explicitly **reference only: not currently prescribed**. Substitutions do not inherit an unrelated video. Videos require internet; there are no embeds, autoplay or background thumbnail downloads. Publisher pages and preview frames were checked, but full video playback/audio could not be verified in the research browser.

Progress and milestones use real journal data only. Partial sessions count as reviewed; no streak penalties or extra-volume incentives are introduced. Completion animation respects reduced motion.

See [the layout comparison and research record](docs/experience-research.md) for composition differences, fitness-product sources, all video links and verification limits. Responsive/state tests are part of `npm run test:e2e`.

## Progression and Safety

Rules are in `src/domain.ts` and have focused tests. For eligible lower-body work, an increase requires two comparable completed appearances with every planned working set at the top of its prescribed rep range, sufficient RIR, matching load, and recorded later/next-day symptom-free responses. The entered smallest increment must not exceed 5%. Otherwise repeat, add clean reps, re-establish after a break, or review recovery/a three-appearance stall.

Held movements, listed prohibited substitutions, current restrictions and symptoms override increases. Stopped-only symptomatic attempts are included in safety review. Bodyweight leverage and assistance are not treated as ordinary lifted load. Existing clinician restriction notes carry forward until explicitly changed; the built-in held program cannot be unlocked in the UI. This is not a diagnosis or automatic clinician clearance. Free-text substitution detection is not a clinical safety system; the original restriction guidance still applies.

## Data and Failure Behavior

- IndexedDB database `build-workout-v1` stores each journal under an owner-specific key. Local-only journals are separate from authenticated journals and are not automatically uploaded. No restore/import is implemented; backup JSON is an export for safekeeping, not a spreadsheet import route.
- Every field change queues a local transaction. The UI distinguishes saving, locally saved, queued, syncing, synced, failed and conflicting states. A failed disk write retains the unsaved view, blocks further edits and offers export/reload. Wait for saved status before closing a tab; abrupt termination during an uncommitted write can lose that last edit.
- Cloud writes include a stable operation UUID and expected revision. Retries are idempotent. Concurrent edits never silently overwrite: both versions are retained until explicitly resolved. The conflict export contains both full payloads; the server retains accepted revisions.
- Local stale-tab writes are rejected by generation. Web Locks serialize cloud sync across tabs. An offline completion/new-session race may briefly show an active-session constraint error until the completed previous session syncs; retry after reconciliation.
- Service worker caches only the public app shell, not authentication or workout API responses. Drafts are in IndexedDB. Refresh/reconnect retries happen on visibility/online events and periodically; background sync while the app is closed is not promised.
- Signing out hides that owner's journal but retains owner-isolated drafts locally. Offline reopening is available only for the previously remembered account that has not signed out. Local caches are **not encrypted** against a person with access to the device/browser profile. Use a private device. Clearing site data removes unsynced/local-only records; export first.
- The schema retains immutable prescription snapshots and an append-only accepted-revision journal. Before publishing a new program version, sync existing drafts and retain the old program definition; this initial release does not include a program editor or historical program-version migration tool.

## Dedicated Supabase Setup

The dedicated Build project is configured. For another deployment, an authorized administrator must complete these steps. Do not reuse Kitchen's database, API keys, anonymous policies or tables. Never put database passwords, access tokens or service-role keys in chat, browser source or build variables.

1. Create a **new dedicated project**. Review its organization, plan/cost and region before creation.
2. Apply the SQL files in `supabase/migrations/` in filename order to the new project only. The live Build migrations were applied through its authenticated management endpoint, not CLI migration tracking; do not blindly replay them with `db push`.
3. Enable email authentication, disable public signup, and set exact site/redirect URLs. Invite the intended user and provision that user's private `workout_assignments` definition and immutable `workout_programs` version administratively. No assignment can be edited through the public client. Password setup/recovery uses the app URL with `?setup=password`. Supabase's default mail provider is restricted/rate-limited; configure verified SMTP before expanding to more users.
4. Create `.env.local` from `.env.example`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to the **new project's** URL and publishable/anon key. These browser credentials are public and rely on RLS. Never set a secret/service-role key here. Rebuild after changing environment variables.
5. Complete the live acceptance checks below before treating this as cloud-backed personal data storage.

### Schema and Access

`workout_assignments`, `workout_programs`, `workout_sessions`, `workout_exercises`, `workout_sets`, `workout_revisions` are private per-user tables. All have RLS and owner-filtered authenticated SELECT policies. Anonymous table access and direct authenticated mutation grants are revoked. The workout write gateway is `save_workout`, a narrowly granted SECURITY DEFINER function with an empty search path, explicit caller/payload ownership validation, immutable snapshot validation, optimistic revision checks, per-owner transaction locking and one-active-session enforcement. It updates normalized projections and appends an audit revision in one transaction. Assignments are administrator-managed only. A queued workout with a different program version is retained locally rather than uploaded with the wrong definition.

### Tests

```powershell
npm test
npm run build
# Keep npm run preview running for this suite:
npm run test:e2e
# Independent mock API suite; starts/stops its own test server on 5207:
npm run test:e2e -- --config playwright.auth.config.ts
```

Browser tests use installed Microsoft Edge. Production tests cover mobile logging, blank actuals, service-worker offline reload, persisted rest timing, held exercises, partial completion, corrected charts, Day 4 rotation, stale tabs, local save failure, next-day checks, filters and 320/390/768/1440 layouts including dark mode. Screenshots are generated under `verification/`. The mock suite cannot verify real email delivery, hosted authorization or token refresh.

### Owner Acceptance

1. Open the real invitation, set a password, sign out and sign back in. Verify password recovery, refresh after expiry and sign-out in another tab.
2. With two real users and public browser credentials, prove cross-user reads are empty; direct table writes, owner spoofing and anonymous reads/writes fail.
3. On two devices, submit a stale revision and confirm explicit conflict handling. Retry a lost-response operation and confirm no duplicate sets/session/revision.
4. Load the HTTPS app on an actual phone, log offline, lock/unlock it, reload offline, reconnect and verify the same results in the second device. Observe storage persistence/eviction behavior.
5. Verify local cache isolation when switching accounts and exporting data; confirm server audit revisions remain after corrections.

## Deployment

GitHub Actions deploys only `dist/` to Pages after unit/database tests, the production build and public-content checks. Repository variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` contain public browser configuration only. Browser suites are run locally with Edge. The single-file build uses relative asset paths and a path-scoped service worker for `/build/`.

All open tabs must close before an updated worker takes over; locally saved data persists independently of the shell cache. No private Supabase responses are service-worker cached. The local-only journal uses the public template and is never automatically uploaded or transferred into an account. Existing local drafts retain their prescription snapshots. `scripts/prepare-public.mjs` is an optional local asset preparation helper, not part of CI; review its generated template and run privacy checks before committing any regeneration.