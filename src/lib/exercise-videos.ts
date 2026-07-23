// Curated form-demo videos for common bodybuilding lifts.
// Maps normalized exercise names / keywords to a YouTube video ID.
// Sourced from well-known coaching channels (Jeff Nippard, Athlean-X, Squat University, etc.)
const MAP: Array<{ keys: string[]; id: string }> = [
  { keys: ["back squat", "barbell squat", "squat"], id: "SW_C1A-rejs" },
  { keys: ["front squat"], id: "uYumuL_G_V0" },
  { keys: ["goblet squat"], id: "MxsFDhcyFyE" },
  { keys: ["bulgarian split squat", "split squat"], id: "2C-uNgKwPLE" },
  { keys: ["lunge"], id: "QOVaHwm-Q6U" },
  { keys: ["leg press"], id: "IZxyjW7MPJQ" },
  { keys: ["leg extension"], id: "YyvSfVjQeL0" },
  { keys: ["leg curl", "hamstring curl"], id: "1Tq3QdYUuHs" },
  { keys: ["romanian deadlift", "rdl"], id: "JCXUYuzwNrM" },
  { keys: ["deadlift"], id: "op9kVnSso6Q" },
  { keys: ["hip thrust"], id: "LM8XHLYJoYs" },
  { keys: ["calf raise"], id: "-M4-G8p8fmc" },
  { keys: ["bench press", "barbell bench"], id: "rT7DgCr-3pg" },
  { keys: ["incline bench", "incline press"], id: "SrqOu55lrYU" },
  { keys: ["dumbbell bench", "db bench"], id: "VmB1G1K7v94" },
  { keys: ["push up", "push-up", "pushup"], id: "IODxDxX7oi4" },
  { keys: ["chest fly", "pec fly", "fly"], id: "eozdVDA78K0" },
  { keys: ["dip"], id: "2z8JmcrW-As" },
  { keys: ["pull up", "pull-up", "pullup"], id: "eGo4IYlbE5g" },
  { keys: ["chin up", "chin-up"], id: "brhRXlOhsAM" },
  { keys: ["lat pulldown", "pulldown"], id: "CAwf7n6Luuc" },
  { keys: ["barbell row", "bent over row", "bent-over row"], id: "9efgcAjQe7E" },
  { keys: ["dumbbell row", "db row", "one arm row"], id: "roCP6wCXPqo" },
  { keys: ["seated row", "cable row"], id: "GZbfZ033f74" },
  { keys: ["face pull"], id: "rep-qVOkqgk" },
  { keys: ["overhead press", "ohp", "shoulder press", "military press"], id: "2yjwXTZQDDI" },
  { keys: ["lateral raise", "side raise"], id: "3VcKaXpzqRo" },
  { keys: ["rear delt", "reverse fly"], id: "ttvfGg9d76c" },
  { keys: ["bicep curl", "barbell curl", "dumbbell curl", "curl"], id: "ykJmrZ5v0Oo" },
  { keys: ["hammer curl"], id: "TwD-YGVP4Bk" },
  { keys: ["tricep pushdown", "cable pushdown", "pushdown"], id: "2-LAMcpzODU" },
  { keys: ["skull crusher", "lying tricep extension"], id: "d_KZxkY_0cM" },
  { keys: ["overhead tricep", "tricep extension"], id: "_gsUck-7M9I" },
  { keys: ["plank"], id: "ASdvN_XEl_c" },
  { keys: ["hanging leg raise", "leg raise"], id: "Pr1ieGZ5atk" },
  { keys: ["crunch"], id: "Xyd_fa5zoEU" },
  { keys: ["cable crunch"], id: "2fbujeH3F_U" },
  { keys: ["russian twist"], id: "wkD8rjkodUI" },
];

export function getFormVideoId(exerciseName: string): string | null {
  const n = exerciseName.toLowerCase();
  // Prefer the longest matching key so "romanian deadlift" beats "deadlift".
  let best: { id: string; len: number } | null = null;
  for (const entry of MAP) {
    for (const k of entry.keys) {
      if (n.includes(k) && (!best || k.length > best.len)) {
        best = { id: entry.id, len: k.length };
      }
    }
  }
  return best?.id ?? null;
}

export function getFormVideoEmbedUrl(exerciseName: string): string | null {
  const id = getFormVideoId(exerciseName);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : null;
}

export function getFormSearchUrl(exerciseName: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + " proper form")}`;
}
