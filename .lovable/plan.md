# Plan: Weekly Workout Plan Page

## What we’re building

A dedicated **Plan** page that shows the user’s full weekly training program, and add a bottom-nav tab so users can tap straight into it. From each day on the plan, users can jump into the active workout with that day’s exercises.

## User decisions
- **Where to show**: New dedicated page
- **Navigation**: Bottom-nav tab
- **Interactions**: Tap to start workout

## Scope

1. **New route** `src/routes/_authenticated/plan.tsx` (`/plan`)
   - Load the user’s active `training_programs` with its `program_days` and `program_exercises`.
   - Display the program name, split, goal, days-per-week, and progression notes.
   - Show each training day as a card: day name, muscle groups, rest/training badge, exercise count, and expandable exercise list.
   - For each exercise show: sets, rep range, target RIR, rest seconds, and any notes.
   - Each training day gets a **“Start this workout”** button that links to `/workout?dayIndex=<day_index>`.
   - Rest days are shown but cannot be started.

2. **Update `src/routes/_authenticated/workout.tsx`**
   - Add an optional `dayIndex` search parameter using `validateSearch`.
   - When `dayIndex` is provided, start that day’s session instead of defaulting to today.
   - When omitted, keep the existing today-based behavior.
   - The existing session-lookup/creation logic (by `program_day_id` + today’s date) still applies, so users can resume an already-started day.

3. **Update `src/components/AppShell.tsx`**
   - Add a **Plan** tab to the bottom navigation with a `ClipboardList` icon.
   - Make the bottom nav horizontally scrollable so it can comfortably hold 7 items (`Home`, `Plan`, `Workout`, `Food`, `Calendar`, `Coach`, `Profile`).
   - Keep the existing active-state styling.

4. **Dashboard shortcut** (optional, small)
   - Add a “View full plan →” link on the dashboard’s “Today’s plan” card so users can discover the new page.

5. **Verify**
   - Type-check and build the project.
   - Smoke-test the new route and the workout search-param flow.

## Technical details

- **Route file**: `src/routes/_authenticated/plan.tsx`
  - Use `createFileRoute("/_authenticated/plan")`.
  - Fetch with `supabase.auth.getUser()` then `supabase.from("training_programs").select("id, name, split, goal, days_per_week, notes, program_days(id, day_index, name, is_rest, muscle_groups, program_exercises(id, exercise_name, order_index, sets, rep_range, target_rir, rest_seconds, notes))").eq("user_id", uid).eq("active", true).maybeSingle()`.
  - Sort days and exercises by `day_index` / `order_index`.
  - Use existing design tokens: `bg-card`, `border-border`, `text-primary`, `rounded-2xl`, etc.
  - Use `ChevronDown`/`ChevronUp` to toggle exercise lists, or keep them always expanded for quick scanability.

- **Workout search param**
  - `import { z } from "zod";` and define `validateSearch: (search) => z.object({ dayIndex: z.coerce.number().optional() }).parse(search)`.
  - In `bootstrap`, replace `const day = days[todayIdx]` with:
    ```ts
    const dayIndex = search.dayIndex ?? todayIdx;
    const day = days.find((d) => d.day_index === dayIndex) ?? days[todayIdx];
    ```
  - Keep the rest of the session logic unchanged.

- **Navigation update**
  - Add `{ to: "/plan", label: "Plan", icon: ClipboardList }` to `AppShell.tsx` items.
  - Wrap bottom nav items in a scrollable container: `overflow-x-auto` with `scrollbar-hide` (or `no-scrollbar`), `justify-start` on mobile, `justify-around` on larger screens.
  - Ensure the active tab is clearly visible and tappable.

- **No database migrations** are required; this feature uses existing `training_programs`, `program_days`, and `program_exercises` tables.

## Design notes
- Keep the dark, minimal STRV aesthetic.
- Cards for each day, clear muscle-group chips, large “Start workout” buttons.
- Rest days shown as muted cards so the weekly rhythm is obvious.
- No animations beyond the existing pulse/transition patterns.

## After implementation
- Run the build and type-check.
- Verify the `/plan` route renders the active program.
- Tap a day’s “Start workout” and confirm `/workout?dayIndex=X` loads the correct day’s exercises.