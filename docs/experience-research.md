# Layout and Exercise Reference Notes

Research checked on 2026-09-20. This is a presentation update to Foundation 01, not a new training prescription. The workbook, program source, cloud schema and deployment are unchanged.

## Ten Layouts

The top-right **Layout theme** selector offers exactly ten compositions. A single editor, session object and save queue serve all ten. The choice is stored as the device-wide, non-sensitive `build-layout` preference. Colors are provisional: light surfaces, a blue action accent and existing semantic safety colors. The original small brand mark is retained.

| Layout | Desktop composition | Phone composition | Useful When |
| --- | --- | --- | --- |
| 01 Guided Session | Centered current exercise; session queue after the logger | Compact horizontal queue before the focused exercise | Staying with one exercise |
| 02 Training Journal | Dated page; right-hand exercise index; ruled set entries | Dated header and two-column index (single column at 320px) | Reviewing a session like a notebook |
| 03 Mission Board | Three-column station checklist; two-column set entries below | Two-column stations; single-column sets | Choosing the next available station |
| 04 Performance Cockpit | Status readouts and horizontal tabs; setup/comparison beside entry | Small readouts, scrollable tabs and stacked entry | Comparing setup and actuals |
| 05 Exercise Deck | Snap-scrolling exercise cards above a centered editor | Touch-scrollable cards with direct button selection | Browsing one exercise at a time |
| 06 Session Timeline | Warm-up/exercise/recovery timeline beside the editor | Two-column timeline above the editor | Seeing the session sequence |
| 07 Split Workspace | Persistent left exercise index; wide logger | Three-column station index; full-width logger | Quick jumps between stations |
| 08 Gym Route | Numbered zigzag route; focused logger below | Numbered two-column station list | Following stations in order |
| 09 Progress First | Real reviewed-session totals and recent sessions in a left column | Actual history summary first, then station selection | Seeing completed work without streak pressure |
| 10 Compact Logger | Exercise dropdown and dense horizontal set rows | Dropdown and compact stacked set rows | Repeated logging with less navigation |

The same Train, History, Progress, Coach notes and Account destinations remain available. Layout changes do not recreate the selected exercise editor. Setup/substitution disclosures, failed-save fields, selected exercise and rest deadline survive switching. The deck scrolls by touch; selecting its exercise button changes the active exercise. It does not auto-select merely because a card is scrolled into view.

## Fitness Product Inspiration

These public pages were inspected for product principles, not copied pixel-for-pixel. Paid/in-app interfaces were not audited; this is not a ranking of the companies.

