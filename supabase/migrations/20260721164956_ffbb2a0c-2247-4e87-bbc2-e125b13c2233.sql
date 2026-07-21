ALTER TABLE public.daily_checkins
  ADD COLUMN IF NOT EXISTS fasted boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mood smallint;