import type { ExerciseRecord } from "./domain";

export type ExerciseVideo = {
  title: string;
  publisher: string;
  videoId: string;
  source?: string;
  start?: number;
  segment?: string;
  note: string;
};

export const videoCheckedAt = "2026-09-20";
export const videoVerification =
  "Publisher pages and preview frames checked. Full playback and audio could not be verified.";
export const videos: Record<string, ExerciseVideo> = {
  "Leg press": {
    title: "Leg Press",
    publisher: "Muscle & Strength",
    videoId: "sEM_zo9w2ss",
    source:
      "https://www.muscleandstrength.com/exercises/45-degree-leg-press.html",
    note: "Shows a 45-degree sled. Your machine may differ: ask staff about its safety stops. Keep your prescribed comfortable range; do not copy the demonstrated load.",
  },
  "Australian row / Aussies": {
    title: "Inverted Rows (Beginner to Advanced Progressions)",
    publisher: "Zack Henderson",
    videoId: "Fl0UMfdEzsE",
    start: 73,
    segment: "1:13-1:30: upright beginner row only",
    note: "Use only the easy high-bar section. Later harder angles, elevated feet and pull-ups are NOT your prescription. Keep your established pain-free angle, with no added load.",
  },
  "Seated leg curl": {
    title: "Seated Leg Curl",
    publisher: "Muscle & Strength",
    videoId: "3BWiLFc8Dbg",
    source: "https://www.muscleandstrength.com/exercises/seated-leg-curl",
    note: "Seated machine with a thigh restraint and lower-leg pad. Match your own knee pivot and settings, not the demonstrated weight.",
  },
  "Neutral-grip machine chest press": {
    title: "Machine Neutral Grip Chest Press",
    publisher: "Vital Health And Performance",
    videoId: "edHBBJrCOAs",
    note: "Shows seated machine pressing with palms facing inward. This slot remains held; viewing it does not authorize pressing or change the assessment requirement.",
  },
  "Seated calf raise": {
    title: "Seated Calf Raise (Toes Neutral)",
    publisher: "Muscle & Strength",
    videoId: "Yh5TXz99xwY",
    source:
      "https://www.muscleandstrength.com/exercises/seated-calf-raise.html",
    note: "Seated thigh-pad machine, not shoulder pads. Use a comfortable ankle range and no bouncing; ask for help with the safety bar if needed.",
  },
  "Supine heel taps": {
    title: "Supine Heel Taps | B3 Physical Therapy",
    publisher: "Cara Giusti, PT, DPT",
    videoId: "Xxv-9mA3qLc",
    start: 14,
    segment: "Setup from 0:14; heel-tap movement around 0:37",
    note: "Bent-knee tabletop heel lowering, not sideways heel touches. Keep arms relaxed at your sides and use your own prescribed reps, not the video description's 20 repetitions.",
  },
  "Belt squat": {
    title: "Rogue Rhino Belt Squat Setup & Tutorial - How to Use",
    publisher: "Klaus Sports Chiropractic",
    videoId: "oOrNOAhgWM4",
    note: "Hip-belt loading on a Rogue Rhino. Other machines have different hooks and release mechanisms: have gym staff demonstrate yours before using it. No shoulder-loaded substitute.",
  },
  "Floor glute bridge": {
    title: "Bodyweight Glute Bridge",
    publisher: "Muscle & Strength",
    videoId: "mm4wbmtDrUc",
    source:
      "https://www.muscleandstrength.com/exercises/bodyweight-glute-bridge",
    note: "Floor-based, not a bench hip thrust. Keep arms relaxed without pushing through them; skip if floor contact bothers the shoulder.",
  },
  "Supported neutral-grip curl": {
    title: "Back supported hammer curl",
    publisher: "W10 Personal Training Gym",
    videoId: "c75dCCSrWN4",
    note: "Seated upright with back support and neutral grip. Keep elbows beside the body; do not copy the weight or use an incline position with arms behind you.",
  },
  "Reverse crunch": {
    title: "Reverse Crunches",
    publisher: "Functional Bodybuilding",
    videoId: "aIyadD7d7OA",
    note: "Floor version with hands on the floor, no overhead bench grip. The demonstration lifts higher than your plan: use a small, slow pelvic roll, arms relaxed, with no swing or arm push.",
  },
  "Rope triceps pressdown": {
    title: "Rope Tricep Extension",
    publisher: "Muscle & Strength",
    videoId: "LzwgB15UdO8",
    source:
      "https://www.muscleandstrength.com/exercises/rope-tricep-extension.html",
    note: "High cable, downward rope press, not an overhead extension. Keep elbows beside you and shoulders relaxed; do not follow the source tip to pull upper arms behind the body.",
  },
  "Easy bike or walk": {
    title: "How to Set Up Your Indoor Cycle Bike for Class!",
    publisher: "La Maison Health & Fitness",
    videoId: "jILES_LTxDk",
    note: "Bike setup reference only, not a class or intensity prescription. Ask staff to check your bike fit; keep the planned conversational pace. A relaxed walk or rest remains an option.",
  },
};

export function videoFor(
  exercise: Pick<ExerciseRecord, "actualName" | "prescription">,
) {
  return exercise.actualName === exercise.prescription.name
    ? videos[exercise.actualName]
    : undefined;
}
export function videoUrl(video: ExerciseVideo) {
  const url = new URL("https://www.youtube.com/watch");
  url.searchParams.set("v", video.videoId);
  if (video.start) url.searchParams.set("t", `${video.start}s`);
  return url.href;
}