| Public Source | Observed Principle | Applied Here |
| --- | --- | --- |
| [Hevy](https://www.hevyapp.com/) | Routine planning, direct set logging, notes and rest timers | Guided Session, Mission Board and Split Workspace share the same straightforward logging controls |
| [Strong](https://www.strong.app/) | Workout notebook, custom exercises, timers, RPE, exports and progress | Training Journal, Compact Logger and the cockpit's setup/comparison relationship |
| [Freeletics](https://www.freeletics.com/en/) | Guided next action and adjustment around available time/equipment | Guided Session, station-based Mission Board and Exercise Deck; no automatic program changes imported |
| [Strava Features](https://www.strava.com/features) | Personal activity history, progress comparisons and route context | Session Timeline, Gym Route and Progress First; no competitive leaderboard or guilt streak |

Fitbod returned 403, Nike Training Club returned 429, and Peloton exposed only a region/cookie gate. They were not used as inspected design evidence. StrengthLog's [inverted row](https://www.strengthlog.com/inverted-row/) and [belt squat](https://www.strengthlog.com/belt-squats/) pages helped check movement descriptions, but their GIFs were not passed off as videos.

## Video Verification

Each linked YouTube page exposed the expected title, publisher and `playabilityStatus: OK` when checked. Public source instructions/descriptions and YouTube storyboard preview frames were inspected to check the movement, equipment and arm position. **Full playback and audio were not verified:** the browser player repeatedly buffered. A playable-status flag is not a guarantee of playback on the user's device, region or network. No clinician clearance is inferred from the publisher, preview or link.

The app contains external links, not embeds, downloads or copied video assets. No video/thumbnail requests are made before the user opens a link. Offline mode shows an unavailable message while local logging continues. Source/verification details are available beside each reference. New or renamed substitutions receive an honest no-verified-video state rather than the original movement's media.

The canonical titles, publishers, source URLs, timestamps and warnings are in `src/videos.ts`. The following links cover all twelve unique exercises, including the held reference:

| Exercise | Publisher / Video | Match and Boundaries |
| --- | --- | --- |
| Leg press | [Muscle & Strength](https://www.youtube.com/watch?v=sEM_zo9w2ss) | 45-degree sled; machine-specific safety stops and loads are not transferable |
| Australian row / Aussies | [Zack Henderson, 1:13](https://www.youtube.com/watch?v=Fl0UMfdEzsE&t=73s) | Upright beginner section, approximately 1:13-1:30 only; later harder angles and pull-ups excluded |
| Seated leg curl | [Muscle & Strength](https://www.youtube.com/watch?v=3BWiLFc8Dbg) | Seated machine, thigh restraint and lower-leg pad |
| Neutral-grip machine chest press | [Vital Health And Performance](https://www.youtube.com/watch?v=edHBBJrCOAs) | Seated neutral-grip machine; **reference only: not currently prescribed** |
| Seated calf raise | [Muscle & Strength](https://www.youtube.com/watch?v=Yh5TXz99xwY) | Thigh-pad machine, not shoulder-loaded |
| Supine heel taps | [Cara Giusti, PT, DPT / B3 Physical Therapy, 0:14](https://www.youtube.com/watch?v=Xxv-9mA3qLc&t=14s) | Setup around 0:14, movement around 0:37; bent knees and alternating heel lowering, arms at sides; ignore the description's different rep count |
| Belt squat | [Klaus Sports Chiropractic](https://www.youtube.com/watch?v=oOrNOAhgWM4) | Rogue Rhino hip-belt setup; staff must demonstrate the user's actual machine |
| Floor glute bridge | [Muscle & Strength](https://www.youtube.com/watch?v=mm4wbmtDrUc) | Floor version, not bench hip thrust; no arm drive |
| Supported neutral-grip curl | [W10 Personal Training Gym](https://www.youtube.com/watch?v=c75dCCSrWN4) | Upright back support and neutral grip; not an incline curl |
| Reverse crunch | [Functional Bodybuilding](https://www.youtube.com/watch?v=aIyadD7d7OA) | Floor version, no overhead grip; demonstrated lift is larger than prescribed, so keep a small controlled pelvic roll |
| Rope triceps pressdown | [Muscle & Strength](https://www.youtube.com/watch?v=LzwgB15UdO8) | High-cable downward press, not overhead extension; do not adopt the source tip to move the upper arm behind the body |
| Easy bike or walk | [La Maison Health & Fitness](https://www.youtube.com/watch?v=jILES_LTxDk) | Bike-fitting reference only; no class intensity/intervals imported; easy walk or rest still valid |

Rejected alternatives included neutral-grip dumbbell pressing (wrong equipment), reverse-crunch-to-dead-bug combinations (different movement), and an ambiguous seated hammer-curl source that allowed a flat bench (back support unconfirmed). The first inverted-row candidate mostly showed harder horizontal variations; it was replaced with the timestamped upright example.

## Encouragement and Safety

- A progress bar reports actual done, skipped, stopped and pending sets. It never counts a held slot as required work.
- Milestones are derived, never written into workout results: first reviewed session (partial counts), three reviewed sessions containing actual working sets, and a recorded next-day shoulder observation regardless of its score.
- No deadlines, missed-day debt, extra-set rewards or rewards for ignoring symptoms. Stopped and partial sessions receive recovery-aware recap text.
- A brief completion icon animation honors `prefers-reduced-motion`; there is no confetti, autoplay, sound or persistent animation.
- Prescription snapshots, RIR/introductory caps, target/actual separation, progression rules, held status, auth and sync behavior are unchanged.

## Verification Scope

Automated tests exercise every layout at 320, 390, 768 and 1440 CSS pixels; compare navigation/editor bounds; check horizontal overflow; switch through all ten online/offline; preserve exact IndexedDB records, selected exercise, partial input and timer; retain failed-save drafts and editor disclosures; reload the persisted choice offline; use keyboard selection; visit every exercise/video; and keep held pressing unloggable. Reduced-motion completion behavior and the absence of pre-click video-network requests are checked.

Phone and desktop screenshots for each layout are generated under `verification/layout-*.png` and were visually reviewed. Existing production logging workflows and the separate mocked auth/sync suite remain required checks. Browser automation uses desktop Edge at responsive sizes, not physical iOS/Android devices. Real video playback, screen-reader testing and live Supabase/email/device sync remain unverified. No backend or deployment expansion is included.